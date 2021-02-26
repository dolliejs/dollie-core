import { Change } from 'diff';
import { Question } from 'yeoman-generator';
import { Volume } from 'memfs';
import * as constants from './constants';
import _ from 'lodash';
import { Options as GotOptions } from 'got';
import * as fs from 'fs-extra';
const allConstants = _.omit(constants, ['default', 'CONFIG_OPTIONS']);

export type FileSystem = typeof fs;

export interface DiffChange extends Change {
  conflicted?: boolean;
  conflictGroup?: 'former' | 'current';
  lineNumber: number;
}

export interface PatchTableItem {
  changes: Array<DiffChange>;
  modifyLength: number;
}

export type PatchTable = Record<string, PatchTableItem>;
export type CacheTable = Record<string, Array<Array<DiffChange>>>;
export type BinaryTable = Record<string, string>;

export interface DollieBasicProps {
  name: string;
  scaffold: string;
}

export type DollieScaffoldProps = Record<string, string>;

export interface DollieScaffoldFileConfiguration {
  merge?: Array<string>;
  add?: Array<string>;
  delete?: Array<string>;
}

export interface DollieScaffoldConfiguration {
  questions: Array<Question<DollieScaffoldProps>>;
  installers?: Array<string>;
  endScripts?: Array<Function | string>;
  extendProps?: Array<string>;
  files?: DollieScaffoldFileConfiguration;
}

export interface ComposedDollieScaffold {
  scaffoldName: string;
  dependencies?: Array<ComposedDollieScaffold>;
  props?: DollieScaffoldProps;
}

export interface DollieScaffold {
  uuid: string;
  scaffoldName: string;
  dependencies: Array<DollieScaffold>;
  configuration?: DollieScaffoldConfiguration;
  props?: DollieScaffoldProps;
  parent?: DollieScaffold;
}

export type DollieScaffoldNameParser = (name: string) => ScaffoldRepoDescription;

export type FileAction = 'DIRECT' | 'MERGE' | 'NIL';

export interface MergeBlock {
  status: 'OK' | 'CONFLICT';
  values: {
    former: Array<string>,
    current: Array<string>,
  };
  ignored?: boolean;
}

export interface MergeResult {
  conflicts: boolean;
  blocks: Array<MergeBlock>;
  text: string;
}

export interface Conflict {
  pathname: string;
  blocks: Array<MergeBlock>;
}

export type ConflictSolveItem = Array<string> | string | 'current' | 'former' | 'all' | 'none' | 'skip';
export type ConflictSolveTable = Record<string, Array<ConflictSolveItem>>;
export type ComposedConflictKeepsTable = Record<
  string,
  Array<{ former?: Array<number | string>, current?: Array<number | string> } | string>
>;

export interface TraverseResultItem {
  pathname: string;
  entity: string;
  stat: 'file' | 'directory';
}

export type RepoOrigin = 'github' | 'gitlab' | 'bitbucket';

export interface ScaffoldRepoDescription {
  origin?: RepoOrigin;
  name: string;
  checkout: string;
  owner: string;
}

export type DollieMemoryFileSystem = typeof Volume.prototype;

interface DollieResponseData {
  conflicts?: Array<Conflict>;
  ignoredFiles?: Array<TraverseResultItem>;
}

export interface DollieContainerManifest extends DollieResponseData {
  files: Array<TraverseResultItem>;
  basePath: string;
}

export interface DollieContainerFinishCallback {
  onFinish?: (data: DollieContainerManifest) => void;
}

export type Constants = typeof allConstants;
export type ExportedConstants = typeof constants.default;

export type DollieAppConfigOptions = typeof constants.CONFIG_OPTIONS;

export interface DollieBaseAppConfig extends Partial<DollieAppConfigOptions> {
  plugins?: Array<string | Plugin>;
}

export interface DollieContainerAppConfig extends DollieBaseAppConfig {
  projectName?: string;
  scaffoldConfig?: ComposedDollieScaffold;
  outputPath?: string;
}

export type DollieInteractiveAppConfig = DollieBaseAppConfig;

export interface DollieComposeAppConfig extends DollieContainerAppConfig {
  conflictKeeps?: ConflictSolveTable;
}

export type DollieAppMode = 'interactive' | 'compose' | 'container';

export interface ScaffoldConfig {
  url: string;
  original: string;
  options: GotOptions;
}

export type ScaffoldOriginServiceGenerator = (
  description: ScaffoldRepoDescription,
) => Promise<{
  url: string,
  options?: GotOptions;
}>;

export interface PluginContext {
  scaffoldOrigins: Record<string, ScaffoldOriginServiceGenerator>;
}

export type PluginFunction = (context: PluginContext) => Partial<PluginContext>;
export interface Plugin {
  pathname: string,
  executor: PluginFunction,
}
