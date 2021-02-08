import path from 'path';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import DollieBaseGenerator from '../generators/base';
import traverse from './traverse';
import download from './download';
import { diff, checkFileAction, parseDiff, stringifyBlocks, merge } from './diff';
import { parseExtendScaffoldName, parseFilePathname } from './scaffold';
import readJson from './read-json';
import { TRAVERSE_IGNORE_REGEXP, DEPENDS_ON_KEY } from '../constants';
import { DollieScaffold, DollieScaffoldConfiguration, DollieScaffoldProps } from '../interfaces';

/**
 * get extended props from parent scaffold
 * @param scaffold DollieScaffold
 * @returns object
 */
export const getExtendedPropsFromParentScaffold = (scaffold: DollieScaffold): Record<string, any> => {
  if (!scaffold.parent) {
    return {};
  }
  const extendedPropKeys = scaffold?.configuration?.extendProps || [];
  const parentScaffold = scaffold.parent;
  if (extendedPropKeys.length > 0) {
    return extendedPropKeys.reduce((result, currentKey) => {
      const currentValue = parentScaffold.props[currentKey];
      if (currentValue) {
        result[currentKey] = currentValue;
      }
      return result;
    }, {});
  }
  return {};
};

/**
 * write file to destination recursively
 * @param scaffold DollieScaffold
 * @param context DollieBaseGenerator
 *
 * gives a scaffold configuration with tree data structure
 * and traverse all of the nodes in this tree recursively and process them
 * with `Generator#fs#copyTpl` and `Generator#fs#copy`
 * it will ignore `.dollie.js`, and inject props into the files
 * which contain `__template.` as their filename at the beginning
 */
export const writeTempFiles = async (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  /**
   * `context.appBasePath` usually is $HOME/.dollie/cache
   * `scaffold.uuid` is the UUID for current scaffold, e.g. 3f74b271-04ac-4e7b-a5c1-b24894c529d2
   *
   * @example
   * the `scaffoldSourceDir` would probably be $HOME/.dollie/cache/3f74b271-04ac-4e7b-a5c1-b24894c529d2
   */
  const scaffoldSourceDir = path.resolve(context.appBasePath, scaffold.uuid);
  const destinationDir = path.resolve(context.appTempPath, scaffold.uuid);

  /**
   * invoke `traverse` function in `src/utils/traverse.ts`, set the ignore pattern
   * to avoid copying `.dollie.js` to temporary dir
   */
  const files = await traverse(path.resolve(scaffoldSourceDir), TRAVERSE_IGNORE_REGEXP);

  for (const file of files) {
    const { pathname, entity } = file;
    /**
     * `pathname` is an absolute pathname of file against `scaffoldSourceDir` as above
     * we should get the relate pathname to concat with destination pathname
     *
     * @example
     * if a `pathname` equals to `/home/lenconda/.dollie/cache/3f74b271-04ac-4e7b-a5c1-b24894c529d2/src/index.js`
     * the `relativePath` would become as `src/index.js`
     */
    const absolutePathname = parseFilePathname(pathname);
    const relativePathname = path.relative(scaffoldSourceDir, absolutePathname);
    const destinationPathname = path.resolve(destinationDir, relativePathname);

    if (entity.startsWith('__template.')) {
      context.fs.copyTpl(
        pathname,
        destinationPathname,
        scaffold.props || {}
      );
    } else {
      // otherwise, we should also copy the file, but just simple this.fs.copy
      context.fs.copy(pathname, destinationPathname);
    }
  }

  /**
   * if there are dependencies in current scaffold, then we should traverse the array
   * and call `writeTempFiles` to process array items
   */
  for (const dependence of scaffold.dependencies) {
    await writeTempFiles(dependence, context);
  }
};

/**
 * copy and write files from temporary source
 * @param scaffold DollieScaffold
 * @param context DollieBaseGenerator
 *
 * once `writeTempFiles` is finished, which means Dollie has written all files
 * into the temporary dirs, then `writeCacheTable` will be invoked to read
 * the files from each file in each temporary dir and use an appropriate action to write
 * the file content into destination dir
 */
export const writeCacheTable = async (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  /**
   * it is mentioned as above
   * the dir storing all of the scaffold content on the physical file system
   */
  const scaffoldSourceDir = path.resolve(context.appBasePath, scaffold.uuid);
  /**
   * the temporary dir on mem-fs for containing generated files with props
   *
   * @default
   * $HOME/.dollie/temp/$UUID
   */
  const scaffoldTempDir = path.resolve(context.appTempPath, scaffold.uuid);

  /**
   * invoke `traverse` function in `src/utils/traverse.ts`
   * set the ignore pattern to avoid reading `.dollie.js` from temporary dir
   * we still traverse from `scaffoldSourceDir` because it is the only way to
   * get the folder structure from each nested scaffold
   */

  const files = await traverse(scaffoldSourceDir, TRAVERSE_IGNORE_REGEXP);
  for (const file of files) {
    const { pathname } = file;
    /**
     * get the relative path with the start dir of current scaffold's temporary dir
     * still need get rid of `__template.` at the beginning of each file's filename
     */

    const absolutePathname = parseFilePathname(pathname);
    const relativePathname = path.relative(scaffoldSourceDir, absolutePathname);
    /**
     * get the action from relations as below:
     * 1. parent scaffold's file content with the same name
     * 2. file content in destination dir on mem-fs which has the same name as current one
     * 3. current file that will be written into destination dir
     */
    const action = checkFileAction(scaffold, relativePathname, context.cacheTable);
    /**
     * read current file from temporary dir on mem-fs
     */
    const currentTempFileContent = context.fs.read(
      path.resolve(scaffoldTempDir, relativePathname)
    );
    switch (action) {
      /**
       * if action for current file is `DIRECT`, which means we can directly write
       * `currentTempFileContent` into destination file without worrying about previous content
       * besides, we should add current content to `mergeTable` for comparing when this file
       * will be merged
       */
      case 'DIRECT': {
        if (!context.cacheTable[relativePathname]) {
          context.cacheTable[relativePathname] = [];
        }
        context.cacheTable[relativePathname] = [diff(currentTempFileContent, currentTempFileContent)];
        break;
      }
      /**
       * if action for current file is `MERGE`, which means we should take previous content
       * into concern, so Dollie will do these things:
       * 1. read the content text from `context.mergeTable` by the same filename as `content1`
       * 2. read current file content from destination dir as `content2`
       * 3. read current file content from current scaffold's temp dir as `content3`
       * 4. diff `content1` and `content2` as `diff1`
       * 5. diff `content1` and `content3` as `diff2`
       * 6. merge with `diff1` and `diff2` as `result`
       * 7. write `result` into destination file
       * 8. if merge result becomes a conflict, then add current file and its blocks into `context.conflicts`
       */
      case 'MERGE': {
        const cacheTableItem = context.cacheTable[relativePathname];

        if (!cacheTableItem) {
          break;
        }

        const originalDiff = cacheTableItem[0];
        const originalFileContent = stringifyBlocks(parseDiff(originalDiff));
        cacheTableItem.push(diff(originalFileContent, currentTempFileContent));

        break;
      }
      /**
       * if action for current file is `NIL`, which means we should not take any action with
       * current file content and destination file, even if creating and overwriting, just do nothing
       */
      case 'NIL':
        break;
      default:
        break;
    }
  }

  /**
   * if there are dependencies in current scaffold, then we should traverse the array
   * and call `writeCacheTable` to process array items
   */
  for (const dependence of scaffold.dependencies) {
    await writeCacheTable(dependence, context);
  }
};

export const writeToDestinationPath = (context: DollieBaseGenerator) => {
  for (const pathname of Object.keys(context.cacheTable)) {
    if (!context.cacheTable[pathname]) { continue; }
    const currentCachedFile = context.cacheTable[pathname];
    const destinationFilePathname = context.destinationPath(pathname);
    let content = '';
    if (currentCachedFile.length === 1) {
      content = stringifyBlocks(parseDiff(currentCachedFile[0]));
    } else {
      const originalDiff = currentCachedFile[0];
      const diffs = currentCachedFile.slice(1);
      const currentMergeBlocks = parseDiff(merge(originalDiff, diffs));
      if (currentMergeBlocks.filter((block) => block.status === 'CONFLICT').length !== 0) {
        context.conflicts.push({ pathname, blocks: currentMergeBlocks });
      }
      content = stringifyBlocks(currentMergeBlocks);
    }
    context.fs.delete(destinationFilePathname);
    context.fs.write(destinationFilePathname, content);
  }
};

/**
 * remove file from destination recursively
 * @param scaffold DollieScaffold
 * @param context DollieBaseGenerator
 *
 * gives a scaffold configuration with tree data structure
 * and traverse all of the nodes on it and remove the cache paths
 * of them from file system
 */
export const removeTempFiles = (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  /**
   * remove current scaffold node's cache path
   * `context.appBasePath` and `scaffold.uuid` is mentioned above
   * use `path#resolve` combined with them would become the cache pathname for
   * current scaffold.
   */
  fs.removeSync(path.resolve(context.appBasePath, scaffold.uuid));
  fs.removeSync(path.resolve(context.appTempPath, scaffold.uuid));
  /**
   * if there are dependencies depended by current scaffold, we should traverse
   * and invoke `removeTempFiles` recursively to deal with them
   */
  if (
    scaffold.dependencies &&
    Array.isArray(scaffold.dependencies) &&
    scaffold.dependencies.length > 0
  ) {
    for (const dependence of scaffold.dependencies) {
      // invoke `removeTempFiles` to deal with each dependence
      removeTempFiles(dependence, context);
    }
  }
};

/**
 * parse scaffold tree structure as a program-readable structure
 * @param scaffold DollieScaffold
 * @param context DollieBaseGenerator
 * @param parentScaffold DollieScaffold
 * @param isCompose boolean
 *
 * this function will download the scaffold with scaffold id from github.com
 * and prompt out the questions in each scaffold
 */
export const parseScaffolds = async (
  scaffold: DollieScaffold,
  context: DollieBaseGenerator,
  parentScaffold?: DollieScaffold,
  isCompose = false
) => {
  if (!scaffold) { return; }
  const { uuid: scaffoldUuid, scaffoldName } = scaffold;
  if (!scaffold.dependencies) {
    scaffold.dependencies = [];
  }
  // `scaffoldDir` is mentioned above
  const scaffoldDir = path.resolve(context.appBasePath, scaffoldUuid);
  /**
   * `scaffoldName` is supposed to be suitable to the standardized schema of
   * Dollie's scaffold, e.g. `test` will become `dolliejs/scaffold-test` while
   * in depended scaffolds, it will become as `dolliejs/extend-scaffold-test`
   */
  const githubRepositoryId = `github:${scaffoldName}#master`;

  context.log.info(`Downloading scaffold: https://github.com/${scaffoldName}.git`);
  /**
   * download scaffold from GitHub repository and count the duration
   */
  const duration = await download(githubRepositoryId, scaffoldDir);
  context.log.info(`Template downloaded at ${scaffoldDir} in ${duration}ms`);
  context.log.info(`Reading scaffold configuration from ${scaffoldName}...`);
  let customScaffoldConfiguration: DollieScaffoldConfiguration;
  const dollieJsConfigPathname = path.resolve(scaffoldDir, '.dollie.js');
  const dollieJsonConfigPathname = path.resolve(scaffoldDir, '.dollie.json');
  /**
   * after downloading scaffold, then we should read `.dollie.js` from its
   * local template directory if it exist
   */
  if (fs.existsSync(dollieJsConfigPathname)) {
    customScaffoldConfiguration = require(dollieJsConfigPathname) || {} as DollieScaffoldConfiguration;
  } else {
    if (fs.existsSync(dollieJsonConfigPathname)) {
      customScaffoldConfiguration = (readJson(dollieJsonConfigPathname) || {}) as DollieScaffoldConfiguration;
    } else {
      customScaffoldConfiguration = { questions: [] };
    }
  }
  /**
   * set default configuration to merge with current scaffold's configuration
   */
  const defaultConfiguration = {
    questions: [],
    installers: ['npm'],
  };
  const scaffoldConfiguration: DollieScaffoldConfiguration = {
    ..._.merge(
      defaultConfiguration,
      customScaffoldConfiguration
    ),
  };

  /**
   * users can determine whether their scaffolds should use Yeoman's installers or not
   * if do not want to execute any installer, then set the `installers` option as `[]`
   * in .dollie.js
   * Currently, installers from Yeoman could be `npm`, `bower` and `yarn`
   */
  if (
    customScaffoldConfiguration.installers &&
    Array.isArray(customScaffoldConfiguration.installers) &&
    customScaffoldConfiguration.installers.length === 0
  ) {
    scaffoldConfiguration.installers = [];
  }

  /**
   * if there is not an `installer` option in .dollie.js, we should set the default value
   * as `["npm"]` to configuration
   */
  if (!customScaffoldConfiguration.installers) {
    scaffoldConfiguration.installers = ['npm'];
  }

  if (!customScaffoldConfiguration.questions) {
    scaffoldConfiguration.questions = [];
  }

  scaffoldConfiguration.questions = scaffoldConfiguration.questions.map((question) => {
    if (question.name === DEPENDS_ON_KEY) {
      return {
        ...question,
        name: context.createDependencyKey(),
      };
    }
    return question;
  });

  scaffold.configuration = scaffoldConfiguration;

  /**
   * if there is parent scaffold passed as `parseScaffolds`'s parameter
   * then set the `scaffold.parent` as `parentScaffold`'s value
   */
  if (parentScaffold) {
    scaffold.parent = parentScaffold;
  }

  const projectNameProp = { name: context.projectName };

  /**
   * if current mode is `compose` (using `dollie-compose`), then we should not
   * prompt question to users, just resolve the dependencies, invoke `parseScaffolds`
   * recursively and return back to the generator directly
   */
  if (isCompose) {
    scaffold.props = _.merge(
      projectNameProp,
      getExtendedPropsFromParentScaffold(scaffold),
      scaffold.props
    );
    if (scaffold.dependencies && Array.isArray(scaffold.dependencies)) {
      for (const dependence of scaffold.dependencies) {
        dependence.uuid = uuid();
        /**
         * cause current scaffold is a dependency, so we should invoke `parseExtendScaffoldName`
         * to parse the scaffold's name
         */
        dependence.scaffoldName = parseExtendScaffoldName(dependence.scaffoldName);
        await parseScaffolds(dependence, context, scaffold, true);
      }
    }
    return;
  }

  const scaffoldQuestions = scaffoldConfiguration.questions || [];

  /**
   * if there is a questions param available in .dollie.js, then we should
   * put the questions and make prompts to users to get the answers
   * this answers will be assigned to `scaffold.props`
   */
  const scaffoldProps = scaffoldQuestions.length > 0
    ? await context.prompt(scaffoldQuestions)
    : {};

  /**
   * omit those slot question key-value pairs, cause they are only used by `parseScaffolds`
   *
   * @example
   * it will ignore a key-value pair like `{ $CSS_PREPROCESSOR$: 'less' }`
   */
  scaffold.props = _.merge(
    projectNameProp,
    getExtendedPropsFromParentScaffold(scaffold),
    _.omitBy(
      scaffoldProps,
      (value, key) => context.isDependencyKeyRegistered(key)
    ) as DollieScaffoldProps,
  );

  /**
   * get the slot question key-value pairs and parse them as dependencies of
   * current scaffold, and put them to `scaffold.dependencies`
   */
  const dependencies = _.pickBy(
    scaffoldProps,
    (value, key) => context.isDependencyKeyRegistered(key) && value !== 'null'
  );
  for (const dependenceKey of Object.keys(dependencies)) {
    const dependenceUuid = uuid();
    const currentDependence: DollieScaffold = {
      uuid: dependenceUuid,
      scaffoldName: parseExtendScaffoldName(dependencies[dependenceKey]),
      dependencies: [],
    };
    scaffold.dependencies.push(currentDependence);
    await parseScaffolds(currentDependence, context, scaffold);
  }
};

/**
 * get configuration values from scaffold tree structure, compose recursively as
 * an array and returns it
 * @param scaffold DollieScaffold
 * @param key string
 * @returns Array
 *
 * since the `scaffold` is a nested structure, and every node could have its own configuration
 * value, but we supposed to get all of the values and make a aggregation (something just like
 * a flatten), for example: `installers`, `files.delete`, `endScripts` and so on
 *
 * @example
 * image there is a `scaffold` like:
 * ```
 * {
 *   ...,
 *   "installers": ["npm"],
 *   ...,
 *   "dependencies": [
 *     {
 *       "installers": ["yarn"]
 *     }
 *   ]
 * }
 * ```
 * then invoke `getComposedArrayValue<string>(scaffold, 'installers')`,
 * it will return `["npm", "yarn"]`
 */
export const getComposedArrayValue = <T>(scaffold: DollieScaffold, key: string): Array<T> => {
  let result = scaffold.configuration &&
    Array.isArray(_.get(scaffold.configuration, key)) &&
    Array.from(_.get(scaffold.configuration, key)) || [];
  scaffold.dependencies && Array.isArray(scaffold.dependencies) &&
    scaffold.dependencies.forEach((dependence) => {
      result = result.concat(getComposedArrayValue(dependence, key));
    });
  return result as Array<T>;
};
