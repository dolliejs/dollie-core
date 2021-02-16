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
import { FileTable } from '../interfaces';

class DollieWebGenerator extends DollieComposeGenerator {
  public initializing() {
    this.appBasePath = path.resolve(HOME_DIR, CACHE_DIR);
    this.appTempPath = path.resolve(HOME_DIR, TEMP_DIR);
    this.volume = new Volume();
    this.volume.mkdirpSync(this.appBasePath);
    this.volume.mkdirpSync(this.appTempPath);
    const projectName = _.get(this, 'options.projectName') || '';
    if (!projectName) {
      this.log.error('A value of `string` must be assigned to `name`');
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

    const fileTable: FileTable = {};

    for (const pathname of Object.keys(this.cacheTable)) {
      if (!this.cacheTable[pathname]) { continue; }
      const currentCachedFile = this.cacheTable[pathname];
      if (currentCachedFile.length === 1) {
        const mergeBlocks = parseDiff(currentCachedFile[0]);
        fileTable[pathname] = {
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
        fileTable[pathname] = {
          conflicts,
          blocks: mergeBlocks,
          text: stringifyBlocks(mergeBlocks),
        };
      }
    }

    this.conflicts = this.getConflicts(deletions);
  }
}

export default DollieWebGenerator;
