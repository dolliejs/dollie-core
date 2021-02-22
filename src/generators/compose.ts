/* eslint-disable @typescript-eslint/member-ordering */
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
import { parseMergeBlocksToText } from '../utils/diff';
import { ArgInvalidError, ComposeScaffoldConfigInvalidError } from '../errors';

class DollieComposeGenerator extends DollieBaseGenerator {
  public initializing() {
    this.mode = 'compose';
    super.initializing.call(this);
    const scaffold = _.get(this, 'options.dollieScaffoldConfig') as DollieScaffold;
    if (!scaffold) {
      throw new ComposeScaffoldConfigInvalidError();
    }
    const projectName = _.get(this, 'options.projectName') || '';
    this.projectName = projectName;
    if (!projectName) {
      throw new ArgInvalidError(['project_name']);
    }
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public async default() {
    super.default.call(this);
    const scaffold
      = _.get(this.options, this.constants.APP_COMPOSE_CONFIG_MAP.dollie_scaffold_config) as DollieScaffold;
    if (!scaffold.scaffoldName) {
      throw new ArgInvalidError(['scaffold_name']);
    }
    scaffold.scaffoldName
      = parseRepoDescription(parseScaffoldName(scaffold.scaffoldName)).original;
    const createDetailedScaffold = async (scaffold: DollieScaffold): Promise<DollieScaffold> => {
      const result: DollieScaffold = scaffold;
      result.uuid = uuid();
      await parseScaffolds(result, this, null, this.mode);
      return result;
    };
    this.scaffold = await createDetailedScaffold(scaffold);
  }

  public async writing() {
    await super.writing.call(this);
    if (this.conflicts.length === 0) { return; }

    /**
     * get keeps table from user's yaml config and parse it into the format that Dollie can understand
     */
    const composedKeepsTable =
      _.get(this.options, this.constants.APP_COMPOSE_CONFIG_MAP.conflict_keeps_table) as ComposedConflictKeepsTable || {};
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
      this.fs.write(file.pathname, parseMergeBlocksToText(file.blocks));
    }
  }

  public install() {
    super.install.call(this);
  }

  public end() {
    super.end.call(this);
  }
}

export default DollieComposeGenerator;
