import YAML from 'yaml';
import { APP_COMPOSE_CONFIG_MAP } from '../constants';

/**
 * parse stringified yaml content and returns an object
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
  // eslint-disable-next-line prettier/prettier
  const resolvedContent = YAML.parse(resolvedContentString);
  return resolvedContent;
};

/**
 * stringify an object to yaml string
 * @param config object
 * @returns string
 */
const stringifyComposeConfig = (config: Record<string, any>): string => {
  const stringifiedConfig = YAML.stringify(config);
  console.log(stringifiedConfig);
  let result = stringifiedConfig;
  for (const key of Object.keys(APP_COMPOSE_CONFIG_MAP)) {
    result = result.split(`${APP_COMPOSE_CONFIG_MAP[key]}:`).join(`${key}:`);
  }
  return result;
};

export { parseComposeConfig, stringifyComposeConfig };
