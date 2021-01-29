import path from 'path';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import DollieBaseGenerator from '../generators/base';
import traverse from '../utils/traverse';
import download from '../utils/download';
import readJson from '../utils/read-json';
import { parseExtendScaffoldName } from '../utils/scaffold';
import { TRAVERSE_IGNORE_REGEXP } from '../constants';
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
 * it will ignore `.dollie.json`, and inject props into the files
 * which contain `__template.` as their filename at the beginning
 */
export const recursivelyWrite = (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  /**
   * `context.appBasePath` usually is $HOME/.dollie/cache
   * `scaffold.uuid` is the UUID for current scaffold, e.g. 3f74b271-04ac-4e7b-a5c1-b24894c529d2
   *
   * @example
   * the `scaffoldDir` would probably be $HOME/.dollie/cache/3f74b271-04ac-4e7b-a5c1-b24894c529d2
   */
  const scaffoldDir = path.resolve(context.appBasePath, scaffold.uuid);
  const destinationDir = path.resolve(context.appTempPath, scaffold.uuid);

  /**
   * invoke `traverse` function in `src/utils/traverse.ts`, set the ignore pattern
   * to avoid copying `.dollie.json` to destination path.
   */
  traverse(path.resolve(scaffoldDir), TRAVERSE_IGNORE_REGEXP, (pathname: string, entity: string) => {
    /**
     * `pathname` is an absolute pathname of file against `scaffoldDir` as above
     * we should get the relate pathname to concat with destination pathname
     *
     * @example
     * if a `pathname` equals to `/home/lenconda/.dollie/cache/3f74b271-04ac-4e7b-a5c1-b24894c529d2/src/index.js`
     * the `relativePath` would become as `src/index.js`
     */
    const relativePath = entity.startsWith('__template.')
      ? path.relative(scaffoldDir, pathname)
      : `${path.relative(scaffoldDir, pathname).slice(0, 0 - entity.length)}${entity.slice(11)}`;
    const destinationPathname = path.resolve(destinationDir, relativePath);

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
  });

  /**
   * if there are dependencies in current scaffold, then we should traverse the array
   * and call `recursivelyWrite` to process array items
   */
  for (const dependence of scaffold.dependencies) {
    recursivelyWrite(dependence, context);
  }
};

// TODO: use diff and merge
// export const recursivelyCopyToDestination = (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
//   const mergeFiles = scaffold?.configuration?.files?.merge;
//   const addFiles = scaffold?.configuration?.files?.add;
//   const scaffoldTempDir = path.resolve(context.appTempPath, scaffold.uuid);

//   traverse(scaffoldTempDir, /.*/, (pathname: string) => {
//     const relativePathname = path.relative(scaffoldTempDir, pathname);
//     const destinationFilePathname = context.destinationPath(relativePathname);

//     if (isPathnameInConfig(relativePathname, mergeFiles)) {
//       const parentFilePathname = path.resolve(context.appTempPath, scaffold.parent.uuid, relativePathname);
//       if (
//         !scaffold?.parent ||
//         !context.fs.exists(parentFilePathname) ||
//         !context.fs.exists(destinationFilePathname)
//       ) {
//         return;
//       }

//       const fileContent = context.fs.read(pathname);
//       const parentFileContent = context.fs.read(parentFilePathname);
//       const destinationFileContent = context.fs.read(destinationFilePathname);
//       const parentDiffTable = diff(parentFileContent, fileContent);
//       const destinationDiffTable = diff(destinationFileContent, fileContent);
//       const results = [];

//       for (let i = 0; i < destinationDiffTable.length; i += 1) {
//         const diffItem = destinationDiffTable[i];
//         if (diffItem.removed) {
//           const nextDiffItem = destinationDiffTable[i + 1];
//           if (nextDiffItem.added) {
//             const parentDiffItemIndex = parentDiffTable.findIndex((item) => diffItem.value.indexOf(item.value) !== -1);
//             const parentDiffItem = parentDiffTable[parentDiffItemIndex];
//             if (parentDiffItem) {
//               const parentDiffString = [
//                 parentDiffTable[parentDiffItemIndex - 1]?.value || '',
//                 parentDiffTable[parentDiffItemIndex + 1].value,
//               ].join();
//               const destinationDiffStringGroup: Array<string> = [];
//               let j = i;
//               while (
//                 parentDiffString.trim().split('\n').slice(-1)[0] !==
//                 destinationDiffStringGroup[destinationDiffStringGroup.length - 1].trim()
//               ) {
//                 if (!destinationDiffTable[j].removed) {
//                   destinationDiffStringGroup.push(destinationDiffTable[j].value);
//                 }
//                 j += 1;
//               }
//               // 判断destinationDiffStringGroup是否是parentDiffString的子句
//               if (parentDiffString.indexOf(destinationDiffStringGroup.join('')) !== -1) {
//                 results.push(diffItem.value.replace(parentDiffItem.value, ''));
//               } else {
//                 results.push(diffItem.value);
//               }
//             } else {
//               results.push(diffItem.value);
//             }
//             continue;
//           } else {
//             const destinationPreviousDiffItem = destinationDiffTable[i - 1];
//             const destinationNextDiffItem = nextDiffItem;
//             for (let j = 0; j < parentDiffTable.length; j += 1) {
//               const currentParentDiffItem = parentDiffTable[j];
//               if (currentParentDiffItem.value === diffItem.value) {
//                 const parentPreviousDiffItem = parentDiffTable[j - 1];
//                 const parentNextDiffItem = parentDiffTable[j + 1];
//                 if 
//               }
//             }
//             continue;
//           }
//         }
//       }
//     }
//   });
// };

/**
 * remove file from destination recursively
 * @param scaffold DollieScaffold
 * @param context DollieBaseGenerator
 *
 * gives a scaffold configuration with tree data structure
 * and traverse all of the nodes on it and remove the cache paths
 * of them from file system
 */
export const recursivelyRemove = (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  /**
   * remove current scaffold node's cache path
   * `context.appBasePath` and `scaffold.uuid` is mentioned above
   * use `path#resolve` combined with them would become the cache pathname for
   * current scaffold.
   */
  fs.removeSync(path.resolve(context.appBasePath, scaffold.uuid));
  /**
   * if there are dependencies depended by current scaffold, we should traverse
   * and invoke `recursivelyRemove` recursively to deal with them
   */
  if (
    scaffold.dependencies &&
    Array.isArray(scaffold.dependencies) &&
    scaffold.dependencies.length > 0
  ) {
    for (const dependence of scaffold.dependencies) {
      // invoke `recursivelyRemove` to deal with each dependence
      recursivelyRemove(dependence, context);
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
  const customScaffoldConfiguration: DollieScaffoldConfiguration =
    /**
     * after downloading scaffold, then we should read `.dollie.json` from its
     * local template directory if it exist
     */
    // eslint-disable-next-line prettier/prettier
    (readJson(path.resolve(scaffoldDir, '.dollie.json')) || {}) as DollieScaffoldConfiguration;
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
   * in .dollie.json
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
   * if there is not an `installer` option in .dollie.json, we should set the default value
   * as `["npm"]` to configuration
   */
  if (!customScaffoldConfiguration.installers) {
    scaffoldConfiguration.installers = ['npm'];
  }

  if (!customScaffoldConfiguration.questions) {
    scaffoldConfiguration.questions = [];
  }

  scaffold.configuration = scaffoldConfiguration;

  /**
   * if there is parent scaffold passed as `parseScaffolds`'s parameter
   * then set the `scaffold.parent` as `parentScaffold`'s value
   */
  if (parentScaffold) {
    scaffold.parent = parentScaffold;
  }

  /**
   * if current mode is `compose` (using `dollie-compose`), then we should not
   * prompt question to users, just resolve the dependencies, invoke `parseScaffolds`
   * recursively and return back to the generator directly
   */
  if (isCompose) {
    scaffold.props = _.merge(
      {
        name: context.projectName,
        scaffold: scaffold.scaffoldName,
      },
      getExtendedPropsFromParentScaffold(scaffold),
      scaffold.props
    );
    if (scaffold.dependencies && Array.isArray(scaffold.dependencies)) {
      for (const dependence of scaffold.dependencies) {
        const dependenceUuid = uuid();
        dependence.uuid = dependenceUuid;
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
   * if there is a questions param available in .dollie.json, then we should
   * put the questions and make prompts to users to get the answers
   * this answers will be assigned to `scaffold.props`
   */
  const scaffoldProps = scaffoldQuestions.length > 0
    ? await context.prompt(scaffoldQuestions)
    : {};

  /**
   * merge default answers and scaffold answers as `resultProps`, and then
   * assign to `scaffold.props`
   */
  const resultProps = _.merge({ name: context.projectName }, scaffoldProps);
  const dependenceKeyRegex = /^\$.*\$$/;
  /**
   * omit those slot question key-value pairs, cause they are only used by `parseScaffolds`
   *
   * @example
   * it will ignore a key-value pair like `{ $CSS_PREPROCESSOR$: 'less' }`
   */
  scaffold.props = _.merge(
    getExtendedPropsFromParentScaffold(scaffold),
    _.omitBy(resultProps, (value, key) => dependenceKeyRegex.test(key)) as DollieScaffoldProps,
  );

  /**
   * get the slot question key-value pairs and parse them as dependencies of
   * current scaffold, and put them to `scaffold.dependencies`
   */
  const dependencies = _.pickBy(resultProps, (value, key) => dependenceKeyRegex.test(key) && value !== 'null');
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
 * a flatten), for example: `installers`, `deletions`, `endScripts` and so on
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
    Array.isArray(scaffold.configuration[key]) &&
    Array.from(scaffold.configuration[key]) || [];
  scaffold.dependencies && Array.isArray(scaffold.dependencies) &&
    scaffold.dependencies.forEach((dependence) => {
      result = result.concat(getComposedArrayValue(dependence, key));
    });
  return result as Array<T>;
};
