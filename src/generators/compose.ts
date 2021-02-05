/**
 * @file src/generators/compose.ts
 * @author lenconda <i@lenconda.top>
 */

import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import DollieGeneratorBase from './base';
import { DollieScaffold, ComposedConflictKeepsTable, ConflictKeepsTable } from '../interfaces';
import { parseScaffolds } from '../utils/generator';
import { parseScaffoldName, solveConflicts } from '../utils/scaffold';
import { APP_COMPOSE_CONFIG_MAP } from '../constants';
import { stringifyBlocks } from '../utils/diff';

class DollieComposeGenerator extends DollieGeneratorBase {
  initializing() {
    this.cliName = 'Dollie Compose';
    super.initializing.call(this);
    // eslint-disable-next-line prettier/prettier
    const scaffold = _.get(this, 'options.dollieScaffoldConfig') as DollieScaffold;
    if (!scaffold) {
      this.log.error('Cannot read configuration for Dollie Compose');
      process.exit(1);
    }
    const projectName = _.get(this, 'options.projectName') || '';
    if (!projectName) {
      this.log.error('A value of `string` must be assigned to `name`');
      process.exit(1);
    }
    this.projectName = projectName;
  }

  async default() {
    super.default.call(this);

    // eslint-disable-next-line prettier/prettier
    const scaffold = _.get(this.options, APP_COMPOSE_CONFIG_MAP.dollie_scaffold_config) as DollieScaffold;
    scaffold.scaffoldName = parseScaffoldName(scaffold.scaffoldName);
    const createDetailedScaffold = async (scaffold: DollieScaffold): Promise<DollieScaffold> => {
      const result: DollieScaffold = scaffold;
      result.uuid = uuid();
      await parseScaffolds(result, this, null, true);
      return result;
    };

    this.scaffold = await createDetailedScaffold(scaffold);
  }

  async writing() {
    await super.writing.call(this);

    if (this.conflicts.length === 0) { return; }

    /**
     * get keeps table from user's yaml config and parse it into the format that Dollie can understand
     */
    const composedKeepsTable = _.get(this.options, APP_COMPOSE_CONFIG_MAP.conflict_keeps_table) as ComposedConflictKeepsTable || {};
    const keepsTable = Object
      .keys(composedKeepsTable)
      .reduce((result, currentPathname) => {
        const currentComposedKeepsList = composedKeepsTable[currentPathname];
        const values = currentComposedKeepsList.map((keep) => {
          return ['former', 'current'].reduce((keepsResult, currentKey) => {
            return keepsResult.concat(
              (keep[currentKey] as Array<string | number> || []).map((value) => `${currentKey}#${value}`)
            );
          }, []);
        });
        result[currentPathname] = (result[currentPathname] || []).concat(values);
        return result;
      }, {} as ConflictKeepsTable);

    const solvedConflicts = solveConflicts(this.conflicts, keepsTable);
    this.conflicts = solvedConflicts.ignored || [];

    const files = [...solvedConflicts.result, ... solvedConflicts.ignored];
    for (const file of files) {
      this.fs.delete(file.pathname);
      this.fs.write(file.pathname, stringifyBlocks(file.blocks));
    }
  }

  install() {
    super.install.call(this);
  }

  end() {
    super.end.call(this);
  }
}

export default DollieComposeGenerator;
