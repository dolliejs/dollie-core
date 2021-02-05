import fs from 'fs-extra';
import path from 'path';

/**
 * @author lenconda <i@lenconda.top>
 * @param startPath string
 * @param callback Function
 * @param callbackReg Regexp
 *
 * traverse a specified directory, and invoke callback when
 * current entity is a file and matches regexp
 */
const traverse = async (
  // start path, an absolute path is recommended
  startPath: string,
  // a RegExp param, passed to match a file to invoke callback
  callbackReg: RegExp,
  // callback function
  // callback?: (pathname: string, entity?: string) => void
  lastResult?: { pathname: string, entity?: string }[]
): Promise<{ pathname: string, entity?: string }[]> => {
  let result = lastResult || [];
  // all the entities for current path, including directories and files
  const currentEntities = fs.readdirSync(startPath);

  // traverse current-level entities, and do something
  for (const entity of currentEntities) {
    const currentEntityPath = path.resolve(startPath, entity);
    const stat = fs.statSync(currentEntityPath);

    if (stat.isFile()) {
      // if current entity is a file and matches regexp, then invoke the callback
      if (
        callbackReg &&
        callbackReg instanceof RegExp &&
        !callbackReg.test(entity)
      ) {
        result.push({
          pathname: currentEntityPath,
          entity,
        });
      }
    } else if (stat.isDirectory()) {
      /**
       * if it is a directory, then traverse its contained entities, its pathname
       * will be passed as startPath
       */
      result = result.concat(await traverse(currentEntityPath, callbackReg));
    }
  }

  return result;
};

export default traverse;
