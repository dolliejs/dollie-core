import path from 'path';
import { diffLines, Change } from 'diff';
import _ from 'lodash';
import Generator from 'yeoman-generator';
import { DollieScaffold, FileAction } from '../interfaces';
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
const merge = (currentChanges: Change[], newChanges: Change[]): Change[] => {
  /**
   * the final changes from the merge result
   * it is also in the type `Change[]`
   */
  const result: Change[] = [];
  const removedChangesList = currentChanges.filter((change) => change.removed);
  const addedChangesList = currentChanges.filter((change) => change.added);
  /**
   * if `removedChangesList` and `addedChangesList` are all empty, it means
   * there is no change been made between original text and current text, so
   * we just return the new changes without removed ones
   */
  if (removedChangesList.length === 0 && addedChangesList.length === 0) {
    return newChanges.filter((change) => !change.removed);
  }
  /**
   * traverse all changes in `newChanges`
   */
  for (const newChange of newChanges) {
    /**
     * for each removed change in `newChanges`
     * if there is a same value in `addedChangesList`, which means new text should not remove
     * current change
     * so we should push current change to `result`, no matter will be removed by new text
     * after pushing, we should delete it from `addedChangesList`
     */
    if (newChange.removed) {
      if (addedChangesList.length > 0) {
        const addedChangeIndex = addedChangesList.findIndex(
          (item) => item.value === newChange.value
        );
        if (addedChangeIndex !== -1) {
          result.push(newChange);
          addedChangesList.splice(addedChangeIndex, 1);
        }
      }
      /**
       * for each added change in `newChanges`
       * if there is not a same value in `removedChangesList`, which means current change is not
       * redundant, that is, this change should be applied to the result
       * so we should push it to `result`
       * if we find an item with the same value in `removedChangesList`, we should not push current
       * change to `result`, but delete the item from `removedChangesList`
       */
    } else if (newChange.added) {
      /**
       * if `removedChangesList` is empty, it means that all added changes from new text should
       * be applied to the result
       */
      if (removedChangesList.length === 0) {
        result.push(newChange);
      } else {
        const removedChangeIndex = removedChangesList.findIndex(
          (item) => item.value === newChange.value
        );
        if (removedChangeIndex === -1) {
          result.push(newChange);
        } else {
          removedChangesList.splice(removedChangeIndex, 1);
        }
      }
      /**
       * if current change has neither `removed` nor `added` flag, it means the change is the same
       * both in current text and new text
       * so we should push it to `result`
       */
    } else {
      result.push(newChange);
    }
  }
  return result;
};

/**
 * parse scaffold tree, temp files of each scaffold and user's scaffold configuration
 * and return an appropriate file action strategy
 * @param scaffold DollieScaffold
 * @param tempPath string
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
  tempPath: string,
  destinationPath: string,
  relativePathname: string,
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
  const parentFileExistence = fs.exists(
    path.resolve(tempPath, scaffold.parent.uuid, relativePathname)
  );

  /**
   * if current scaffold has no configuration about how to deal with files, Dollie will consider
   * overwriting all the files from current scaffold's temp dir
   * so if the file exists in the destination dir, we should return `DIRECT`, otherwise, we should
   * return `NIL` instead
   */
  if (!scaffoldFilesConfig) {
    if (destFileExistence) {
      return 'DIRECT';
    } else {
      return 'NIL';
    }
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
    return destFileExistence && parentFileExistence ? 'MERGE' : 'DIRECT';
  }

  /**
   * if current file pathname matches `config.files.add`, which means scaffold's author hope
   * adding this file to destination dir
   * so if the file exists in destination dir, Dollie will consider comparing with current text
   * which means returns `MERGE`, otherwise Dollie will consider adding it, that means, returns `DIRECT`
   */
  if (isPathnameInConfig(relativePathname, addConfig)) {
    return destFileExistence ? 'MERGE' : 'DIRECT';
  }

  /**
   * since Dollie uses a non-greedy strategy on adding new files, when current file pathname does
   * not matches any rules above, Dollie will consider overwriting destination file with new text,
   * however, if the file not exists in the destination dir, Dollie will return `NIL`
   */
  return destFileExistence ? 'DIRECT' : 'NIL';
};

export { diff, merge, checkFileAction };
