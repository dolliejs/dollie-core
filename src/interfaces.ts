import { Change } from 'diff';
import { Question } from 'yeoman-generator';
import { Volume } from 'memfs';

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
}

export type RepoOrigin = 'github' | 'gitlab' | 'bitbucket';

export interface ScaffoldRepoDescription {
  origin?: RepoOrigin;
  name: string;
  checkout: string;
  owner: string;
}

export type DollieMemoryFileSystem = typeof Volume.prototype;

export type FileTable = Record<string, MergeResult>;

export interface DollieWebResponseData {
  files: FileTable;
  conflicts?: Array<Conflict>;
  gitIgnoredFiles?: Array<string>;
}

export interface DollieAppCallbacks {
  onFinish?: (data: DollieWebResponseData) => void;
  onError?: (error: Error) => void;
}

export interface DollieAppConfig {
  projectName: string;
  dollieScaffoldConfig: ComposedDollieScaffold;
}
