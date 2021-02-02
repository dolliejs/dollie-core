import downloadGitRepo from './utils/download';
import readJson from './utils/read-json';
import traverse from './utils/traverse';
import {
  parseScaffoldName,
  parseExtendScaffoldName,
  checkConflictBlockCount,
  solveConflicts,
} from './utils/scaffold';
import {
  getComposedArrayValue,
  getExtendedPropsFromParentScaffold,
} from './utils/generator';
import { parseComposeConfig, stringifyComposeConfig } from './utils/compose';
import { diff, merge, checkFileAction, stringifyBlocks } from './utils/diff';
import DollieInteractiveGenerator from './generators/interactive';
import DollieComposeGenerator from './generators/compose';
import {
  DollieScaffold,
  DollieScaffoldBaseProps,
  DollieScaffoldProps,
  DollieScaffoldConfiguration,
  DollieScaffoldNameParser,
  FileAction,
  MergeResult,
  MergeBlock,
  MergeConflictRecord,
  ConflictKeepsTable,
  ComposedConflictKeepsTable,
} from './interfaces';
import {
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  DEPENDENCY_KEY_REGEXP,
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
  getExtendedPropsFromParentScaffold,
  parseComposeConfig,
  stringifyComposeConfig,
  diff,
  merge,
  checkFileAction,
  stringifyBlocks,
  checkConflictBlockCount,
  solveConflicts,
  // classes
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  // interfaces and types
  DollieScaffoldConfiguration,
  DollieScaffoldProps,
  DollieScaffold,
  DollieScaffoldBaseProps,
  DollieScaffoldNameParser,
  MergeResult,
  MergeBlock,
  MergeConflictRecord,
  ConflictKeepsTable,
  ComposedConflictKeepsTable,
  FileAction,
  // constants
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  DEPENDENCY_KEY_REGEXP,
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
  getExtendedPropsFromParentScaffold,
  parseComposeConfig,
  stringifyComposeConfig,
  diff,
  merge,
  checkFileAction,
  stringifyBlocks,
  checkConflictBlockCount,
  solveConflicts,
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  DEPENDENCY_KEY_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_NAMESPACE,
  APP_COMPOSE_CONFIG_MAP,
};
