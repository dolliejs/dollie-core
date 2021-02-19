/**
 * @file src/generators/memory.ts
 * @author lenconda <i@lenconda.top>
 */

import _ from 'lodash';
import DollieComposeGenerator from './compose';
import { writeCacheTable, writeTempFiles } from '../utils/generator';
import { merge, parseDiffToMergeBlocks, parseMergeBlocksToText } from '../utils/diff';
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
    super.initializing.call(this);
    this.mode = 'memory';
    if (!this.projectName) {
      throw new ArgInvalidError(['projectName']);
    }
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
        const mergeBlocks = parseDiffToMergeBlocks(currentCachedFile[0]);
        this.fileTable[pathname] = {
          conflicts: false,
          blocks: mergeBlocks,
          text: parseMergeBlocksToText(mergeBlocks),
        };
      } else {
        let conflicts = false;
        const originalDiff = currentCachedFile[0];
        const diffs = currentCachedFile.slice(1);
        const mergeBlocks = parseDiffToMergeBlocks(merge(originalDiff, diffs));
        if (mergeBlocks.filter((block) => block.status === 'CONFLICT').length !== 0) {
          conflicts = true;
          this.conflicts.push({ pathname, blocks: mergeBlocks });
        }
        this.fileTable[pathname] = {
          conflicts,
          blocks: mergeBlocks,
          text: parseMergeBlocksToText(mergeBlocks),
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
