import downloadGitRepo from './utils/download';
import readJson from './utils/read-json';
import traverse from './utils/traverse';
import {
  parseScaffoldName,
  parseExtendScaffoldName,
  checkConflictBlockCount,
  solveConflicts,
  parseRepoDescription,
  parseFilePathname,
  isPathnameInConfig,
} from './utils/scaffold';
import {
  getComposedArrayValue,
  getExtendedPropsFromParentScaffold,
} from './utils/generator';
import {
  parseComposeConfig,
  stringifyComposeConfig,
} from './utils/compose';
import {
  diff,
  merge,
  checkFileAction,
  parseMergeBlocksToText,
  parseDiffToMergeBlocks,
  parseFileTextToMergeBlocks,
} from './utils/diff';
import DollieInteractiveGenerator from './generators/interactive';
import DollieComposeGenerator from './generators/compose';
import { memory, container, run } from './dollie';
import log from './utils/log';
import {
  DollieError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,
  ModeInvalidError,
  DestinationExistsError,
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
} from './errors';
import {
  DiffChange,
  PatchTableItem,
  PatchTable,
  CacheTable,
  ConflictSolveItem,
  ConflictSolveTable,
  TraverseResultItem,
  DollieScaffold,
  DollieScaffoldProps,
  DollieScaffoldConfiguration,
  DollieScaffoldNameParser,
  FileAction,
  MergeResult,
  MergeBlock,
  Conflict,
  ComposedConflictKeepsTable,
} from './interfaces';
import {
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_DEFAULT_OWNER,
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
  checkConflictBlockCount,
  solveConflicts,
  parseRepoDescription,
  parseFilePathname,
  isPathnameInConfig,
  parseFileTextToMergeBlocks,
  parseDiffToMergeBlocks,
  parseMergeBlocksToText,
  container,
  memory,
  run,
  // objects
  log,
  // errors
  DollieError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,
  ModeInvalidError,
  DestinationExistsError,
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
  // classes
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  // interfaces and types
  DiffChange,
  PatchTableItem,
  PatchTable,
  CacheTable,
  ConflictSolveItem,
  ConflictSolveTable,
  TraverseResultItem,
  DollieScaffoldConfiguration,
  DollieScaffoldProps,
  DollieScaffold,
  DollieScaffoldNameParser,
  MergeResult,
  MergeBlock,
  Conflict,
  ComposedConflictKeepsTable,
  FileAction,
  // constants
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_DEFAULT_OWNER,
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
  parseMergeBlocksToText,
  checkConflictBlockCount,
  solveConflicts,
  parseDiffToMergeBlocks,
  parseRepoDescription,
  parseFilePathname,
  isPathnameInConfig,
  parseFileTextToMergeBlocks,
  container,
  memory,
  run,
  log,
  DollieError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,
  ModeInvalidError,
  DestinationExistsError,
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  APP_NAME,
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_DEFAULT_OWNER,
  APP_COMPOSE_CONFIG_MAP,
};
