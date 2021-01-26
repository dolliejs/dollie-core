import path from 'path';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import DollieBaseGenerator from '../generators/base';
import traverse from '../utils/traverse';
import download from '../utils/download';
import readJson from '../utils/read-json';
import { parseExtendScaffoldName } from '../utils/scaffold';
import { DollieScaffold, DollieScaffoldConfiguration, DollieScaffoldProps } from '../interfaces';

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

  /**
   * invoke `traverse` function in `src/utils/traverse.ts`, set the ignore pattern
   * to avoid copying `.dollie.json` to destination path.
   */
  traverse(path.resolve(scaffoldDir), /^((?!(\.dollie\.json)).)+$/, (pathname: string, entity: string) => {
    /**
     * `pathname` is an absolute pathname of file against `scaffoldDir` as above
     * we should get the relate pathname to concat with destination pathname
     *
     * @example
     * if a `pathname` equals to `/home/lenconda/.dollie/cache/3f74b271-04ac-4e7b-a5c1-b24894c529d2/src/index.js`
     * the `relativePath` would become as `src/index.js`
     */
    const relativePath = path.relative(scaffoldDir, pathname);

    /**
     * match the files with `__template.`, which means it is a scaffold file
     * so we should invoke this.fs.copyTpl to inject the props into the file
     */
    if (entity.startsWith('__template.')) {
      context.fs.copyTpl(
        pathname,
        context.destinationPath(`${relativePath.slice(0, 0 - entity.length)}${entity.slice(11)}`),
        scaffold.props,
      );
    } else {
      // otherwise, we should also copy the file, but just simple this.fs.copy
      context.fs.copy(pathname, context.destinationPath(relativePath));
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

/**
 * remove file from destination recursively
 * @param scaffold DollieScaffold
 * @param context DollieBaseGenerator
 */
export const recursivelyRemove = (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  fs.removeSync(path.resolve(context.appBasePath, scaffold.uuid));
  if (scaffold.dependencies && scaffold.dependencies.length > 0) {
    scaffold.dependencies.forEach((dependence) => {
      recursivelyRemove(dependence, context);
    });
  }

  if (scaffold.configuration && scaffold.configuration.deletions) {
    for (const deletion of scaffold.configuration.deletions) {
      fs.removeSync(context.destinationPath(deletion));
    }
  }
};

export const parseScaffolds = async (scaffold: DollieScaffold, context: DollieBaseGenerator, isCompose = false) => {
  if (!scaffold) { return; }
  const { uuid: scaffoldUuid, scaffoldName } = scaffold;
  const scaffoldDir = path.resolve(context.appBasePath, scaffoldUuid);
  const GITHUB_REPOSITORY_ID = `github:${scaffoldName}#master`;

  context.log.info(`Downloading scaffold: https://github.com/${scaffoldName}.git`);
  const duration = await download(GITHUB_REPOSITORY_ID, scaffoldDir);
  context.log.info(`Template downloaded at ${scaffoldDir} in ${duration}ms`);

  // read remote scaffold's .dollie.json
  context.log.info(`Reading scaffold configuration from ${scaffoldName}...`);
  const customScaffoldConfiguration: DollieScaffoldConfiguration =
    // eslint-disable-next-line prettier/prettier
    (readJson(path.resolve(scaffoldDir, '.dollie.json')) || {}) as DollieScaffoldConfiguration;
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

  if (
    customScaffoldConfiguration.installers &&
    Array.isArray(customScaffoldConfiguration.installers) &&
    customScaffoldConfiguration.installers.length === 0
  ) {
    scaffoldConfiguration.installers = [];
  }

  if (!customScaffoldConfiguration.installers) {
    scaffoldConfiguration.installers = ['npm'];
  }

  if (!customScaffoldConfiguration.questions) {
    scaffoldConfiguration.questions = [];
  }

  scaffold.configuration = scaffoldConfiguration;

  if (isCompose) {
    scaffold.props = _.merge(
      {
        name: context.projectName,
        scaffold: scaffold.scaffoldName,
      },
      (scaffold.props || {})
    );
    return;
  }

  const scaffoldQuestions = scaffoldConfiguration.questions || [];

  // if there is a questions param available in .dollie.json
  // then put the questions and get the answers
  const scaffoldProps = scaffoldQuestions.length > 0
    ? await context.prompt(scaffoldQuestions)
    : {};

  // merge default answers and scaffold answers
  // make them to a resultProps and inject to context.props
  const resultProps = _.merge({ name: context.projectName }, scaffoldProps);
  const dependenceKeyRegex = /^\$.*\$$/;
  scaffold.props = _.omitBy(resultProps, (value, key) => dependenceKeyRegex.test(key)) as DollieScaffoldProps;

  const dependencies = _.pickBy(resultProps, (value, key) => dependenceKeyRegex.test(key) && value !== 'null');
  for (const dependenceKey of Object.keys(dependencies)) {
    const dependenceUuid = uuid();
    const currentDependence: DollieScaffold = {
      uuid: dependenceUuid,
      scaffoldName: parseExtendScaffoldName(dependencies[dependenceKey]),
      dependencies: [],
    };
    scaffold.dependencies.push(currentDependence);
    await parseScaffolds(currentDependence, context);
  }
};

export const getComposedArrayValue = <T>(scaffold: DollieScaffold, key: string): Array<T> => {
  let result = scaffold.configuration &&
    Array.isArray(scaffold.configuration[key]) &&
    Array.from(scaffold.configuration[key]);
  scaffold.dependencies && Array.isArray(scaffold.dependencies) &&
    scaffold.dependencies.forEach((dependence) => {
      result = result.concat(getComposedArrayValue(dependence, key));
    });
  return result as Array<T>;
};
