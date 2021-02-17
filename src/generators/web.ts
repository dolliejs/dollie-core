/**
 * @file src/generators/web.ts
 * @author lenconda <i@lenconda.top>
 */

import _ from 'lodash';
import path from 'path';
import { Volume } from 'memfs';
import { HOME_DIR, TEMP_DIR, CACHE_DIR } from '../constants';
import DollieComposeGenerator from './compose';
import { writeCacheTable, writeTempFiles } from '../utils/generator';
import { merge, parseDiff, stringifyBlocks } from '../utils/diff';
import { DollieWebResponseData } from '../interfaces';
import DollieGeneratorBase from './base';

const handleFinish = (data: DollieWebResponseData, context: DollieGeneratorBase) => {
  const onFinishFunc = _.get(context, 'options.callbacks.onFinish');
  if (onFinishFunc && typeof onFinishFunc === 'function') {
    onFinishFunc(data);
  }
};

const handleError = (error: Error, context: DollieGeneratorBase) => {
  const onErrorFunc = _.get(context, 'options.callbacks.onError');
  if (onErrorFunc && typeof onErrorFunc === 'function') {
    onErrorFunc(error);
  }
};

class DollieWebGenerator extends DollieComposeGenerator {
  public initializing() {
    this.cliName = 'Dollie Web';
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
      await writeTempFiles(this.scaffold, this);
      await writeCacheTable(this.scaffold, this);
      const deletions = this.getDeletions();
      this.deleteCachedFiles(deletions);

      for (const pathname of Object.keys(this.cacheTable)) {
        if (!this.cacheTable[pathname]) { continue; }
        const currentCachedFile = this.cacheTable[pathname];
        if (currentCachedFile.length === 1) {
          const mergeBlocks = parseDiff(currentCachedFile[0]);
          this.fileTable[pathname] = {
            conflicts: false,
            blocks: mergeBlocks,
            text: stringifyBlocks(mergeBlocks),
          };
        } else {
          let conflicts = false;
          const originalDiff = currentCachedFile[0];
          const diffs = currentCachedFile.slice(1);
          const mergeBlocks = parseDiff(merge(originalDiff, diffs));
          if (mergeBlocks.filter((block) => block.status === 'CONFLICT').length !== 0) {
            conflicts = true;
            this.conflicts.push({ pathname, blocks: mergeBlocks });
          }
          this.fileTable[pathname] = {
            conflicts,
            blocks: mergeBlocks,
            text: stringifyBlocks(mergeBlocks),
          };
        }
      }

      this.conflicts = this.getConflicts(deletions);
    } catch (e) {
      handleError(e, this);
    }
  }

  public end() {
    try {
      super.end.call(this);
      handleFinish({
        files: Object.keys(this.fileTable).reduce((result, currentPathname) => {
          if (this.fileTable[currentPathname]) {
            result[currentPathname] = this.fileTable[currentPathname];
          }
          return result;
        }, {}),
        conflicts: this.conflicts,
      }, this);
    } catch (e) {
      handleError(e, this);
    }
  }
}

export default DollieWebGenerator;
