/**
 * @file src/app/index.ts
 * @author lenconda <i@lenconda.top>
 * @description this is the entry file for @dollies/cli generator
 *
 * For many reasons, the generator will be able to access all of the react boilerplate
 * at https://github.com/dollies?q=scaffold-&tab=repositories, otherwise we can
 * make the most little modification to this generator itself.
 *
 * So we made decisions to ask users to enter their favorite boilerplate's name, and then
 * download it form GitHub.
 *
 * For details, please read https://github.com/dollies/dollies-cli#readme
 */

import path from 'path';
import os from 'os';
import Generator, { Questions } from 'yeoman-generator';
import Environment from 'yeoman-environment';
import figlet from 'figlet';
import fs from 'fs-extra';
import _ from 'lodash';
import download from './utils/download';
import traverse from './utils/traverse';
import readJson from './utils/read-json';

const HOME_DIR = os.homedir();
const TEMPLATE_DIR = path.resolve(HOME_DIR, '.dollie/template');
const env = Environment.createEnv();

interface AppGeneratorAnswer {
  name: string;
  template: string;
  [key: string]: string;
}

class DollieGenerator extends Generator {
  // eslint-disable-next-line prettier/prettier
  private props: AppGeneratorAnswer;

  initializing() {
    this.log(figlet.textSync('DOLLIE'));
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
            'Enter the template name from https://github.com/dolliejs?q=scaffold-&tab=repositories',
          default: 'react-typescript-sass',
        },
      ];

      // get props from user's input
      const props = await this.prompt(defaultQuestions) as AppGeneratorAnswer;
      const { template } = props;
      const GITHUB_REPOSITORY_ID = `github:dolliejs/scaffold-${template}#master`;

      this.log.info(`Downloading template: ${GITHUB_REPOSITORY_ID}`);
      const duration = await download(GITHUB_REPOSITORY_ID, TEMPLATE_DIR);
      this.log.info(`Template downloaded at ${TEMPLATE_DIR} in ${duration}ms`);

      // read remote scaffold's .dollie.json
      this.log.info('Reading template configuration...');
      const scaffoldConfiguration = readJson(path.resolve(TEMPLATE_DIR, '.dollie.json'));

      const scaffoldQuestions = scaffoldConfiguration
        ? scaffoldConfiguration.questions || []
        : [];

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
        const entityHeadUnderscoreCounter = entity.split('').reduce((counter, currentCharacter) => {
          if (currentCharacter === '_' && counter.flag) {
            counter.count = counter.count + 1;
          }
          if (currentCharacter !== '_' && counter.flag) {
            counter.flag = false;
          }
          return counter;
        }, { count: 0, flag: true } as { count: number, flag: boolean });

        if (entity.startsWith('__') && entityHeadUnderscoreCounter.count >= 2) {
          this.fs.copyTpl(
            pathname,
            this.destinationPath(`${relativePath.slice(0, 0 - entity.length)}${entity.slice(2)}`),
            this.props,
          );
        } else {
          this.fs.copy(pathname, this.destinationPath(relativePath));
        }
      });
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  install() {
    this.log.info('Installing NPM dependencies...');
    this.npmInstall();
  }

  end() {
    fs.removeSync(TEMPLATE_DIR);
  }
}

env.registerStub(DollieGenerator, 'dollie');
env.run('dollie', null);

export default DollieGenerator;
