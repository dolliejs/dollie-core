import { Change, diffLines } from 'diff';
import _ from 'lodash';
import {
  DollieScaffold,
  FileAction,
  MergeBlock,
  DiffChange,
  PatchTable,
  CacheTable,
} from '../interfaces';
import { isPathnameInConfig } from './scaffold';

/**
 * optimize diff algorithm and returns a more appropriate result
 * @param originalContent string
 * @param newContent string
 * @returns Change[]
 *
 * this function uses diff algorithm from Myers: http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 * we diff two blocks of text with lines, and split the values with single lines
 */
const diff = (originalContent: string, newContent: string): Array<Change> => {
  // return diffLines(originalContent, newContent);
  const changes = diffLines(originalContent, newContent);
  return changes.reduce((result, currentItem) => {
    const lines = (currentItem.value.endsWith('\n')
      ? currentItem.value.slice(0, -1)
      : currentItem.value
    )
      .split('\n')
      /**
       * remove `count` which means the total count of lines in each change
       * because each change will only be one line
       */
      .map((item) => _.omit({ ...currentItem, value: `${item}\n` }, 'count'));
    return result.concat(lines);
  }, []);
};

/**
 * merge two changes records into one
 * @param currentChanges Change[]
 * @param newChanges Change[]
 * @returns MergeResult
 *
 * `currentChanges` is the changes between original text and current text
 * `newChanges` is the changes between current text and new text
 *
 * since Dollie uses an technique (or algorithm) inspired by three-way merge
 * (http://www.cis.upenn.edu/~bcpierce/papers/diff3-short.pdf), there would be
 * three character in every diff:
 * - BASE: the content of last file write by `DIRECT` action, we call it as `original`
 * - THEIRS: the content of current file in the destination dir, we call it as `current`
 * - OURS: the content of new file to be written, we call it as `new`
 *
 * conflicts will be shown in result text.
 * @example
 * <<<<<<< former
 * current_file_content
 * =======
 * new_file_content
 * >>>>>>> current
 */
const merge = (
  originalDiff: Array<DiffChange>,
  diffs: Array<Array<DiffChange>>
): Array<DiffChange> => {
  if (!originalDiff) {
    return [];
  }

  if (!diffs || !Array.isArray(diffs) || diffs.length === 0) {
    return originalDiff;
  }

  const getIndex = (diff: Array<DiffChange>, start: number) => {
    return diff.findIndex((change, index) => {
      return (change.removed || change.added) && index >= start;
    });
  };

  const patchTable: PatchTable = {};

  for (const currentDiff of diffs) {
    let startLine = 0;
    let patchCount = 0;
    let patchIndex = getIndex(currentDiff, startLine);

    while (patchIndex !== -1) {
      startLine = patchIndex;

      if (!patchTable[patchIndex - patchCount]) {
        patchTable[patchIndex - patchCount] = {
          modifyLength: 1,
          changes: [],
        };
      } else {
        patchTable[patchIndex - patchCount].modifyLength += 1;
      }

      const patchTableItem = patchTable[patchIndex - patchCount];

      for (const change of currentDiff.slice(patchIndex)) {
        if (change.added || change.removed) {
          startLine += 1;
          patchCount += 1;
          patchTableItem.changes.push(change);
        } else {
          break;
        }
      }

      patchIndex = getIndex(currentDiff, startLine);
    }
  }

  for (const patchItemIndex of Object.keys(patchTable)) {
    const patchItem = patchTable[patchItemIndex];
    if (patchItem.modifyLength > 1) {
      for (const change of patchItem.changes) {
        const contrastChangeIndex = patchItem.changes.findIndex(
          (currentChange) => {
            return (
              (change.added && currentChange.removed) ||
              (change.removed && currentChange.added)
            );
          }
        );
        if (contrastChangeIndex !== -1) {
          patchItem.changes = patchItem.changes.map((change) => ({
            ...change,
            conflicted: true,
            conflictIgnored: false,
            conflictGroup: 'current',
          }));
          break;
        }
      }
    }
  }

  const lastPatchItemIndex = parseInt(_.last(Object.keys(patchTable)), 10);

  if (!lastPatchItemIndex) {
    return originalDiff;
  }

  const getOriginalDiffBlock = (
    previous: Array<DiffChange>,
    original: Array<DiffChange>
  ): Array<DiffChange> => {
    const result = Array.from(original);
    const removedChanges = previous.filter(
      (change) => change.removed && !change.conflicted
    );
    for (const removedChange of removedChanges) {
      const sameChangeIndexInResult = result.findIndex(
        (change) => change.value === removedChange.value
      );
      if (sameChangeIndexInResult !== -1) {
        result.splice(sameChangeIndexInResult, 1);
      }
    }
    return result;
  };

  return Object.keys(patchTable)
    .reduce((result, patchItemIndexString, index) => {
      const patchItem = patchTable[patchItemIndexString];
      const patchItemIndex = parseInt(patchItemIndexString, 10);
      const previousPatchItemIndex = parseInt(
        Object.keys(patchTable)[index - 1] || '-1',
        10
      );

      const originalChanges = getOriginalDiffBlock(
        patchItem.changes,
        originalDiff.slice(previousPatchItemIndex + 1, patchItemIndex + 1)
      );

      return result.concat(originalChanges).concat(patchItem.changes);
    }, [])
    .concat(
      getOriginalDiffBlock(
        patchTable[lastPatchItemIndex].changes,
        originalDiff.slice(lastPatchItemIndex + 1)
      )
    );
};

/**
 * parse file blocks with conflict flags
 * @param blocks Array<MergeBlock>
 * @returns string
 */
const stringifyBlocks = (blocks: Array<MergeBlock>): string => {
  return blocks.reduce((result, currentBlock) => {
    if (currentBlock.status === 'OK') {
      return `${result}${currentBlock.values.current.join('')}`;
    } else {
      return (
        result +
        '<<<<<<< former\n' +
        currentBlock.values.former.join('') +
        '=======\n' +
        currentBlock.values.current.join('') +
        '>>>>>>> current\n'
      );
    }
  }, '');
};

const parseDiff = (mergeResult: Array<DiffChange>): Array<MergeBlock> => {
  const mergeBlocks: Array<MergeBlock> = [];
  for (const line of mergeResult) {
    if (line.conflicted) {
      if (
        mergeBlocks.length === 0 ||
        _.last(mergeBlocks).status !== 'CONFLICT'
      ) {
        mergeBlocks.push({
          status: 'CONFLICT',
          values: {
            current: [],
            former: [],
          },
        });
      }
      const lastMergeBlock = _.last(mergeBlocks);
      lastMergeBlock.values[line.conflictGroup].push(line.value);
    } else {
      if (line.removed) {
        continue;
      }
      if (
        mergeBlocks.length === 0 ||
        _.last(mergeBlocks).status === 'CONFLICT'
      ) {
        mergeBlocks.push({
          status: 'OK',
          values: {
            former: [],
            current: [],
          },
        });
      }
      const lastMergeBlock = _.last(mergeBlocks);
      lastMergeBlock.values.current.push(line.value);
    }
  }
  return mergeBlocks;
};

/**
 * parse scaffold tree, temp files of each scaffold and user's scaffold configuration
 * and return an appropriate file action strategy
 * @param scaffold DollieScaffold
 * @param relativePathname string
 * @param cacheTable CacheTable
 *
 * @description `DIRECT` write file to destination pathname directory
 * @description `MERGE` merge current text from destination file and new text
 * @description `NIL` do nothing
 */
const checkFileAction = (
  scaffold: DollieScaffold,
  relativePathname: string,
  cacheTable: CacheTable
): FileAction => {
  const scaffoldFilesConfig =
    scaffold.configuration && scaffold.configuration.files;

  /**
   * if current scaffold does not have parent scaffold, which means it is the top-level scaffold
   * so we just return `DIRECT`
   */
  if (!scaffold.parent) {
    return 'DIRECT';
  }

  const cacheExistence = Boolean(cacheTable[relativePathname]);

  /**
   * if current scaffold has no configuration about how to deal with files, Dollie will consider
   * overwriting all the files from current scaffold's temp dir
   * so if the file exists in the destination dir, we should return `DIRECT`, otherwise, we should
   * return `NIL` instead
   */
  if (!scaffoldFilesConfig) {
    return cacheExistence ? 'DIRECT' : 'NIL';
  }

  const mergeConfig = _.get(scaffold.configuration, 'files.merge') || [];
  const addConfig = _.get(scaffold.configuration, 'files.add') || [];

  /**
   * if current file pathname matches `config.files.merge`, which means scaffold's author hope
   * comparing this file's content with destination file's
   * so if the file exists in destination dir, we should return `MERGE`, otherwise Dollie will
   * consider adding it, that means, returns `DIRECT`
   */
  if (isPathnameInConfig(relativePathname, mergeConfig)) {
    if (cacheExistence) {
      return 'MERGE';
    }
  }

  /**
   * if current file pathname matches `config.files.add`, which means scaffold's author hope
   * adding this file to destination dir
   * so Dollie will return `DIRECT` whether there is an existed file in destination dir or not
   */
  if (isPathnameInConfig(relativePathname, addConfig)) {
    return 'DIRECT';
  }

  /**
   * since Dollie uses a non-greedy strategy on adding new files, when current file pathname does
   * not matches any rules above, Dollie will consider overwriting destination file with new text,
   * however, if the file not exists in the destination dir, Dollie will return `NIL`
   */
  return cacheExistence ? 'DIRECT' : 'NIL';
};

export { diff, merge, checkFileAction, stringifyBlocks, parseDiff };
