/**
 * @file src/generators/compose.ts
 * @author lenconda <i@lenconda.top>
 */

import path from 'path';
import { v4 as uuid } from 'uuid';
import readJson from '../utils/read-json';
import DollieGeneratorBase from './base';
import { DollieScaffold } from '../interfaces';

class DollieComposeGenerator extends DollieGeneratorBase {
  initializing() {
    super.initializing();
    const packageJson =
      readJson(path.resolve(__dirname, '../package.json')) || {};
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
    } else {
      const createScaffoldWithUuid = (scaffold: DollieScaffold): DollieScaffold => {
        const result: DollieScaffold = scaffold;
        result.uuid = uuid();
        if (scaffold.dependencies && Array.isArray(scaffold.dependencies)) {
          const dependencies = Array.from(result.dependencies);
          result.dependencies = [];
          for (const currentDependence of dependencies) {
            result.dependencies.push(createScaffoldWithUuid(currentDependence));
          }
        }
        return result;
      };
      this.scaffold = createScaffoldWithUuid(scaffold);
    }
  }
}

export default DollieComposeGenerator;
