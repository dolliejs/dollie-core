import { Question } from 'yeoman-generator';

export interface DollieScaffoldBaseProps {
  name: string;
}

export interface DollieScaffoldProps extends DollieScaffoldBaseProps {
  name: string;
  scaffold: string;
  [key: string]: string;
}

export interface DollieScaffoldConfiguration {
  questions: Array<Question<DollieScaffoldProps>>;
  installers?: string[];
  extends?: Record<string, string>;
  deletions?: Array<string>;
  endScripts?: Array<string>;
}

export interface DollieScaffold {
  uuid: string;
  scaffoldName: string;
  dependencies: Array<DollieScaffold>;
  configuration?: DollieScaffoldConfiguration;
  props?: DollieScaffoldProps;
}
