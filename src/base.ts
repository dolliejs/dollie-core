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
import Url from 'url';
import Generator, { GeneratorOptions } from 'yeoman-generator';
import figlet from 'figlet';
import fs from 'fs-extra';
import _ from 'lodash';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { Volume } from 'memfs';
import got, { Options as GotOptions } from 'got';
import {
  writeTempFiles,
  getComposedArrayValue,
  writeCacheTable,
  writeToDestinationPath,
} from './utils/generator';
import { readJson } from './utils/files';
import * as constants from './constants';
import {
  CacheTable,
  DollieScaffold,
  Conflict,
  DollieMemoryFileSystem,
  DollieAppMode,
  Constants,
  ExportedConstants,
  BinaryTable,
  PluginContext,
  Plugin,
  DollieAppConfigOptions,
} from './interfaces';
import { isPathnameInConfig, parseUrl } from './utils/scaffold';
import { DestinationExistsError, ModeInvalidError, ScaffoldNotFoundError } from './errors';
import { parseCamelToSnake } from './utils/format';
import { DollieError } from '.';

/**
 * @class
 */
class DollieBaseGenerator extends Generator {
  /**
   * the name of the project, decides write scaffold contents into which directory
   * @type {string}
   * @public
   */
  public projectName: string;
  /**
   * the absolute pathname for storing scaffold contents
   * it is a composed pathname with `HOME_DIR` and `CACHE_DIR`
   * @type {string}
   * @public
   */
  public appBasePath: string;
  /**
   * the absolute pathname for storing scaffold contents temporarily
   * it is a composed pathname with `HOME_DIR` and `TEMP_DIR`
   * @type {string}
   * @public
   */
  public appTempPath: string;
  /**
   * it is a `(string, string)` tuple, stores all the files content and its diffs
   * @type {CacheTable}
   * @public
   */
  public cacheTable: CacheTable = {};
  /**
   * table for storing binary files
   * @type {BinaryTable}
   * @public
   */
  public binaryTable: BinaryTable = {};
  /**
   * constants for runtime
   * @type {Constants}
   * @public
   */
  public constants: Constants = _.omit(constants, ['default', 'CONFIG_OPTIONS']);
  /**
   * store temp files into `memfs`
   * @type {DollieMemoryFileSystem}
   * @public
   */
  public volume: DollieMemoryFileSystem;
  /**
   * saves all the conflicts in this array.
   * when a file from destination dir is written by more than two scaffold,
   * there might become some conflicts. Dollie uses Myers diff and 3-merge algorithm
   * inspired by Git to save the conflict files during writing files
   * @type {Array<Conflict>}
   * @public
   */
  public conflicts: Array<Conflict> = [];
  /**
   * plugins
   * @type {PluginContext}
   * @public
   */
  public plugin: PluginContext = {
    scaffoldOrigins: {},
  };
  /**
   * the nested tree structure of all scaffolds used during one lifecycle
   * the main scaffold is on the top level, which is supposed to be unique
   * @type {DollieScaffold}
   * @protected
   */
  public scaffold: DollieScaffold;
  /**
   * the name to be shown as a prompt when CLI is initializing
   * @type {string}
   * @protected
   */
  protected cliName: string;
  /**
   * mode for dollie app
   * `interactive | compose | container`
   * @type {DollieAppMode}
   * @protected
   */
  protected mode: DollieAppMode;
  /**
   * keys of dependencies
   * @type {Array<string>}
   * @private
   */
  private dependencyKeys: Array<string> = [];

  public constructor(args: string | string[], options: GeneratorOptions) {
    super(args, options);
    const customConstantKeys = Object.keys(constants.CONFIG_OPTIONS) as Array<keyof DollieAppConfigOptions>;
    const rawCustomConstants = _.pick((_.get(this, 'options') || {}) as DollieAppConfigOptions, customConstantKeys);
    const customConstants = Object
      .keys(rawCustomConstants)
      .reduce((result, currentKey) => {
        result[parseCamelToSnake(currentKey).toUpperCase()] = rawCustomConstants[currentKey];
        return result;
      }, {}) as Partial<ExportedConstants>;
    this.constants = _.merge(this.constants, customConstants);
  }

  /**
   * create a unique dependency key and push to `this.dependencyKeys`
   * @returns {string}
   */
  public createDependencyKey(name?: string): string {
    const uuid = uuidv4();
    const randomString = Math.random().toString(32).slice(2);
    const key = `$dep_${uuid.split('-').join('')}_${randomString}${name && `:${name}` || ''}`;
    if (this.dependencyKeys.indexOf(key) === -1) {
      this.dependencyKeys.push(key);
      return key;
    } else {
      return this.createDependencyKey();
    }
  }

  /**
   * check if a key is in the `this.dependencyKeys` or not
   * @param {string} key
   * @returns {boolean}
   * @public
   */
  public isDependencyKeyRegistered(key: string): boolean {
    return this.dependencyKeys.indexOf(key) !== -1;
  }

  public initializing() {
    this.initLog();
    const { HOME_DIR, CACHE_DIR, TEMP_DIR } = this.constants;
    this.appBasePath = path.resolve(HOME_DIR, CACHE_DIR);
    this.appTempPath = path.resolve(HOME_DIR, TEMP_DIR);
    this.volume = new Volume();
    this.volume.mkdirpSync(this.appBasePath);
    this.volume.mkdirpSync(this.appTempPath);
    if (!this.mode) {
      throw new ModeInvalidError(this.mode);
    }
    this.log.info('Initializing plugin system...');
    this.plugin = {
      scaffoldOrigins: {
        github: async (description) => {
          const { GITHUB_AUTH_TOKEN, GITHUB_URL_SCHEMA } = this.constants;
          const options = GITHUB_AUTH_TOKEN ? {
            headers: {
              Authorization: `token ${GITHUB_AUTH_TOKEN}`,
            },
          } as GotOptions : {};
          return _.merge({
            url: parseUrl(GITHUB_URL_SCHEMA, description),
          }, { options });
        },
        gitlab: async (description) => {
          const { owner, name, checkout } = description;
          const { GITLAB_AUTH_TOKEN, GITLAB_URL_SCHEMA } = this.constants;
          const parsedUrl = Url.parse(GITLAB_URL_SCHEMA);
          const { protocol, host } = parsedUrl;
          const headers = GITLAB_AUTH_TOKEN ? {
            'Private-Token': GITLAB_AUTH_TOKEN,
          } : {};
          const res = await got(`${protocol}//${host}/api/v4/users/${owner}/projects`, {
            timeout: 10000,
            retry: 3,
            headers,
          });
          const projects = (JSON.parse(res.body || '[]') || []) as Array<Record<string, any>>;
          const targetProject = projects.filter((project) => project.path_with_namespace === `${owner}/${name}`)[0];
          if (!targetProject) {
            throw new ScaffoldNotFoundError();
          }
          return {
            url: parseUrl(GITLAB_URL_SCHEMA, { id: targetProject.id, checkout }),
            options: { headers },
          };
        },
      },
    };
    const customPluginPaths = (_.get(this, 'options.plugins') || []) as Array<string>;
    const defaultPluginContext = _.cloneDeep(this.plugin);
    for (const plugin of customPluginPaths) {
      const pluginPath = typeof plugin === 'string' ? plugin : (plugin as Plugin).pathname;
      const pluginFunc = typeof plugin === 'string'
        ? require(path.resolve(plugin))
        : (plugin as Plugin).executor;
      if (!_.isFunction(pluginFunc)) {
        throw new DollieError(`Plugin ${pluginPath} is not a valid plugin`);
      }
      this.log.info(`Loading plugin ${pluginPath}`);
      this.plugin = _.merge(this.plugin, pluginFunc.call(null, defaultPluginContext));
    }
  }

  public default() {
    const destinationPath = this.getDestinationRoot();

    if (destinationPath) {
      /**
       * set destination pathname with `this.projectName`
       * it is an alias to `path.resolve(process.cwd(), this.projectName)`
       */
      this.destinationRoot(destinationPath);
    }
  }

  public async writing() {
    this.log.info('Writing main scaffold...');
    /**
     * invoke `recursiveWrite` function to deal with scaffolds and write
     * scaffold contents into the destination directory
     */
    await writeTempFiles(this.scaffold, this);
    await writeCacheTable(this.scaffold, this);
    const deletions = await this.getDeletions();
    this.conflicts = this.getConflicts(deletions);
    this.deleteCachedFiles(deletions);
    writeToDestinationPath(this);
  }

  public install() {
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
    const installers = _.uniq(_.get(this.scaffold, 'configuration.installers') || []) as Array<string>;
    for (const installerName of installers) {
      const currentInstaller = installerMap[installerName.toLocaleLowerCase()];
      if (currentInstaller && typeof currentInstaller === 'function') {
        this.log.info(`Installing ${installerName.toUpperCase()} dependencies...`);
        currentInstaller.call(this);
      }
    }
  }

  public async end() {
    for (const binaryFileRelativePath of Object.keys(this.binaryTable)) {
      const binaryFileAbsolutePath = this.binaryTable[binaryFileRelativePath];
      if (binaryFileAbsolutePath) {
        this.volume
          .createReadStream(binaryFileAbsolutePath)
          .pipe(fs.createWriteStream(this.destinationPath(binaryFileRelativePath)));
      }
    }
    /**
     * if there are items in `config.endScripts` options, then we should traverse
     * there are two types for `config.endScripts` option: `string` and `Function`
     */
    const endScripts = (await getComposedArrayValue(this.scaffold, 'endScripts', { allowNonString: true })) || [];

    const execute = (cmd: string): string => {
      if (typeof cmd !== 'string') { return; }
      this.log(`Executing: ${cmd}`);
      return Buffer.from(execSync(cmd)).toString();
    };

    for (const endScript of endScripts) {
      /**
       * if current end script value is a string, Dollie will recognize it as a
       * normal shell command, and will invoke `child_process.execSync` to execute
       * this script as a command
       */
      if (typeof endScript === 'string') {
        this.log(execute(endScript));
      /**
       * if current end script value is a function, Dollie will considering reading
       * the code from it, and call it with `context`
       * `context` contains some file system utilities provided by Dollie
       */
      } else if (typeof endScript === 'function') {
        const endScriptSource = Function.prototype.toString.call(endScript);
        const endScriptFunc = new Function(`return ${endScriptSource}`).call(null);

        const result = endScriptFunc({
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
              this.conflicts = this.conflicts.filter((conflict) => conflict.pathname !== pathname);
              return fs.removeSync(pathname);
            },
            write: (pathname: string, content: string) => {
              return fs.writeFileSync(pathname, content, { encoding: 'utf-8' });
            },
          },
          scaffold: this.scaffold,
        });

        if (typeof result === 'string') {
          this.log(execute(result));
        }

        if (this.conflicts.length > 0) {
          this.log(
            'There ' +
            (this.conflicts.length === 1 ? 'is' : 'are') +
            ' still ' + this.conflicts.length +
            ' file' + (this.conflicts.length === 1 ? ' ' : 's ') +
            'contains several conflicts:',
          );
          this.conflicts.forEach((conflict) => {
            if (fs.existsSync(this.destinationPath(conflict.pathname))) {
              this.log(chalk.yellow(`\t- ${conflict.pathname}`));
            }
          });
        }
      }
    }
  }

  /**
   * traverse files in destination dir and get the deletion pathname
   * @returns {Array<string>}
   */
  protected async getDeletions(): Promise<Array<string>> {
    /**
     * if there are items in `config.files.delete` options, then we should traverse
     * it and remove the items
     */
    const deletionRegExps = await getComposedArrayValue(this.scaffold, 'files.delete') || [];
    return Object.keys(this.cacheTable).filter((pathname) => {
      return (isPathnameInConfig(pathname, deletionRegExps));
    });
  }

  /**
   * get the conflicts not in the `deletions`
   * @param {Array<string>} deletions - deletion regexps to be parsed
   * @returns {Array<Conflict>}
   */
  protected getConflicts(deletions: Array<string>): Array<Conflict> {
    return this.conflicts.filter(
      (conflict) => deletions.indexOf(conflict.pathname) === -1,
    );
  }

  /**
   * delete files from destination dir in mem-fs before committing
   * @param {Array<string>} deletions - the pathname for files to be deleted
   * @returns {void}
   * @public
   */
  protected deleteCachedFiles(deletions: Array<string>) {
    for (const deletion of deletions) {
      if (typeof deletion === 'string') {
        this.log.info(`Deleting scaffold item: ${deletion}`);
        this.cacheTable[deletion] = null;
      }
    }
  }

  protected initLog(name?: string) {
    this.log(figlet.textSync('DOLLIE'));
    const packageJson = readJson(path.resolve(__dirname, '../package.json')) || {};
    if (packageJson.version && packageJson.name) {
      this.log(`with ${packageJson.name}@${packageJson.version}\n`);
    }
  }

  protected getDestinationRoot() {
    const destinationRoot = path.resolve(this.projectName);
    if (fs.existsSync(destinationRoot)) {
      throw new DestinationExistsError(destinationRoot);
    }
    return destinationRoot;
  }
}

export default DollieBaseGenerator;
