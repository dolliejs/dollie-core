import path from 'path';
import * as fs from 'fs-extra';
import { FileSystem, TraverseResultItem } from '../interfaces';
import { IgnoreMatcher } from './ignore';
import { Volume } from 'memfs/lib/volume';

/**
 * @param {string} startPath
 * @param {RegExp | IgnoreMatcher} matcher
 * @param {FileSystem | Volume} fileSystem
 * @param {boolean} ignoreMode
 * @returns {Promise<Array<TraverseResultItem>>}
 *
 * traverse a specified directory, and invoke callback when
 * current entity is a file and matches regexp
 */
const traverse = async (
  // start path, an absolute path is recommended
  startPath: string,
  // passed to match a file to invoke callback
  matcher: RegExp | IgnoreMatcher,
  fileSystem: FileSystem | Volume = fs,
  ignoreMode = true,
): Promise<Array<TraverseResultItem>> => {
  if (!matcher) { return []; }
  let result: Array<TraverseResultItem> = [];
  const absoluteStartPath = startPath || path.resolve();
  // all the entities for current path, including directories and files
  const currentEntities = fileSystem.readdirSync(absoluteStartPath, { encoding: 'utf8' });

  // traverse current-level entities, and do something
  for (const entity of currentEntities) {
    const currentEntityPath = path.resolve(absoluteStartPath, entity.toString());
    const stat = fileSystem.statSync(currentEntityPath);
    const matched = (
      (matcher instanceof RegExp && matcher.test(currentEntityPath)) ||
      (matcher instanceof IgnoreMatcher && matcher.shouldIgnore(currentEntityPath))
    );

    if ((matched && ignoreMode) || (!matched && !ignoreMode)) { continue; }

    if (stat.isFile()) {
      result.push({
        pathname: currentEntityPath,
        entity: entity.toString(),
        stat: 'file',
      });
    } else if (stat.isDirectory()) {
      /**
       * if it is a directory, then traverse its contained entities, its pathname
       * will be passed as startPath
       */
      result.push({
        pathname: currentEntityPath,
        entity: entity.toString(),
        stat: 'directory',
      });
      if (ignoreMode) {
        result = result.concat(await traverse(currentEntityPath, matcher, fileSystem));
      }
    }
  }

  return result;
};

export default traverse;
