import { diffLines } from 'diff';
import _ from 'lodash';
import {
  DollieScaffold,
  FileAction,
  MergeBlock,
  DiffChange,
  PatchTable,
  CacheTable,
  DollieScaffoldFileConfiguration,
} from '../interfaces';
import { getComposedArrayValue } from './generator';
import { isPathnameInConfig } from './scaffold';

/**
 * optimize diff algorithm and returns a more appropriate result
 * @param {string} originalContent - the original content to be diffed
 * @param {string} newContent - the incoming content to diff
 * @returns {Array<Change>}
 *
 * this function uses diff algorithm from Myers: http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 * we diff two blocks of text with lines, and split the values with single lines
 */
const diff = (
  originalContent: string,
  newContent?: string,
): Array<DiffChange> => {
  const changes = diffLines(originalContent, newContent || originalContent);
  const splitChanges = changes.reduce((result, currentItem) => {
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
  const result: Array<DiffChange> = [];
  let lineNumber = 0;
  while (splitChanges.length !== 0) {
    const currentSplitChange = splitChanges.shift();
    if (!currentSplitChange.added) {
      result.push({ ...currentSplitChange, lineNumber: lineNumber++ });
    } else {
      result.push({ ...currentSplitChange, lineNumber: lineNumber - 1 });
    }
  }
  return result;
};

/**
 * merge two changes records into one
 * @param {Array<Change>} currentChanges
 * @param {Array<Change>} newChanges
 * @returns {MergeResult}
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
  original: Array<DiffChange>,
  diffs: Array<Array<DiffChange>>,
): Array<DiffChange> => {
  if (!original) {
    return [];
  }

  if (!diffs || !Array.isArray(diffs) || diffs.length === 0) {
    return original;
  }

  const originalDiff = Array.from(original);
  const patchTable: PatchTable = {};

  for (const currentDiff of diffs) {
    for (const change of currentDiff) {
      if (change.added) {
        if (!patchTable[change.lineNumber]) {
          patchTable[change.lineNumber] = {
            changes: [],
            modifyLength: 0,
          };
        }
        patchTable[change.lineNumber].changes.push(change);
      } else {
        if (change.removed) {
          originalDiff.splice(change.lineNumber, 1, change);
        }
      }
    }
    const addedChangeLineNumbers = currentDiff
      .filter((change) => change.added)
      .map((change) => change.lineNumber);

    for (const matchedLineNumber of _.uniq(addedChangeLineNumbers)) {
      patchTable[matchedLineNumber].modifyLength += 1;
    }
  }

  for (const patchIndex of Object.keys(patchTable)) {
    const currentPatchItem = patchTable[patchIndex];
    if (currentPatchItem.modifyLength > 1) {
      currentPatchItem.changes = currentPatchItem.changes.map((change) => ({
        ...change,
        conflicted: true,
        conflictGroup: 'current',
      }));
    }
  }

  const blocks: Array<Array<DiffChange>> = [];
  const patches = Object.keys(patchTable).map(
    (patchIndex) => patchTable[patchIndex],
  );

  const lineNumbers = Object.keys(patchTable).map((lineNumber) => {
    return parseInt(lineNumber, 10);
  });

  lineNumbers.unshift(-1);

  for (const [index, lineNumber] of lineNumbers.entries()) {
    const nextLineNumber = lineNumbers[index + 1];
    if (nextLineNumber === undefined) {
      blocks.push(originalDiff.slice(lineNumber + 1));
    } else {
      blocks.push(originalDiff.slice(lineNumber + 1, nextLineNumber + 1));
    }
  }

  return blocks.reduce((result, currentBlock) => {
    const currentPatchItem = patches.shift();
    if (!currentPatchItem) {
      return result.concat(currentBlock);
    }
    return result.concat(currentBlock).concat(currentPatchItem.changes);
  }, []);
};

/**
 * parse file blocks with conflict flags
 * @param {Array<MergeBlock>} blocks
 * @returns {string}
 */
const parseMergeBlocksToText = (blocks: Array<MergeBlock>): string => {
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

/**
 * parse a diff changes into merge blocks
 * @param {Array<DiffChange>} changes
 * @returns {Array<MergeBlock>}
 */
const parseDiffToMergeBlocks = (changes: Array<DiffChange>): Array<MergeBlock> => {
  const mergeBlocks: Array<MergeBlock> = [];
  for (const line of changes) {
    if (line.removed) {
      continue;
    }
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
 * parse a file text content to merge blocks
 * @param {string} content - file content
 * @returns {Array<MergeBlock>}
 */
const parseFileTextToMergeBlocks = (content: string): Array<MergeBlock> => {
  return parseDiffToMergeBlocks(diff(content));
};

/**
 * parse scaffold tree, temp files of each scaffold and user's scaffold configuration
 * and return an appropriate file action strategy
 * @param {DollieScaffold} currentScaffold - scaffold configuration tree
 * @param {string} relativePathname
 * @param {CacheTable} cacheTable
 *
 * @description `DIRECT` write file and replace content to cache table
 * @description `MERGE` push diff between current file and the original file content to cache table
 * @description `NIL` do nothing
 */
const checkFileAction = async (
  currentScaffold: DollieScaffold,
  scaffoldTree: DollieScaffold,
  relativePathname: string,
  cacheTable: CacheTable,
): Promise<FileAction> => {
  const scaffoldFilesConfig = _.get(currentScaffold, 'configuration.files') as DollieScaffoldFileConfiguration;

  /**
   * if current scaffold does not have parent scaffold, which means it is the top-level scaffold
   * so we just return `DIRECT`
   */
  if (!currentScaffold.parent) {
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

  const mergeConfig = _.get(currentScaffold, 'configuration.files.merge') || [];
  const addConfig = await getComposedArrayValue(currentScaffold, 'files.add', {
    recursively: false,
    scaffoldTree,
  });
  // console.log(scaffold.scaffoldName, addConfig);

  /**
   * if current file pathname matches `config.files.merge`, which means scaffold's author hope
   * comparing this file's content with destination file's
   * so if the file exists in destination dir, we should return `MERGE`
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

export {
  diff,
  merge,
  checkFileAction,
  parseMergeBlocksToText,
  parseDiffToMergeBlocks,
  parseFileTextToMergeBlocks,
};
