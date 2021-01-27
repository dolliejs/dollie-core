/**
 * @file src/generators/compose.ts
 * @author lenconda <i@lenconda.top>
 */

import path from 'path';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import readJson from '../utils/read-json';
import DollieGeneratorBase from './base';
import { DollieScaffold } from '../interfaces';
import { parseScaffolds } from '../utils/generator';
import { parseScaffoldName } from '../utils/scaffold';
import { APP_COMPOSE_CONFIG_MAP } from '../constants';

class DollieComposeGenerator extends DollieGeneratorBase {
  initializing() {
    super.initializing();
    const packageJson =
      readJson(path.resolve(__dirname, '../../package.json')) || {};
    if (packageJson.version && packageJson.name) {
      this.log(
        `Dollie Compose CLI with ${packageJson.name}@${packageJson.version}`
      );
    }

    // eslint-disable-next-line prettier/prettier
    const scaffold = (this.options && this.options.dollieScaffoldConfig as DollieScaffold) || undefined;
    if (!scaffold) {
      this.log.error('Cannot read configuration for Dollie Compose');
      process.exit(1);
    }
    const projectName = scaffold?.props?.name;
    if (!projectName) {
      this.log.error('A value of `string` must be assigned to `name`');
      process.exit(1);
    }
    this.projectName = projectName;
  }

  default() {
    super.default.call(this);
  }

  async writing() {
    // eslint-disable-next-line prettier/prettier
    const scaffold = _.get(this.options, APP_COMPOSE_CONFIG_MAP.dollie_scaffold_config) as DollieScaffold;
    scaffold.scaffoldName = parseScaffoldName(scaffold.scaffoldName);
    const createDetailedScaffold = async (scaffold: DollieScaffold): Promise<DollieScaffold> => {
      const result: DollieScaffold = scaffold;
      const currentUuid = uuid();
      result.uuid = currentUuid;
      await parseScaffolds(result, this, null, true);
      return result;
    };

    this.scaffold = await createDetailedScaffold(scaffold);

    await super.writing.call(this);
  }

  install() {
    super.install.call(this);
  }

  end() {
    super.end.call(this);
  }
}

export default DollieComposeGenerator;
