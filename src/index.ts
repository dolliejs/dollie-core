import downloadGitRepo from './utils/download';
import readJson from './utils/read-json';
import traverse from './utils/traverse';
import { parseScaffoldName, parseExtendScaffoldName } from './utils/scaffold';
import { getComposedArrayValue } from './utils/generator';
import { parseComposeConfig, stringifyComposeConfig } from './utils/compose';
import DollieInteractiveGenerator from './generators/interactive';
import DollieComposeGenerator from './generators/compose';
import {
  DollieScaffold,
  DollieScaffoldBaseProps,
  DollieScaffoldProps,
  DollieScaffoldConfiguration,
  DollieScaffoldNameParser,
} from './interfaces';
import {
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_NAMESPACE,
  APP_COMPOSE_CONFIG_MAP,
} from './constants';

export {
  // functions
  downloadGitRepo,
  readJson,
  traverse,
  parseScaffoldName,
  parseExtendScaffoldName,
  getComposedArrayValue,
  parseComposeConfig,
  stringifyComposeConfig,
  // classes
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  // interfaces and types
  DollieScaffoldConfiguration,
  DollieScaffoldProps,
  DollieScaffold,
  DollieScaffoldBaseProps,
  DollieScaffoldNameParser,
  // constants
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_NAMESPACE,
  APP_COMPOSE_CONFIG_MAP,
};

export default {
  downloadGitRepo,
  readJson,
  traverse,
  parseScaffoldName,
  parseExtendScaffoldName,
  getComposedArrayValue,
  parseComposeConfig,
  stringifyComposeConfig,
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_NAMESPACE,
  APP_COMPOSE_CONFIG_MAP,
};
