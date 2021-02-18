/**
 * @file src/generators/compose.ts
 * @author lenconda <i@lenconda.top>
 */

import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import DollieBaseGenerator from '../base';
import { DollieScaffold, ComposedConflictKeepsTable, ConflictSolveTable } from '../interfaces';
import { parseScaffolds } from '../utils/generator';
import { parseScaffoldName, solveConflicts, parseRepoDescription } from '../utils/scaffold';
import { APP_COMPOSE_CONFIG_MAP } from '../constants';
import { stringifyBlocks } from '../utils/diff';

class DollieComposeGenerator extends DollieBaseGenerator {
  public initializing() {
    this.cliName = 'Dollie Compose';
    super.initializing.call(this);
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

  public async default() {
    try {
      super.default.call(this);
      const scaffold
        = _.get(this.options, APP_COMPOSE_CONFIG_MAP.dollie_scaffold_config) as DollieScaffold;
      scaffold.scaffoldName
        = parseRepoDescription(parseScaffoldName(scaffold.scaffoldName)).original;
      const createDetailedScaffold = async (scaffold: DollieScaffold): Promise<DollieScaffold> => {
        const result: DollieScaffold = scaffold;
        result.uuid = uuid();
        await parseScaffolds(result, this, null, 'compose');
        return result;
      };
      this.scaffold = await createDetailedScaffold(scaffold);
    } catch (e) {
      if (this.cliName !== 'Dollie Compose') {
        throw e;
      } else {
        this.log.error(e.message || e.toString());
        process.exit(1);
      }
    }
  }

  public async writing() {
    try {
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
            if (typeof keep === 'string') {
              return keep;
            }
            return ['former', 'current'].reduce((keepsResult, currentKey) => {
              return keepsResult.concat(
                (keep[currentKey] as Array<string | number> || []).map((value) => `${currentKey}#${value}`),
              );
            }, []);
          });
          result[currentPathname] = (result[currentPathname] || []).concat(values);
          return result;
        }, {} as ConflictSolveTable);

      const solvedConflicts = solveConflicts(this.conflicts, keepsTable);
      this.conflicts = solvedConflicts.ignored || [];

      const files = [...solvedConflicts.result, ... solvedConflicts.ignored];
      for (const file of files) {
        this.fs.delete(file.pathname);
        this.fs.write(file.pathname, stringifyBlocks(file.blocks));
      }
    } catch (e) {
      if (this.cliName !== 'Dollie Compose') {
        throw e;
      } else {
        this.log.error(e.message || e.toString());
        process.exit(1);
      }
    }
  }

  public install() {
    try {
      super.install.call(this);
    } catch (e) {
      if (this.cliName !== 'Dollie Compose') {
        throw e;
      } else {
        this.log.error(e.message || e.toString());
        process.exit(1);
      }
    }
  }

  public end() {
    try {
      super.end.call(this);
    } catch (e) {
      if (this.cliName !== 'Dollie Compose') {
        throw e;
      } else {
        this.log.error(e.message || e.toString());
        process.exit(1);
      }
    }
  }
}

export default DollieComposeGenerator;
