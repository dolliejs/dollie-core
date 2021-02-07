import { Change } from 'diff';
import { Question } from 'yeoman-generator';

export interface DiffChange extends Change {
  conflicted?: boolean;
  conflictGroup?: 'former' | 'current';
  conflictIgnored?: boolean;
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

export interface DollieScaffold {
  uuid: string;
  scaffoldName: string;
  dependencies: Array<DollieScaffold>;
  configuration?: DollieScaffoldConfiguration;
  props?: DollieScaffoldProps;
  parent?: DollieScaffold;
}

export type DollieScaffoldNameParser = (name: string) => string;

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

export type ConflictKeepsTable = Record<string, Array<Array<string>>>;
export type ComposedConflictKeepsTable = Record<
  string,
  Array<{ former?: Array<number | string>, current?: Array<number | string> }>
>;

export interface TraverseResultItem {
  pathname: string;
  entity: string;
}
