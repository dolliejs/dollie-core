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

export const recursivelyWrite = (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
  const scaffoldDir = path.resolve(context.appBasePath, scaffold.uuid);
  traverse(path.resolve(scaffoldDir), /^((?!(\.dollie\.json)).)+$/, (pathname: string, entity: string) => {
    const relativePath = path.relative(scaffoldDir, pathname);
    // match the files with `__template.`, which means it is a scaffold file
    // so we should invoke this.fs.copyTpl to inject the props into the file
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

  for (const dependence of scaffold.dependencies) {
    recursivelyWrite(dependence, context);
  }
};

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

export const parseScaffolds = async (scaffold: DollieScaffold, context: DollieBaseGenerator) => {
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
