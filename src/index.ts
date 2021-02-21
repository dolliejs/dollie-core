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
  parseMergeBlocksToText,
  parseDiffToMergeBlocks,
  parseFileTextToMergeBlocks,
} from './utils/diff';
import { container, interactive, compose } from './dollie';
import log from './utils/log';
import { getGitIgnoredFiles } from './utils/ignore';
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
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_DEFAULT_OWNER,
} from './constants';

export {
  // runner functions
  compose,
  container,
  interactive,

  // functions
  checkConflictBlockCount,
  diff,
  getComposedArrayValue,
  getExtendedPropsFromParentScaffold,
  getGitIgnoredFiles,
  isPathnameInConfig,
  merge,
  parseComposeConfig,
  parseDiffToMergeBlocks,
  parseFilePathname,
  parseFileTextToMergeBlocks,
  parseMergeBlocksToText,
  parseRepoDescription,
  parseScaffoldName,
  parseExtendScaffoldName,
  solveConflicts,
  stringifyComposeConfig,

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
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_DEFAULT_OWNER,
};

export default {
  // runner functions
  compose,
  container,
  interactive,

  // functions
  checkConflictBlockCount,
  diff,
  getComposedArrayValue,
  getExtendedPropsFromParentScaffold,
  getGitIgnoredFiles,
  isPathnameInConfig,
  merge,
  parseComposeConfig,
  parseDiffToMergeBlocks,
  parseFilePathname,
  parseFileTextToMergeBlocks,
  parseMergeBlocksToText,
  parseRepoDescription,
  parseScaffoldName,
  parseExtendScaffoldName,
  solveConflicts,
  stringifyComposeConfig,

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

  // constants
  HOME_DIR,
  CACHE_DIR,
  TEMP_DIR,
  TRAVERSE_IGNORE_REGEXP,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  APP_SCAFFOLD_DEFAULT_OWNER,
};
