import path from 'path';
import { Change, diffLines } from 'diff';
import _ from 'lodash';
import Generator from 'yeoman-generator';
import {
  DollieScaffold,
  FileAction,
  MergeBlock,
  MergeResult,
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
const diff = (originalContent: string, newContent: string): Change[] => {
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
const merge = (currentChanges: Change[], newChanges: Change[]): MergeResult => {
  const resultBlocks: Array<MergeBlock> = [];
  let conflicts = false;
  let parseStatus: 'CURRENT' | 'FORMER' | 'NIL' = 'NIL';
  const removedChangesList = currentChanges.filter((change) => change.removed);
  const addedChangesList = currentChanges.filter((change) => change.added);
  /**
   * if `removedChangesList` and `addedChangesList` are all empty, it means there is no change
   * been made between original text and current text, so we just return the value of new changes
   * without removed ones into one block, and push it into result
   */
  if (removedChangesList.length === 0 && addedChangesList.length === 0) {
    const block: MergeBlock = {
      status: 'OK',
      values: {
        former: [],
        current: newChanges
          .filter((change) => !change.removed)
          .map((change) => change.value),
      },
    };
    return {
      conflicts: false,
      blocks: [block],
      text: block.values.current.join(''),
    };
  }

  while (newChanges.length !== 0) {
    const lastResultBlock = resultBlocks[resultBlocks.length - 1];
    const newChange = newChanges.shift();
    /**
     * if `newChange` matches conflict flags, we should set the status to corresponding phrase
     */
    if (newChange.value === '<<<<<<< former\n') {
      parseStatus = 'FORMER';
      continue;
    } else if (newChange.value === '=======\n') {
      parseStatus = 'CURRENT';
      continue;
    } else if (newChange.value === '>>>>>>> current\n') {
      /**
       * if matches `>>>>>>> current\n`, it means we just finished traversing a conflict block, so
       * we should set the `parseStatus` to the normal value: `NIL`
       */
      parseStatus = 'NIL';
      continue;
    }

    if (parseStatus === 'FORMER' || parseStatus === 'CURRENT') {
      /**
       * if last block's status is not `CONFLICT`, Dollie will make a new block with status `CONFLICT`
       * and push current change value into the right array by `parseStatus`, e.g.
       * if `parseStatus` is `FORMER`, then Dollie pushes value to `values.former`
       */
      if (!lastResultBlock || lastResultBlock.status !== 'CONFLICT') {
        const block: MergeBlock = {
          status: 'CONFLICT',
          values: {
            former: [],
            current: [],
          },
        };
        block.values[parseStatus.toLocaleLowerCase()].push(newChange.value);
        resultBlocks.push(block);
      } else {
        /**
         * if last block's status is `CONFLICT`, Dollie will push the value directly into last block's
         * value group with `parseStatus`
         */
        lastResultBlock.values[parseStatus.toLowerCase()].push(newChange.value);
      }
      continue;
    }

    if (newChange.removed) {
      if (addedChangesList.length > 0) {
        /**
         * if a new change item is with `removed` attribute, we should find a change with `added`
         * attribute from `diff1`
         */
        const addedChangeIndex = addedChangesList.findIndex(
          (item) => item.value === newChange.value
        );
        if (addedChangeIndex !== -1) {
          /**
           * if we can find a valid item in `diff1`, and next change in `diff2` has `added` attribute,
           * it means that the scaffold want to remove current file's corresponding content and add new
           * content to it, which leads to an incoming conflict
           */
          if (newChanges[0].added) {
            conflicts = true;
            const block: MergeBlock = {
              status: 'CONFLICT',
              values: {
                former: [newChange.value],
                current: [],
              },
            };
            resultBlocks.push(block);
          } else {
            /**
             * if `diff2`'s last block has status `CONFLICT`, then create a new block with status `OK`
             */
            if (!lastResultBlock || lastResultBlock.status === 'CONFLICT') {
              const block: MergeBlock = {
                status: 'OK',
                values: {
                  former: [],
                  current: [newChange.value],
                },
              };
              resultBlocks.push(block);
            } else {
              lastResultBlock.values.current.push(newChange.value);
            }
          }
          /**
           * finally, remove the change from `diff1`'s added changes list, in order to avoid mismatch by
           * changes after current change
           */
          addedChangesList.splice(addedChangeIndex, 1);
        }
      }
    } else if (newChange.added) {
      /**
       * if there is not items in `resultBlocks`, Dollie will create a new block and push it into `resultBlocks`
       */
      if (!lastResultBlock) {
        const block: MergeBlock = {
          status: 'OK',
          values: {
            former: [],
            current: [newChange.value],
          },
        };
        resultBlocks.push(block);
        continue;
      }
      /**
       * if we can find a removed item in `diff1`'s removed changes, we should remove it from list
       */
      const removedChangeIndex = removedChangesList.findIndex(
        (item) => item.value === newChange.value
      );
      if (removedChangeIndex !== -1) {
        removedChangesList.splice(removedChangeIndex, 1);
      }
      /**
       * if last item of `resultBlocks` has status `CONFLICT`, Dollie will consider current change as a conflicted
       * one, so just push the value of current change to `values.current` of last item of blocks
       */
      if (lastResultBlock.status === 'CONFLICT') {
        lastResultBlock.values.current.push(newChange.value);
        continue;
      }
      /**
       * if not, just find a change with the same value from removed changes list of `diff1`, if there is not an
       * appropriate change, just push it into last item of `resultBlocks`
       */
      if (removedChangesList.length === 0 || removedChangeIndex === -1) {
        lastResultBlock.values.current.push(newChange.value);
      }
    } else {
      /**
       * if current change is a normal change, just add its value to last block item, however, if last block item
       * has status `CONFLICT` or does not exist, we should create a new block with status `OK` and push the value
       * of current change to its `values.current`
       */
      if (!lastResultBlock || lastResultBlock.status !== 'OK') {
        const block: MergeBlock = {
          status: 'OK',
          values: {
            former: [],
            current: [newChange.value],
          },
        };
        resultBlocks.push(block);
      } else {
        lastResultBlock.values.current.push(newChange.value);
      }
    }
  }

  return {
    conflicts,
    blocks: resultBlocks,
    text: stringifyBlocks(resultBlocks),
  };
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

/**
 * parse scaffold tree, temp files of each scaffold and user's scaffold configuration
 * and return an appropriate file action strategy
 * @param scaffold DollieScaffold
 * @param destinationPath string
 * @param relativePathname string
 * @param mergeTable Record<string, string>
 * @param fs typeof Generator.prototype.fs
 *
 * @description `DIRECT` write file to destination pathname directory
 * @description `MERGE` merge current text from destination file and new text
 * @description `NIL` do nothing
 */
const checkFileAction = (
  scaffold: DollieScaffold,
  destinationPath: string,
  relativePathname: string,
  mergeTable: Record<string, string>,
  fs: typeof Generator.prototype.fs
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

  const absoluteDestPathname = path.resolve(destinationPath, relativePathname);
  const destFileExistence = fs.exists(absoluteDestPathname);

  /**
   * if current scaffold has no configuration about how to deal with files, Dollie will consider
   * overwriting all the files from current scaffold's temp dir
   * so if the file exists in the destination dir, we should return `DIRECT`, otherwise, we should
   * return `NIL` instead
   */
  if (!scaffoldFilesConfig) {
    return destFileExistence ? 'DIRECT' : 'NIL';
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
    if (destFileExistence) {
      return mergeTable[relativePathname] ? 'MERGE' : 'DIRECT';
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
  return destFileExistence ? 'DIRECT' : 'NIL';
};

export { diff, merge, checkFileAction, stringifyBlocks };
