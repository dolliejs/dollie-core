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
import download from './utils/download';
import traverse from './utils/traverse';
import readJson from './utils/read-json';
import { parseTemplateName } from './utils/template';

const HOME_DIR = os.homedir();
const TEMPLATE_DIR = path.resolve(HOME_DIR, '.dollie/template');

interface AppGeneratorAnswer {
  name: string;
  template: string;
  [key: string]: string;
}

interface DollieScaffoldConfiguration {
  questions: Array<Question<AppGeneratorAnswer>>;
  installers: string[];
}

class DollieGenerator extends Generator {
  // eslint-disable-next-line prettier/prettier
  private props: AppGeneratorAnswer;
  // eslint-disable-next-line prettier/prettier
  private scaffoldConfiguration: DollieScaffoldConfiguration = {
    questions: [],
    installers: ['npm'],
  };

  initializing() {
    this.log(figlet.textSync('DOLLIE'));
    const packageJson = readJson(path.resolve(__dirname, '../package.json')) || {};
    if (packageJson.version && packageJson.name) {
      this.log(`Dollie CLI with ${packageJson.name}@${packageJson.version}`);
    }
    if (fs.existsSync(TEMPLATE_DIR) && fs.readdirSync(TEMPLATE_DIR).length !== 0) {
      this.log.info(`Cleaning template dir (${TEMPLATE_DIR})...`);
      fs.removeSync(TEMPLATE_DIR);
    }
    if (!fs.existsSync(TEMPLATE_DIR)) {
      fs.mkdirpSync(TEMPLATE_DIR);
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
          name: 'template',
          message:
            'Enter the scaffold id',
          default: 'react-typescript-sass',
        },
      ];

      // get props from user's input
      const props = await this.prompt(defaultQuestions) as AppGeneratorAnswer;
      const { template } = props;
      const templateId = parseTemplateName(template);
      const GITHUB_REPOSITORY_ID = `github:${templateId}#master`;

      this.log.info(`Downloading template: https://github.com/${templateId}.git`);
      const duration = await download(GITHUB_REPOSITORY_ID, TEMPLATE_DIR);
      this.log.info(`Template downloaded at ${TEMPLATE_DIR} in ${duration}ms`);

      // read remote scaffold's .dollie.json
      this.log.info('Reading template configuration...');
      const customScaffoldConfiguration: DollieScaffoldConfiguration =
        (readJson(path.resolve(TEMPLATE_DIR, '.dollie.json')) || {}) as DollieScaffoldConfiguration;
      const scaffoldConfiguration: DollieScaffoldConfiguration = {
        ..._.merge(
          this.scaffoldConfiguration,
          (customScaffoldConfiguration)
        ),
      };
      if (
        customScaffoldConfiguration.installers &&
        Array.isArray(customScaffoldConfiguration.installers) &&
        customScaffoldConfiguration.installers.length === 0
      ) {
        scaffoldConfiguration.installers = [];
      }
      this.scaffoldConfiguration = scaffoldConfiguration;

      const scaffoldQuestions = scaffoldConfiguration.questions || [];

      // if there is a questions param available in .dollie.json
      // then put the questions and get the answers
      const scaffoldProps = scaffoldQuestions.length > 0
        ? await this.prompt(scaffoldQuestions)
        : {};

      // merge default answers and scaffold answers
      // make them to a resultProps and inject to this.props
      const resultProps = _.merge({}, props, scaffoldProps);
      this.props = resultProps;
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  default() {
    const { name, template } = this.props;
    const DESTINATION_PATH = path.resolve(process.cwd(), name);

    // check if default params are completed or not
    if (!name || !template) {
      this.log.error('Lost some parameters, please check');
      process.exit(1);
    }

    if (fs.existsSync(DESTINATION_PATH)) {
      this.log.error('Cannot initialize a project into an existed directory');
      process.exit(1);
    }

    this.destinationRoot(DESTINATION_PATH);
  }

  async writing() {
    try {
      this.log.info('Writing template...');
      traverse(TEMPLATE_DIR, /^((?!(\.dollie\.json)).)+$/, (pathname: string, entity: string) => {
        const relativePath = path.relative(TEMPLATE_DIR, pathname);
        // match the files with `__template.`, which means it is a template file
        // so we should invoke this.fs.copyTpl to inject the props into the file
        if (entity.startsWith('__template.')) {
          this.fs.copyTpl(
            pathname,
            this.destinationPath(`${relativePath.slice(0, 0 - entity.length)}${entity.slice(11)}`),
            this.props,
          );
        } else {
          // otherwise, we should also copy the file, but just simple this.fs.copy
          this.fs.copy(pathname, this.destinationPath(relativePath));
        }
      });
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

    // traverse installers in this.scaffoldConfiguration.installers
    // get the installer from installerMap
    // when the installer is available, then invoke it
    this.scaffoldConfiguration.installers.forEach((installerName) => {
      const currentInstaller = installerMap[installerName.toLocaleLowerCase()];
      if (currentInstaller && typeof currentInstaller === 'function') {
        this.log.info(`Installing ${installerName.toUpperCase()} dependencies...`);
        currentInstaller.call(this);
      }
    });
  }

  end() {
    this.log.info('Cleaning template cache...');
    // clean up template directory
    // if the generator exits before invoking end() method,
    // the content inside template directory might not be cleaned, but
    // it would be cleaned when next generator is initializing
    fs.removeSync(TEMPLATE_DIR);
  }
}

export default DollieGenerator;
