import path from 'path';
import { diffLines, Change } from 'diff';
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
  const result = changes.reduce((result, currentItem) => {
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

  return result;
};

/**
 * merge two changes records into one
 * @param currentChanges Change[]
 * @param newChanges Change[]
 * @returns Change[]
 *
 * `currentChanges` is the changes between original text and current text
 * `newChanges` is the changes between current text and new text
 */
const merge = (currentChanges: Change[], newChanges: Change[]): MergeResult => {
  const resultBlocks: Array<MergeBlock> = [];
  let conflicts = false;
  let parseStatus: 'CURRENT' | 'FORMER' | 'NIL' = 'NIL';
  const removedChangesList = currentChanges.filter((change) => change.removed);
  const addedChangesList = currentChanges.filter((change) => change.added);
  /**
   * if `removedChangesList` and `addedChangesList` are all empty, it means
   * there is no change been made between original text and current text, so
   * we just return the new changes without removed ones
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
    if (newChange.value === '<<<<<<< former\n') {
      parseStatus = 'FORMER';
      continue;
    } else if (newChange.value === '=======\n') {
      parseStatus = 'CURRENT';
      continue;
    } else if (newChange.value === '>>>>>>> current\n') {
      parseStatus = 'NIL';
      continue;
    }

    if (parseStatus === 'FORMER' || parseStatus === 'CURRENT') {
      if (lastResultBlock.status !== 'CONFLICT') {
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
        lastResultBlock.values[parseStatus.toLowerCase()].push(newChange.value);
      }
      continue;
    }

    if (newChange.removed) {
      if (addedChangesList.length > 0) {
        const addedChangeIndex = addedChangesList.findIndex(
          (item) => item.value === newChange.value
        );
        if (addedChangeIndex !== -1) {
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
            if (!lastResultBlock || lastResultBlock.status === 'CONFLICT') {
              const block: MergeBlock = {
                status: 'OK',
                values: {
                  former: [],
                  current: [newChange.value],
                },
              };
              resultBlocks.push(block);
            }
          }
          addedChangesList.splice(addedChangeIndex, 1);
        }
      }
    } else if (newChange.added) {
      if (!lastResultBlock || lastResultBlock.status === 'CONFLICT') {
        lastResultBlock.values.current.push(newChange.value);
        continue;
      }
      const removedChangeIndex = removedChangesList.findIndex(
        (item) => item.value === newChange.value
      );
      if (removedChangesList.length === 0 || removedChangeIndex === -1) {
        lastResultBlock.values.current.push(newChange.value);
      }
      if (removedChangeIndex !== -1) {
        removedChangesList.splice(removedChangeIndex, 1);
      }
    } else {
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

const stringifyBlocks = (blocks: Array<MergeBlock>): string => {
  const text = blocks.reduce((result, currentBlock) => {
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
  return text;
};

/**
 * parse scaffold tree, temp files of each scaffold and user's scaffold configuration
 * and return an appropriate file action strategy
 * @param scaffold DollieScaffold
 * @param destinationPath string
 * @param relativePathname string
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
   * so Dollie will return `DIRECT` wether there is an existed file in destination dir or not
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
