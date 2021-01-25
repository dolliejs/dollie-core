/**
 * @file src/app/index.ts
 * @author lenconda <i@lenconda.top>
 * @description this is the entry file for @dollie/cli generator
 *
 * For many reasons, the generator will be able to access all of the react boilerplate
 * at https://github.com/dolliejs?q=scaffold-&tab=repositories, otherwise we can
 * make the most little modification to this generator itself.
 *
 * So we made decisions to ask users to enter their favorite boilerplate's name, and then
 * download it form GitHub.
 *
 * For details, please read https://github.com/dolliejs/dollie-cli#readme
 */

import path from 'path';
import os from 'os';
import Generator, { Questions, Question } from 'yeoman-generator';
import figlet from 'figlet';
import fs from 'fs-extra';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import download from './utils/download';
import traverse from './utils/traverse';
import readJson from './utils/read-json';
import { parseExtendScaffoldName, parseScaffoldName } from './utils/scaffold';

const HOME_DIR = os.homedir();

export interface DollieScaffoldBaseProps {
  name: string;
}

export interface DollieScaffoldProps extends DollieScaffoldBaseProps {
  name: string;
  scaffold: string;
  [key: string]: string;
}

export interface DollieScaffoldConfiguration {
  questions: Array<Question<DollieScaffoldProps>>;
  installers?: string[];
  extends?: Record<string, string>;
  bases?: Array<string>;
}

export interface DollieDependence {
  scaffold: string;
  config?: DollieScaffoldConfiguration;
}

export interface DollieScaffold {
  uuid: string;
  scaffoldName: string;
  dependencies: Array<DollieScaffold>;
  isMainScaffold?: boolean;
  configuration?: DollieScaffoldConfiguration;
  props?: DollieScaffoldProps;
}

const recursivelyWrite = (scaffold: DollieScaffold, context: DollieGenerator) => {
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

class DollieGenerator extends Generator {
  // eslint-disable-next-line prettier/prettier
  public appBasePath: string;
  // eslint-disable-next-line prettier/prettier
  public scaffoldDir: string;
  // eslint-disable-next-line prettier/prettier
  public scaffold: DollieScaffold;
  // eslint-disable-next-line prettier/prettier
  public projectName: string;

  // eslint-disable-next-line prettier/prettier
  private async parseScaffolds(scaffold: DollieScaffold) {
    if (!scaffold) { return; }
    const { uuid: scaffoldUuid, scaffoldName, isMainScaffold } = scaffold;
    const scaffoldDir = path.resolve(this.appBasePath, scaffoldUuid);
    const GITHUB_REPOSITORY_ID = `github:${scaffoldName}#master`;

    this.log.info(`Downloading scaffold: https://github.com/${scaffoldName}.git`);
    const duration = await download(GITHUB_REPOSITORY_ID, scaffoldDir);
    this.log.info(`Template downloaded at ${scaffoldDir} in ${duration}ms`);

    // read remote scaffold's .dollie.json
    this.log.info(`Reading scaffold configuration from ${scaffoldName}...`);
    const customScaffoldConfiguration: DollieScaffoldConfiguration =
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
      isMainScaffold &&
      customScaffoldConfiguration.installers &&
      Array.isArray(customScaffoldConfiguration.installers) &&
      customScaffoldConfiguration.installers.length === 0
    ) {
      scaffoldConfiguration.installers = [];
    }

    if (isMainScaffold && !customScaffoldConfiguration.installers) {
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
      ? await this.prompt(scaffoldQuestions)
      : {};

    // merge default answers and scaffold answers
    // make them to a resultProps and inject to this.props
    const resultProps = _.merge({ name: this.projectName }, scaffoldProps);
    const dependenceKeyRegex = /^\$.*\$$/;
    scaffold.props = _.omitBy(resultProps, (value, key) => dependenceKeyRegex.test(key)) as DollieScaffoldProps;

    const dependencies = _.pickBy(resultProps, (value, key) => dependenceKeyRegex.test(key));
    for (const dependenceKey of Object.keys(dependencies)) {
      const dependenceUuid = uuid();
      const currentDependence: DollieScaffold = {
        uuid: dependenceUuid,
        scaffoldName: parseExtendScaffoldName(dependencies[dependenceKey]),
        dependencies: [],
      };
      scaffold.dependencies.push(currentDependence);
      await this.parseScaffolds(currentDependence);
    }
  }

  initializing() {
    this.log(figlet.textSync('DOLLIE'));
    this.appBasePath = path.resolve(HOME_DIR, '.dollie/cache');
    this.scaffoldDir = path.resolve(this.appBasePath, 'main_scaffold');
    const packageJson = readJson(path.resolve(__dirname, '../package.json')) || {};
    if (packageJson.version && packageJson.name) {
      this.log(`Dollie CLI with ${packageJson.name}@${packageJson.version}`);
    }
    if (fs.existsSync(this.appBasePath) && fs.readdirSync(this.appBasePath).length !== 0) {
      this.log.info(`Cleaning cache dir (${this.appBasePath})...`);
      fs.removeSync(this.appBasePath);
    }
    if (!fs.existsSync(this.scaffoldDir)) {
      fs.mkdirpSync(this.scaffoldDir);
    }
  }

  async prompting() {
    try {
      // default and essential questions
      // it is hard-coded in the generator, DO NOT MODIFY IT
      const defaultQuestions: Questions = [
        {
          type: 'input',
          name: 'name',
          message: 'Enter the project name',
          default: 'project',
        },
        {
          type: 'input',
          name: 'scaffold',
          message:
            'Enter the scaffold id',
          default: 'react-typescript-sass',
        },
      ];

      // get props from user's input
      const props = await this.prompt(defaultQuestions) as DollieScaffoldProps;
      this.projectName = props.name;
      const scaffold: DollieScaffold = {
        uuid: uuid(),
        scaffoldName: parseScaffoldName(props.scaffold),
        dependencies: [],
        isMainScaffold: true,
      };
      await this.parseScaffolds(scaffold);
      this.scaffold = scaffold;
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  default() {
    const DESTINATION_PATH = path.resolve(process.cwd(), this.projectName);

    if (fs.existsSync(DESTINATION_PATH)) {
      this.log.error('Cannot initialize a project into an existed directory');
      process.exit(1);
    }

    this.destinationRoot(DESTINATION_PATH);
  }

  async writing() {
    try {
      this.log.info('Writing main scaffold...');
      // this.recursivelyWrite(this.scaffold);
      recursivelyWrite(this.scaffold, this);
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  install() {
    // define installers map
    // only support npm, yarn and bower currently
    const installerMap = {
      npm: this.npmInstall,
      yarn: this.yarnInstall,
      bower: this.bowerInstall,
    };

    // traverse installers in this.scaffold.configuration.installers
    // get the installer from installerMap
    // when the installer is available, then invoke it
    const installers = this.scaffold.configuration.installers || ['npm'];
    installers.forEach((installerName) => {
      const currentInstaller = installerMap[installerName.toLocaleLowerCase()];
      if (currentInstaller && typeof currentInstaller === 'function') {
        this.log.info(`Installing ${installerName.toUpperCase()} dependencies...`);
        currentInstaller.call(this);
      }
    });
  }

  end() {
    this.log.info('Cleaning scaffold cache...');
    // clean up scaffold directory
    // if the generator exits before invoking end() method,
    // the content inside scaffold directory might not be cleaned, but
    // it would be cleaned when next generator is initializing
    fs.removeSync(this.scaffoldDir);
  }
}

export default DollieGenerator;
