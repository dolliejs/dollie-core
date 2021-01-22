import fs from 'fs-extra';

/**
 * @author lenconda <i@lenconda.top>
 * get json file content and returns as a JavaScript object
 * @param filePath string
 * @returns Record<string, any>
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
