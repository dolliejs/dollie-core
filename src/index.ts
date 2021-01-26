import downloadGitRepo from './utils/download';
import readJson from './utils/read-json';
import traverse from './utils/traverse';
import { parseScaffoldName, parseExtendScaffoldName } from './utils/scaffold';
import { getInstallers } from './utils/generator';
import DollieInteractiveGenerator from './generators/interactive';
import DollieComposeGenerator from './generators/compose';
import {
  DollieScaffold,
  DollieScaffoldBaseProps,
  DollieScaffoldProps,
  DollieScaffoldConfiguration,
} from './interfaces';

export {
  // functions
  downloadGitRepo,
  readJson,
  traverse,
  parseScaffoldName,
  parseExtendScaffoldName,
  getInstallers,
  // classes
  DollieInteractiveGenerator,
  DollieComposeGenerator,
  // interfaces and types
  DollieScaffoldConfiguration,
  DollieScaffoldProps,
  DollieScaffold,
  DollieScaffoldBaseProps,
};

export default {
  downloadGitRepo,
  readJson,
  traverse,
  parseScaffoldName,
  parseExtendScaffoldName,
  getInstallers,
  DollieInteractiveGenerator,
  DollieComposeGenerator,
};
