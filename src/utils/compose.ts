import YAML from 'yaml';
import { APP_COMPOSE_CONFIG_MAP } from '../constants';

/**
 * parse stringed yaml content and returns an object
 * @function
 * @param {string} content - compose config string
 * @param {object} keyMap - compose key map
 * @returns {object}
 */
const parseComposeConfig = (
  content: string,
  keyMap = APP_COMPOSE_CONFIG_MAP,
): Record<string, any> => {
  let resolvedContentString = content;
  for (const key of Object.keys(keyMap)) {
    resolvedContentString = resolvedContentString
      .split(`${key}:`)
      .join(`${keyMap[key]}:`);
  }
  return YAML.parse(resolvedContentString);
};

/**
 * stringify an object to yaml string
 * @function
 * @param {object} config - compose config items
 * @param {object} keyMap - compose key map
 * @returns {string}
 */
const stringifyComposeConfig = (
  config: Record<string, any>,
  keyMap = APP_COMPOSE_CONFIG_MAP,
): string => {
  let result = YAML.stringify(config);
  for (const key of Object.keys(keyMap)) {
    result = result.split(`${keyMap[key]}:`).join(`${key}:`);
  }
  return result;
};

export { parseComposeConfig, stringifyComposeConfig };
