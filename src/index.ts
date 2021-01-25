import DollieGenerator from './generator';
import downloadGitRepo from './utils/download';
import readJson from './utils/read-json';
import traverse from './utils/traverse';
import { parseScaffoldName } from './utils/scaffold';
import { DollieScaffoldConfiguration, AppGeneratorAnswer } from './generator';

export {
  downloadGitRepo,
  readJson,
  traverse,
  parseScaffoldName as parseTemplateName,
  DollieGenerator,
  DollieScaffoldConfiguration,
  AppGeneratorAnswer,
};

export default {
  downloadGitRepo,
  readJson,
  traverse,
  parseTemplateName: parseScaffoldName,
  DollieGenerator,
};
