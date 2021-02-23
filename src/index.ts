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
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
  DestinationExistsError,
  DollieError,
  ModeInvalidError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,
} from './errors';
import {
  CacheTable,
  ComposedConflictKeepsTable,
  Conflict,
  ConflictSolveItem,
  ConflictSolveTable,
  DiffChange,
  DollieScaffold,
  DollieScaffoldConfiguration,
  DollieScaffoldNameParser,
  DollieScaffoldProps,
  FileAction,
  MergeBlock,
  MergeResult,
  PatchTableItem,
  PatchTable,
  ScaffoldRepoDescription,
  ScaffoldRepoUrls,
  TraverseResultItem,
} from './interfaces';
import constants from './constants';

const {
  BITBUCKET_URL,
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_URL,
  GITLAB_URL,
  HOME_DIR,
  TEMP_DIR,
  TEMPLATE_FILE_PREFIX,
  TRAVERSE_IGNORE_REGEXP,
} = constants;

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
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
  DestinationExistsError,
  DollieError,
  ModeInvalidError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,

  // interfaces and types
  CacheTable,
  ComposedConflictKeepsTable,
  Conflict,
  ConflictSolveItem,
  ConflictSolveTable,
  DiffChange,
  DollieScaffold,
  DollieScaffoldConfiguration,
  DollieScaffoldNameParser,
  DollieScaffoldProps,
  FileAction,
  MergeBlock,
  MergeResult,
  PatchTableItem,
  PatchTable,
  ScaffoldRepoDescription,
  ScaffoldRepoUrls,
  TraverseResultItem,

  // constants
  BITBUCKET_URL,
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_URL,
  GITLAB_URL,
  HOME_DIR,
  TEMP_DIR,
  TEMPLATE_FILE_PREFIX,
  TRAVERSE_IGNORE_REGEXP,
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
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
  DestinationExistsError,
  DollieError,
  ModeInvalidError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,

  // constants
  BITBUCKET_URL,
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_URL,
  GITLAB_URL,
  HOME_DIR,
  TEMP_DIR,
  TEMPLATE_FILE_PREFIX,
  TRAVERSE_IGNORE_REGEXP,
};
