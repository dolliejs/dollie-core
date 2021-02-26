import path from 'path';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import requireFromString from 'require-from-string';
import DollieBaseGenerator from '../base';
import traverse from './traverse';
import { downloadScaffold } from './download';
import { diff, checkFileAction, parseDiffToMergeBlocks, parseMergeBlocksToText, merge } from './diff';
import {
  parseExtendScaffoldName,
  parseFilePathname,
  renderTemplate,
  parseScaffoldName,
} from './scaffold';
import { readJson } from './files';
import {
  DollieAppMode,
  DollieScaffold,
  DollieScaffoldConfiguration,
  DollieScaffoldProps,
  ScaffoldRepoDescription,
} from '../interfaces';
import { ArgInvalidError } from '../errors';
import { isBinaryFileSync } from 'isbinaryfile';

/**
 * get extended props from parent scaffold
 * @param {DollieScaffold} scaffold
 * @returns {object}
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
 * @param {DollieScaffold} scaffold
 * @param {DollieBaseGenerator} context
 *
 * gives a scaffold configuration with tree data structure
 * and traverse all of the nodes in this tree recursively and process them
 * with `Generator#fs#copyTpl` and `Generator#fs#copy`
 * it will ignore `.dollie.js`, and inject props into the files
 * which contain `__template.` as their filename at the beginning
 */
export const writeTempFiles = async (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  const { TRAVERSE_IGNORE_REGEXP, TEMPLATE_FILE_PREFIX } = context.constants;
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
  const items = await traverse(path.resolve(scaffoldSourceDir), TRAVERSE_IGNORE_REGEXP, context.volume);

  for (const item of items) {
    const { pathname, entity, stat } = item;
    if (stat !== 'file') { continue; }
    /**
     * `pathname` is an absolute pathname of file against `scaffoldSourceDir` as above
     * we should get the relate pathname to concat with destination pathname
     *
     * @example
     * if a `pathname` equals to `/home/lenconda/.dollie/cache/3f74b271-04ac-4e7b-a5c1-b24894c529d2/src/index.js`
     * the `relativePath` would become as `src/index.js`
     */
    const absolutePathname = parseFilePathname(pathname, TEMPLATE_FILE_PREFIX);
    const relativePathname = path.relative(scaffoldSourceDir, absolutePathname);
    const destinationPathname = path.resolve(destinationDir, relativePathname);

    const fileDir = destinationPathname.split(path.sep).slice(0, -1).join(path.sep);

    if (!context.volume.existsSync(fileDir)) {
      context.volume.mkdirpSync(fileDir);
    }

    if (entity.startsWith(TEMPLATE_FILE_PREFIX)) {
      const templateFileContent = context.volume.readFileSync(pathname, { encoding: 'utf8' });
      const fileContent = renderTemplate(templateFileContent, scaffold.props || {});
      context.volume.writeFileSync(destinationPathname, fileContent, { encoding: 'utf8' });
    } else {
      // otherwise, we should also copy the file, but just simple this.fs.copy
      context.volume.writeFileSync(
        destinationPathname,
        context.volume.readFileSync(pathname, 'utf8'),
        { encoding: 'utf8' },
      );
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
  const { TRAVERSE_IGNORE_REGEXP, TEMPLATE_FILE_PREFIX } = context.constants;
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

  const items = await traverse(scaffoldSourceDir, TRAVERSE_IGNORE_REGEXP, context.volume);
  for (const item of items) {
    const { pathname, stat } = item;
    if (stat !== 'file') { continue; }
    /**
     * get the relative path with the start dir of current scaffold's temporary dir
     * still need get rid of `__template.` at the beginning of each file's filename
     */

    const absolutePathname = parseFilePathname(pathname, TEMPLATE_FILE_PREFIX);
    const relativePathname = path.relative(scaffoldSourceDir, absolutePathname);
    /**
     * read current file from temporary dir on mem-fs
     */
    const currentTempFileBuffer = context.volume.readFileSync(
      path.resolve(scaffoldTempDir, relativePathname),
    );

    if (isBinaryFileSync(currentTempFileBuffer)) {
      context.binaryTable[relativePathname] = absolutePathname;
    } else {
      const currentTempFileContent = currentTempFileBuffer.toString();
      /**
       * get the action from relations as below:
       * 1. parent scaffold's file content with the same name
       * 2. file content in destination dir on mem-fs which has the same name as current one
       * 3. current file that will be written into destination dir
       */
      const action = checkFileAction(scaffold, relativePathname, context.cacheTable);

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
          context.cacheTable[relativePathname] = [diff(currentTempFileContent)];
          break;
        }
        /**
         * if action for current file is `MERGE`, which means we should take previous content
         * into concern, so Dollie will do these things:
         * 1. get diff between current file content and the original content
         * 2. push the diff to cache table
         */
        case 'MERGE': {
          const cacheTableItem = context.cacheTable[relativePathname];

          if (!cacheTableItem) {
            break;
          }

          const originalDiff = cacheTableItem[0];
          const originalFileContent = parseMergeBlocksToText(parseDiffToMergeBlocks(originalDiff));
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
  }

  /**
   * if there are dependencies in current scaffold, then we should traverse the array
   * and call `writeCacheTable` to process array items
   */
  for (const dependence of scaffold.dependencies) {
    await writeCacheTable(dependence, context);
  }
};

/**
 * write all the files from cache table to physical dir
 * @param {DollieBaseGenerator} context
 */
export const writeToDestinationPath = (context: DollieBaseGenerator) => {
  for (const pathname of Object.keys(context.cacheTable)) {
    if (!context.cacheTable[pathname]) { continue; }
    const currentCachedFile = context.cacheTable[pathname];
    const destinationFilePathname = context.destinationPath(pathname);
    let content = '';
    if (currentCachedFile.length === 1) {
      content = parseMergeBlocksToText(parseDiffToMergeBlocks(currentCachedFile[0]));
    } else {
      const originalDiff = currentCachedFile[0];
      const diffs = currentCachedFile.slice(1);
      const currentMergeBlocks = parseDiffToMergeBlocks(merge(originalDiff, diffs));
      if (currentMergeBlocks.filter((block) => block.status === 'CONFLICT').length !== 0) {
        context.conflicts.push({ pathname, blocks: currentMergeBlocks });
      }
      content = parseMergeBlocksToText(currentMergeBlocks);
    }
    context.fs.delete(destinationFilePathname);
    context.fs.write(destinationFilePathname, content);
  }
};

/**
 * parse scaffold tree structure as a program-readable structure
 * @param {DollieScaffold} scaffold
 * @param {DollieBaseGenerator} context
 * @param {DollieScaffold} parentScaffold
 * @param {boolean} isCompose
 *
 * this function will download the scaffold with scaffold id from github.com
 * and prompt out the questions in each scaffold
 */
export const parseScaffolds = async (
  scaffold: DollieScaffold,
  context: DollieBaseGenerator,
  parentScaffold?: DollieScaffold,
  mode: DollieAppMode = 'interactive',
) => {
  if (!scaffold) { return; }
  const { DEPENDS_ON_KEY } = context.constants;
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
  let repoDescription: ScaffoldRepoDescription;
  if (!parentScaffold) {
    repoDescription = parseScaffoldName(scaffoldName);
  } else {
    repoDescription = parseExtendScaffoldName(scaffoldName);
  }

  const { owner, name, checkout, origin } = repoDescription;
  const parsedScaffoldName = `${owner}/${name}#${checkout}@${origin}`;

  context.log.info(`Pulling scaffold from ${parsedScaffoldName}`);
  /**
   * download scaffold from GitHub repository and count the duration
   */
  const duration = await downloadScaffold(
    repoDescription,
    scaffoldDir,
    context.volume,
    0,
    {
      timeout: context.constants.SCAFFOLD_TIMEOUT,
    },
    context,
  );
  context.log.info(`Template pulled in ${duration}ms`);
  context.log.info(`Reading scaffold configuration from ${parsedScaffoldName}...`);

  let customScaffoldConfiguration: DollieScaffoldConfiguration;
  const dollieJsConfigPathname = path.resolve(scaffoldDir, '.dollie.js');
  const dollieJsonConfigPathname = path.resolve(scaffoldDir, '.dollie.json');
  /**
   * after downloading scaffold, then we should read `.dollie.js` from its
   * local template directory if it exist
   */
  if (context.volume.existsSync(dollieJsConfigPathname)) {
    customScaffoldConfiguration = requireFromString(
      context.volume.readFileSync(dollieJsConfigPathname).toString(),
    ) || {};
  } else {
    if (context.volume.existsSync(dollieJsonConfigPathname)) {
      customScaffoldConfiguration =
        (readJson(dollieJsonConfigPathname, context.volume) || {}) as DollieScaffoldConfiguration;
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
      customScaffoldConfiguration,
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
    const match = DEPENDS_ON_KEY.exec(question.name);
    if (match) {
      const scaffoldName = match[1];
      return {
        ...question,
        name: context.createDependencyKey(scaffoldName?.slice(1) || ''),
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
  if (mode !== 'interactive') {
    scaffold.props = _.merge(
      projectNameProp,
      getExtendedPropsFromParentScaffold(scaffold),
      scaffold.props,
    );
    if (scaffold.dependencies && Array.isArray(scaffold.dependencies)) {
      for (const dependence of scaffold.dependencies) {
        if (!dependence.scaffoldName) {
          throw new ArgInvalidError([mode !== 'compose' ? 'scaffoldName' : 'scaffold_name']);
        }

        dependence.uuid = uuid();
        /**
         * cause current scaffold is a dependency, so we should invoke `parseExtendScaffoldName`
         * to parse the scaffold's name
         */
        const description = parseExtendScaffoldName(dependence.scaffoldName);
        const { owner, name, checkout, origin } = description;
        dependence.scaffoldName = `${owner}/${name}#${checkout}@${origin}`;
        await parseScaffolds(dependence, context, scaffold, mode);
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
   */
  scaffold.props = _.merge(
    projectNameProp,
    getExtendedPropsFromParentScaffold(scaffold),
    _.omitBy(
      scaffoldProps,
      (value, key) => context.isDependencyKeyRegistered(key),
    ) as DollieScaffoldProps,
  );

  /**
   * get the slot question key-value pairs and parse them as dependencies of
   * current scaffold, and put them to `scaffold.dependencies`
   */
  const dependencies = _.pickBy(
    scaffoldProps,
    (value, key) => context.isDependencyKeyRegistered(key) && value !== 'null',
  );
  for (const dependenceKey of Object.keys(dependencies)) {
    let dependedScaffoldName = '';
    const currentDependenceValue = dependencies[dependenceKey];
    const match = _.get(/\:(.*)$/.exec(dependenceKey), 1);
    if (match) {
      if (_.isBoolean(currentDependenceValue) && currentDependenceValue) {
        dependedScaffoldName = match;
      } else { continue; }
    } else {
      dependedScaffoldName = currentDependenceValue;
    }
    if (!dependedScaffoldName) { continue; }
    const dependenceUuid = uuid();
    const description = parseExtendScaffoldName(dependedScaffoldName);
    const { owner, name, checkout, origin } = description;
    const currentDependence: DollieScaffold = {
      uuid: dependenceUuid,
      scaffoldName: `${owner}/${name}#${checkout}@${origin}`,
      dependencies: [],
    };
    scaffold.dependencies.push(currentDependence);
    await parseScaffolds(currentDependence, context, scaffold, mode);
  }
};

/**
 * get configuration values from scaffold tree structure, compose recursively as
 * an array and returns it
 * @param {DollieScaffold} scaffold
 * @param {string} key
 * @param {boolean} lazyMode
 * @returns {Array<any>}
 *
 * since the `scaffold` is a nested structure, and every node could have its own configuration
 * value, but we supposed to get all of the values and make a aggregation (something just like
 * a flatten), for example: `installers`, `files.delete`, `endScripts` and so on
 */
export const getComposedArrayValue = <T>(scaffold: DollieScaffold, key: string, lazyMode = false): Array<T> => {
  const recursion = (scaffold: DollieScaffold, key: string, lazyMode: boolean): Array<Array<T>> => {
    let results = [_.get(scaffold.configuration, key)];
    const dependencies = _.get(scaffold, 'dependencies') || [];
    for (const dependence of dependencies) {
      const dependenceResult = recursion(dependence, key, lazyMode);
      results = results.concat(dependenceResult);
    }
    return results;
  };

  const resultItems = recursion(scaffold, key, lazyMode);

  if (
    lazyMode &&
    resultItems.filter(
      (result) => Array.isArray(result) && result.length === 0,
    ).length > 0
  ) {
    return [];
  }

  if (resultItems.filter((item) => item === undefined).length === resultItems.length) {
    return undefined;
  }

  return resultItems.reduce((result: Array<T>, currentResult) => {
    if (Array.isArray(currentResult)) {
      return result.concat(currentResult);
    }
    return result;
  }, [] as Array<T>);
};
