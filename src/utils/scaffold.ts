import { DollieScaffoldNameParser } from '../interfaces';
import {
  APP_SCAFFOLD_NAMESPACE,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
} from '../constants';

/**
 * parse scaffold name and return a function as parser, which can return a string that
 * matches the pattern of Dollie scaffold's standard
 * @param scaffoldPrefix string
 * @param defaultNamespace string
 *
 * @example
 * ```
 * const parse = createParser('scaffold-', 'dolliejs');
 * parse('test'); -> dolliejs/scaffold-test
 * parse('lenconda/test') -> lenconda/scaffold-test
 * parse('lenconda/scaffold-test') -> lenconda/scaffold-test
 * ```
 */
const createParser = (
  scaffoldPrefix: string,
  defaultNamespace = APP_SCAFFOLD_NAMESPACE
): DollieScaffoldNameParser => {
  return (name: string) => {
    if (/\//.test(name)) {
      const templateNameChunks = name.split('/');
      return templateNameChunks.reduce((result, currentValue, currentIndex) => {
        return `${currentIndex !== 0 ? `${result}/` : result}${
          currentIndex === templateNameChunks.length - 1
            ? currentValue.startsWith(scaffoldPrefix)
              ? currentValue
              : `${scaffoldPrefix}${currentValue}`
            : currentValue
        }`.trim();
      }, '');
    } else {
      return name.startsWith(scaffoldPrefix)
        ? `${defaultNamespace}/${name}`
        : `${defaultNamespace}/${scaffoldPrefix}${name}`;
    }
  };
};

const parseScaffoldName = createParser(APP_SCAFFOLD_PREFIX);
const parseExtendScaffoldName = createParser(APP_EXTEND_SCAFFOLD_PREFIX);

/**
 * check if a pathname in config array or not
 * @param pathname string
 * @param configItems string
 */
const isPathnameInConfig = (
  pathname: string,
  configItems: Array<string>
): boolean => {
  for (const item of configItems) {
    if (item && new RegExp(item).test(pathname)) {
      return true;
    }
  }
  return false;
};

export { parseScaffoldName, parseExtendScaffoldName, isPathnameInConfig };
