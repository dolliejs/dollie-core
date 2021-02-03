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
import chalk from 'chalk';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  recursivelyRemove,
  recursivelyWrite,
  getComposedArrayValue,
  recursivelyCopyToDestination,
} from '../utils/generator';
import readJson from '../utils/read-json';
import { HOME_DIR, CACHE_DIR, TEMP_DIR } from '../constants';
import { DollieScaffold, MergeConflictRecord } from '../interfaces';

class DollieGeneratorBase extends Generator {
  /**
   * the name of the project, decides write scaffold contents into which directory
   */
  // eslint-disable-next-line prettier/prettier
  public projectName: string;
  /**
   * the absolute pathname for storing scaffold contents
   * it is a composed pathname with `HOME_DIR` and `CACHE_DIR`
   */
  public appBasePath: string;
  /**
   * the absolute pathname for storing scaffold contents temporarily
   * it is a composed pathname with `HOME_DIR` and `TEMP_DIR`
   */
  public appTempPath: string;
  /**
   * it is a `(string, string)` tuple, which saves content text of files
   * that is `config.files.merge`
   */
  public mergeTable: Record<string, string> = {};
  /**
   * saves all the conflicts in this array.
   * when a file from destination dir is written by more than two scaffold,
   * there might become some conflicts. Dollie uses Myers diff and 3-merge algorithm
   * inspired by Git to save the conflict files during writing files
   */
  public conflicts: Array<MergeConflictRecord> = [];
  /**
   * the nested tree structure of all scaffolds used during one lifecycle
   * the main scaffold is on the top level, which is supposed to be unique
   */
  protected scaffold: DollieScaffold;
  /**
   * the name to be shown as a prompt when CLI is initializing
   */
  protected cliName: string;
  private dependencyKeys: Array<string> = [];

  /**
   * create a unique dependency key and push to `this.dependencyKeys`
   * @returns string
   */
  public createDependencyKey(): string {
    const uuid = uuidv4();
    const randomString = Math.random().toString(32).slice(2);
    const key = `$dep_${uuid.split('-').join('')}_${randomString}`;
    if (this.dependencyKeys.indexOf(key) === -1) {
      this.dependencyKeys.push(key);
      return key;
    } else {
      return this.createDependencyKey();
    }
  }

  /**
   * check if a key is in the `this.dependencyKeys` or not
   * @param key string
   * @returns boolean
   */
  public isDependencyKeyRegistered(key: string): boolean {
    return this.dependencyKeys.indexOf(key) !== -1;
  }

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
    this.appTempPath = path.resolve(HOME_DIR, TEMP_DIR);
    if (fs.existsSync(this.appBasePath) && fs.readdirSync(this.appBasePath).length !== 0) {
      this.log.info(`Cleaning cache dir ${this.appBasePath}...`);
      fs.removeSync(this.appBasePath);
    }
    if (!fs.existsSync(this.appBasePath)) {
      fs.mkdirpSync(this.appBasePath);
    }
    if (fs.existsSync(this.appTempPath) && fs.readdirSync(this.appTempPath).length !== 0) {
      this.log.info(`Cleaning temp dir ${this.appTempPath}...`);
      fs.removeSync(this.appTempPath);
    }
    if (!fs.existsSync(this.appTempPath)) {
      fs.mkdirpSync(this.appTempPath);
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
      recursivelyCopyToDestination(this.scaffold, this);
      this.fs.delete(path.resolve(this.appTempPath));

      const deletions = getComposedArrayValue<string>(this.scaffold, 'files.delete');
      const conflicts = this.conflicts.filter(
        (conflict) => deletions.indexOf(conflict.pathname) === -1
      );
      this.conflicts = conflicts;
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  install() {
    if (this.conflicts.length > 0) {
      return;
    }
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
     * if there are items in `config.files.delete` options, then we should traverse
     * it and remove the items
     */
    const deletions = getComposedArrayValue<string>(this.scaffold, 'files.delete')
      .filter((deletion) => fs.existsSync(this.destinationPath(deletion)));
    for (const deletion of deletions) {
      if (typeof deletion === 'string') {
        try {
          this.log.info(`Deleting scaffold item: ${deletion}`);
          fs.removeSync(this.destinationPath(deletion));
        } catch (e) {
          this.log.error(e.message || e.toString());
        }
      }
    }

    /**
     * if there are items in `config.endScripts` options, then we should traverse
     * there are two types for `config.endScripts` option: `string` and `Function`
     */
    const endScripts = getComposedArrayValue<Function | string>(this.scaffold, 'endScripts');
    for (const endScript of endScripts) {
      try {
        /**
         * if current end script value is a string, Dollie will recognize it as a
         * normal shell command, and will invoke `child_process.execSync` to execute
         * this script as a command
         */
        if (typeof endScript === 'string') {
            this.log.info(`Executing end script: \`${endScript}\``);
            this.log(Buffer.from(execSync(endScript)).toString());
        /**
         * if current end script value is a function, Dollie will considering reading
         * the code from it, and call it with `context`
         * `context` contains some file system utilities provided by Dollie
         */
        } else if (typeof endScript === 'function') {
          const endScriptSource = Function.prototype.toString.call(endScript);
          const endScriptFunc = new Function(`return ${endScriptSource}`).call(null);
          endScriptFunc({
            fs: {
              read: (pathname: string): string => {
                return fs.readFileSync(this.destinationPath(pathname), { encoding: 'utf-8' });
              },
              exists: (pathname: string): boolean => {
                return fs.existsSync(this.destinationPath(pathname));
              },
              readJson: (pathname: string): object => {
                return readJson(this.destinationPath(pathname));
              },
              remove: (pathname: string) => {
                return fs.removeSync(pathname);
              },
              write: (pathname: string, content: string) => {
                return fs.writeFileSync(pathname, content, { encoding: 'utf-8' });
              },
            },
            scaffold: this.scaffold,
          });
        }
      } catch (e) {
        this.log.error(e.message || e.toString());
      }
    }

    if (this.conflicts.length > 0) {
      this.log(
        'There ' +
        (this.conflicts.length === 1 ? 'is' : 'are') +
        ' still ' + this.conflicts.length +
        ' file' + (this.conflicts.length == 1 ? ' ' : 's ') +
        'contains several conflicts:'
      );
      this.conflicts.forEach((conflict) => {
        if (deletions.indexOf(conflict.pathname) === -1) {
          this.log(chalk.yellow(`\t- ${conflict.pathname}`));
        }
      });
    }
  }
}

export default DollieGeneratorBase;
