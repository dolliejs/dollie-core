import YAML from 'yaml';
import { APP_COMPOSE_CONFIG_MAP } from '../constants';

/**
 * parse stringed yaml content and returns an object
 * @param content string
 * @returns object
 */
const parseComposeConfig = (content: string): Record<string, any> => {
  let resolvedContentString = content;
  for (const key of Object.keys(APP_COMPOSE_CONFIG_MAP)) {
    resolvedContentString = resolvedContentString
      .split(`${key}:`)
      .join(`${APP_COMPOSE_CONFIG_MAP[key]}:`);
  }
  return YAML.parse(resolvedContentString);
};

/**
 * stringify an object to yaml string
 * @param config object
 * @returns string
 */
const stringifyComposeConfig = (config: Record<string, any>): string => {
  let result = YAML.stringify(config);
  for (const key of Object.keys(APP_COMPOSE_CONFIG_MAP)) {
    result = result.split(`${APP_COMPOSE_CONFIG_MAP[key]}:`).join(`${key}:`);
  }
  return result;
};

export { parseComposeConfig, stringifyComposeConfig };
