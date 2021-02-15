import fs from 'fs-extra';
import { DollieMemoryFileSystem } from '../interfaces';

/**
 * get json file content and returns as a JavaScript object
 * @param filePath string
 * @returns Record<string, any>
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
const readJson = (filePath: string, fileSystem?: DollieMemoryFileSystem): Record<string, any> => {
  const customFileSystem = fileSystem || fs;
  if (!customFileSystem.existsSync(filePath) || !customFileSystem.statSync(filePath).isFile()) {
    return null;
  }
  const fileContentBuffer = customFileSystem.readFileSync(filePath);
  try {
    return JSON.parse(fileContentBuffer.toString());
  } catch (e) {
    return null;
  }
};

export default readJson;
