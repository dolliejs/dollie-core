import fs from 'fs-extra';

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
const readJson = (filePath: string): Record<string, any> => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  try {
    return JSON.parse(fileContent);
  } catch (e) {
    return null;
  }
};

export default readJson;
