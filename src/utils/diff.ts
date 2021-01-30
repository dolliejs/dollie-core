import path from 'path';
import { diffLines, Change } from 'diff';
import _ from 'lodash';
import Generator from 'yeoman-generator';
import { DollieScaffold, FileAction } from '../interfaces';
import { isPathnameInConfig } from './scaffold';

const diff = (originalContent: string, newContent: string): Change[] => {
  const changes = diffLines(originalContent, newContent);
  const result = changes.reduce((result, currentItem) => {
    const lines = (currentItem.value.endsWith('\n')
      ? currentItem.value.slice(0, -1)
      : currentItem.value
    )
      .split('\n')
      .map((item) =>
        _.omit(
          {
            ...currentItem,
            value: `${item}\n`,
          },
          'count'
        )
      );
    return result.concat(lines);
  }, []);

  return result;
};

const merge = (currentChanges: Change[], newChanges: Change[]): Change[] => {
  const result = [];
  const removedQueue = currentChanges.filter((change) => change.removed);
  const addedQueue = currentChanges.filter((change) => change.added);
  if (removedQueue.length === 0 && addedQueue.length === 0) {
    return newChanges.filter((change) => !change.removed);
  }
  for (const newChange of newChanges) {
    if (newChange.removed) {
      if (addedQueue.length > 0 && newChange.value === addedQueue[0].value) {
        result.push(newChange);
        addedQueue.shift();
      }
    } else if (newChange.added) {
      if (
        removedQueue.length > 0 &&
        newChange.value !== removedQueue[0].value
      ) {
        result.push(newChange);
        removedQueue.shift();
      }
    } else {
      result.push(newChange);
    }
  }
  return result;
};

const checkFileAction = (
  scaffold: DollieScaffold,
  tempPath: string,
  destinationPath: string,
  relativePathname: string,
  fs: typeof Generator.prototype.fs
): FileAction => {
  const scaffoldFilesConfig =
    scaffold.configuration && scaffold.configuration.files;

  if (!scaffold.parent) {
    return 'DIRECT';
  }

  const absoluteDestPathname = path.resolve(destinationPath, relativePathname);
  const destFileExistence = fs.exists(absoluteDestPathname);
  const parentFileExistence = fs.exists(
    path.resolve(tempPath, scaffold.parent.uuid, relativePathname)
  );

  if (!scaffoldFilesConfig) {
    if (destFileExistence) {
      return 'DIRECT';
    } else {
      return 'NIL';
    }
  }

  const mergeConfig = _.get(scaffold.configuration, 'files.merge') || [];
  const addConfig = _.get(scaffold.configuration, 'files.add') || [];

  if (isPathnameInConfig(relativePathname, mergeConfig)) {
    return destFileExistence && parentFileExistence ? 'MERGE' : 'DIRECT';
  } else if (isPathnameInConfig(relativePathname, addConfig)) {
    return 'DIRECT';
  } else {
    return destFileExistence ? 'NIL' : 'DIRECT';
  }
};

export { diff, merge, checkFileAction };
