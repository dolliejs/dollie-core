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
import Generator from 'yeoman-generator';
import figlet from 'figlet';
import fs from 'fs-extra';
import _ from 'lodash';
import { execSync } from 'child_process';
import { recursivelyRemove, recursivelyWrite, getComposedArrayValue } from '../utils/generator';
import readJson from '../utils/read-json';
import { HOME_DIR, CACHE_DIR } from '../constants';
import { DollieScaffold } from '../interfaces';

class DollieGeneratorBase extends Generator {
  /**
   * the name of the project, decides write scaffold contents into which directory
   */
  // eslint-disable-next-line prettier/prettier
  public projectName: string;
  /**
   * the absolute pathname for storing scaffold contents temporarily
   * it is a composed pathname with `HOME_DIR` and `CACHE_DIR`
   */
  public appBasePath: string;
  /**
   * the nested tree structure of all scaffolds used during one lifecycle
   * the main scaffold is on the top level, which is supposed to be unique
   */
  protected scaffold: DollieScaffold;
  /**
   * the name to be shown as a prompt when CLI is initializing
   */
  protected cliName: string;

  initializing() {
    this.log(figlet.textSync('DOLLIE'));
    const packageJson =
    readJson(path.resolve(__dirname, '../../package.json')) || {};
    if (packageJson.version && packageJson.name) {
      this.log(
        `${this.cliName} CLI with ${packageJson.name}@${packageJson.version}`
      );
    }
    this.appBasePath = path.resolve(HOME_DIR, CACHE_DIR);
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

    /**
     * set destination pathname with `this.projectName`
     * it is an alias to `path.resolve(process.cwd(), this.projectName)`
     */
    this.destinationRoot(DESTINATION_PATH);
  }

  async writing() {
    try {
      this.log.info('Writing main scaffold...');
      /**
       * invoke `recursiveWrite` function to deal with scaffolds and write
       * scaffold contents into the destination directory
       */
      recursivelyWrite(this.scaffold, this);
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  install() {
    /**
     * define installers map
     * only support npm, yarn and bower currently
     */
    const installerMap = {
      npm: this.npmInstall,
      yarn: this.yarnInstall,
      bower: this.bowerInstall,
    };

    /**
     * traverse installers in this.scaffold.configuration.installers
     * get the installer from installerMap
     * when the installer is available, then invoke it
     */
    const installers = _.uniq(getComposedArrayValue<string>(this.scaffold, 'installers'));
    for (const installerName of installers) {
      const currentInstaller = installerMap[installerName.toLocaleLowerCase()];
      if (currentInstaller && typeof currentInstaller === 'function') {
        this.log.info(`Installing ${installerName.toUpperCase()} dependencies...`);
        currentInstaller.call(this);
      }
    }
  }

  end() {
    /**
     * clean up scaffold directory
     * if the generator exits before invoking end() method,
     * the content inside scaffold directory might not be cleaned, but
     * it would be cleaned when next generator is initializing
     */
    this.log.info('Cleaning scaffold cache...');
    recursivelyRemove(this.scaffold, this);

    /**
     * if there are items in `config.deletions` options, then we should traverse
     * it and remove the items
     */
    const deletions = getComposedArrayValue<string>(this.scaffold, 'deletions');
    for (const deletion of deletions) {
      if (typeof deletion === 'string') {
        try {
          this.log.info(`Deleting scaffold deletion item: ${deletion}`);
          fs.removeSync(this.destinationPath(deletion));
        } catch (e) {
          this.log.error(e.message || e.toString());
        }
      }
    }

    /**
     * if there are items in `config.endScripts` options, then we should traverse
     * it and remove the items
     */
    const endScripts = getComposedArrayValue<string>(this.scaffold, 'endScripts');
    for (const endScript of endScripts) {
      if (typeof endScript === 'string') {
        try {
          this.log.info(`Executing end script: \`${endScript}\``);
          this.log(Buffer.from(execSync(endScript)).toString());
        } catch (e) {
          this.log.error(e.message || e.toString());
        }
      }
    }
  }
}

export default DollieGeneratorBase;
