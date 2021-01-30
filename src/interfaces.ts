import { Question } from 'yeoman-generator';

export interface DollieScaffoldBaseProps {
  name: string;
}

export interface DollieScaffoldProps extends DollieScaffoldBaseProps {
  name: string;
  scaffold: string;
  [key: string]: string;
}

export interface DollieScaffoldFileConfiguration {
  merge: Array<string>;
  add: Array<string>;
  delete?: Array<string>;
}

export interface DollieScaffoldConfiguration {
  questions: Array<Question<DollieScaffoldProps>>;
  installers?: string[];
  extends?: Record<string, string>;
  endScripts?: Array<string>;
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
