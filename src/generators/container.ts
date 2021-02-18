/**
 * @file src/generators/container.ts
 * @author lenconda <i@lenconda.top>
 */

import _ from 'lodash';
import path from 'path';
import { Volume } from 'memfs';
import { HOME_DIR, TEMP_DIR, CACHE_DIR } from '../constants';
import DollieComposeGenerator from './compose';
import { DollieContainerResponseData } from '../interfaces';
import DollieBaseGenerator from '../base';

const handleFinish = (data: DollieContainerResponseData, context: DollieBaseGenerator) => {
  const onFinishFunc = _.get(context, 'options.callbacks.onFinish');
  if (onFinishFunc && typeof onFinishFunc === 'function') {
    onFinishFunc(data);
  }
};

const handleError = (error: Error, context: DollieBaseGenerator) => {
  const onErrorFunc = _.get(context, 'options.callbacks.onError');
  if (onErrorFunc && typeof onErrorFunc === 'function') {
    onErrorFunc(error);
  }
};

class DollieContainerGenerator extends DollieComposeGenerator {
  public initializing() {
    this.cliName = 'Dollie Container';
    this.appBasePath = path.resolve(HOME_DIR, CACHE_DIR);
    this.appTempPath = path.resolve(HOME_DIR, TEMP_DIR);
    this.volume = new Volume();
    this.volume.mkdirpSync(this.appBasePath);
    this.volume.mkdirpSync(this.appTempPath);
    const projectName = _.get(this, 'options.projectName') || '';
    if (!projectName) {
      handleError(new Error('`projectName` must be specified'), this);
    }
    this.projectName = projectName;
  }

  public async default() {
    try {
      await super.default.call(this);
    } catch (e) {
      handleError(e, this);
    }
  }

  public async writing() {
    try {
      await DollieBaseGenerator.prototype.writing.call(this);
    } catch (e) {
      handleError(e, this);
    }
  }

  public install() {
    try {
      super.install.call(this);
    } catch (e) {
      handleError(e, this);
    }
  }

  public end() {
    try {
      super.end.call(this);
      handleFinish({
        files: Object.keys(this.cacheTable)
          .filter((pathname) => Boolean(this.cacheTable[pathname]))
          .map((pathname) => this.destinationPath(pathname)),
        conflicts: this.conflicts,
        basePath: this.destinationPath(),
      }, this);
    } catch (e) {
      handleError(e, this);
    }
  }
}

export default DollieContainerGenerator;
