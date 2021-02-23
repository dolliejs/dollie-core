import fs from 'fs-extra';
import { DollieMemoryFileSystem, FileSystem } from '../interfaces';

/**
 * get json file content and returns as a JavaScript object
 * @param {string} filePath
 * @param {FileSystem | DollieMemoryFileSystem} fileSystem
 * @returns {object}
 *
 * @example
 * imagine a JSON file named `/tmp/file.json` with content:
 * ```
 * {
 *   "name": "lenconda",
 *   "hobbies": ["coding"]
 * }
 * ```
 * then the result from `readJson` will be:
 * ```
 * {name: 'lenconda', hobbies: ['coding']}
 * ```
 * however, if the file does not exist, the result from `readJson` will become `null`
 */
const readJson = (
  filePath: string,
  fileSystem: FileSystem | DollieMemoryFileSystem = fs,
): Record<string, any> => {
  if (!fileSystem.existsSync(filePath) || !fileSystem.statSync(filePath).isFile()) {
    return null;
  }
  const fileContentBuffer = fileSystem.readFileSync(filePath);
  try {
    return JSON.parse(fileContentBuffer.toString());
  } catch (e) {
    return null;
  }
};

export { readJson };
