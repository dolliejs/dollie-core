import {
  parseScaffoldName,
  parseExtendScaffoldName,
  checkConflictBlockCount,
  solveConflicts,
  parseRepoDescription,
  parseUrl,
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
  parseMergeBlocksToText,
  parseDiffToMergeBlocks,
  parseFileTextToMergeBlocks,
} from './utils/diff';
import { container, interactive, compose } from './dollie';
import log from './utils/log';
import { downloadCompressedFile } from './utils/download';
import {
  IgnoreMatcher,
  GitIgnoreMatcher,
  getGitIgnoredFiles,
} from './utils/ignore';
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
  Plugin,
  PluginContext,
  PluginFunction,
  ScaffoldOriginServiceGenerator,
  ScaffoldRepoDescription,
  ScaffoldConfig,
  TraverseResultItem,
} from './interfaces';
import constants from './constants';

const {
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_AUTH_TOKEN,
  GITLAB_AUTH_TOKEN,
  GITLAB_URL,
  HOME_DIR,
  HTTP_PROXY,
  HTTP_PROXY_AUTH,
  SCAFFOLD_RETRIES,
  SCAFFOLD_TIMEOUT,
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
  downloadCompressedFile,
  getComposedArrayValue,
  getExtendedPropsFromParentScaffold,
  getGitIgnoredFiles,
  parseComposeConfig,
  parseDiffToMergeBlocks,
  parseExtendScaffoldName,
  parseFileTextToMergeBlocks,
  parseMergeBlocksToText,
  parseRepoDescription,
  parseScaffoldName,
  parseUrl,
  solveConflicts,
  stringifyComposeConfig,

  // objects
  log,

  // classes
  GitIgnoreMatcher,
  IgnoreMatcher,

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
  Plugin,
  PluginContext,
  PluginFunction,
  ScaffoldOriginServiceGenerator,
  ScaffoldRepoDescription,
  ScaffoldConfig,
  TraverseResultItem,

  // constants
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_AUTH_TOKEN,
  GITLAB_AUTH_TOKEN,
  GITLAB_URL,
  HOME_DIR,
  HTTP_PROXY,
  HTTP_PROXY_AUTH,
  SCAFFOLD_RETRIES,
  SCAFFOLD_TIMEOUT,
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
  downloadCompressedFile,
  getComposedArrayValue,
  getExtendedPropsFromParentScaffold,
  getGitIgnoredFiles,
  parseComposeConfig,
  parseDiffToMergeBlocks,
  parseExtendScaffoldName,
  parseFileTextToMergeBlocks,
  parseMergeBlocksToText,
  parseRepoDescription,
  parseScaffoldName,
  parseUrl,
  solveConflicts,
  stringifyComposeConfig,

  // objects
  log,

  // classes
  GitIgnoreMatcher,
  IgnoreMatcher,

  // errors
  ArgInvalidError,
  ComposeScaffoldConfigInvalidError,
  DestinationExistsError,
  DollieError,
  ModeInvalidError,
  ScaffoldNotFoundError,
  ScaffoldTimeoutError,

  // constants
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_AUTH_TOKEN,
  GITLAB_AUTH_TOKEN,
  GITLAB_URL,
  HOME_DIR,
  HTTP_PROXY,
  HTTP_PROXY_AUTH,
  SCAFFOLD_RETRIES,
  SCAFFOLD_TIMEOUT,
  TEMP_DIR,
  TEMPLATE_FILE_PREFIX,
  TRAVERSE_IGNORE_REGEXP,
};
