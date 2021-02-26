import YAML from 'yaml';
import _ from 'lodash';
import { parseCamelToSnake, parseSnakeToCamel } from './format';

const transformObjectKeys = (
  sourceObject: object,
  mode: 'cts' | 'stc',
  blacklist: Array<RegExp> = [],
  leadingPath = '',
) => {
  if (['cts', 'stc'].indexOf(mode) === -1) {
    return sourceObject;
  }

  const shouldIgnore = (pathname: string) => {
    for (const item of blacklist) {
      if (item instanceof RegExp && item.test(pathname)) {
        return true;
      }
    }
    return false;
  };

  return Object.keys(sourceObject).reduce((result, key) => {
    const currentPath = `${leadingPath}${key}`;
    const currentValue = sourceObject[key];
    const currentKey = mode === 'cts' ? parseCamelToSnake(key) : parseSnakeToCamel(key);
    if (shouldIgnore(currentPath)) {
      result[currentKey] = currentValue;
      return result;
    }
    if (_.isPlainObject(currentValue)) {
      result[currentKey] = transformObjectKeys(currentValue, mode, blacklist, `${currentPath}.`);
    } else if (_.isArray(currentValue)) {
      result[currentKey] = currentValue.map((value) => transformObjectKeys(value, mode, blacklist, `${currentPath}.`));
    } else {
      result[currentKey] = currentValue;
    }
    return result;
  }, {});
};

/**
 * parse stringed yaml content and returns an object
 * @function
 * @param {string} content - compose config string
 * @param {object} keyMap - compose key map
 * @returns {object}
 */
const parseComposeConfig = (content: string): Record<string, any> => {
  const parsedConfig = YAML.parse(content);
  return transformObjectKeys(parsedConfig, 'stc', [
    /^conflict_keeps$/,
    /scaffold_config.(.*).props/,
  ]);
};

/**
 * stringify an object to yaml string
 * @function
 * @param {object} config - compose config items
 * @param {object} keyMap - compose key map
 * @returns {string}
 */
const stringifyComposeConfig = (config: Record<string, any>): string => {
  const transformedConfig = transformObjectKeys(config, 'cts', [
    /^conflictKeeps$/,
    /^scaffoldConfig.(.*).props$/,
  ]);
  return YAML.stringify(transformedConfig);
};

export { parseComposeConfig, stringifyComposeConfig };
