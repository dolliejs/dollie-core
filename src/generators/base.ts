/**
 * @file src/generators/base.ts
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
import Generator from 'yeoman-generator';
import figlet from 'figlet';
import fs from 'fs-extra';
import _ from 'lodash';
import { execSync } from 'child_process';
import { recursivelyRemove, recursivelyWrite, getInstallers } from '../utils/generator';
import { DollieScaffold } from '../interfaces';

const HOME_DIR = os.homedir();

class DollieGeneratorBase extends Generator {
  // eslint-disable-next-line prettier/prettier
  public projectName: string;
  public appBasePath: string;
  public scaffold: DollieScaffold;

  initializing() {
    this.log(figlet.textSync('DOLLIE'));
    this.appBasePath = path.resolve(HOME_DIR, '.dollie/cache');
    if (fs.existsSync(this.appBasePath) && fs.readdirSync(this.appBasePath).length !== 0) {
      this.log.info(`Cleaning cache dir (${this.appBasePath})...`);
      fs.removeSync(this.appBasePath);
    }
    if (!fs.existsSync(this.appBasePath)) {
      fs.mkdirpSync(this.appBasePath);
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
    const installers = _.uniq(getInstallers(this.scaffold));
    installers.forEach((installerName) => {
      const currentInstaller = installerMap[installerName.toLocaleLowerCase()];
      if (currentInstaller && typeof currentInstaller === 'function') {
        this.log.info(`Installing ${installerName.toUpperCase()} dependencies...`);
        currentInstaller.call(this);
      } else {
        try {
          execSync(installerName);
        } catch (e) {
          this.log.error(e.message || e.toString());
        }
      }
    });
  }

  end() {
    this.log.info('Cleaning scaffold cache...');
    // clean up scaffold directory
    // if the generator exits before invoking end() method,
    // the content inside scaffold directory might not be cleaned, but
    // it would be cleaned when next generator is initializing
    recursivelyRemove(this.scaffold, this);
  }
}

export default DollieGeneratorBase;
