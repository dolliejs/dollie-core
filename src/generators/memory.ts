/**
 * @file src/generators/memory.ts
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
import DollieBaseGenerator from '../base';
import { ArgInvalidError } from '../errors';

const handleFinish = (data: DollieWebResponseData, context: DollieBaseGenerator) => {
  const onFinishFunc = _.get(context, 'options.callbacks.onFinish');
  if (onFinishFunc && typeof onFinishFunc === 'function') {
    onFinishFunc(data);
  }
};

class DollieMemoryGenerator extends DollieComposeGenerator {
  public initializing() {
    this.mode = 'memory';
    this.appBasePath = path.resolve(HOME_DIR, CACHE_DIR);
    this.appTempPath = path.resolve(HOME_DIR, TEMP_DIR);
    this.volume = new Volume();
    this.volume.mkdirpSync(this.appBasePath);
    this.volume.mkdirpSync(this.appTempPath);
    const projectName = _.get(this, 'options.projectName') || '';
    if (!projectName) {
      throw new ArgInvalidError(['project_name']);
    }
    this.projectName = projectName;
  }

  public async default() {
    await super.default.call(this);
  }

  public async writing() {
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
  }

  public end() {
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
  }

  protected initLog(name?: string) {}
  protected getDestinationRoot() { return null; }
}

export default DollieMemoryGenerator;
