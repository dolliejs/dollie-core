/**
 * @file src/generators/yeoman.ts
 * @author lenconda <i@lenconda.top>
 */

import { Questions } from 'yeoman-generator';
import { v4 as uuid } from 'uuid';
import { parseScaffoldName, solveConflicts } from '../utils/scaffold';
import { getComposedArrayValue, parseScaffolds } from '../utils/generator';
import DollieGeneratorBase from './base';
import { DollieScaffold, DollieScaffoldProps } from '../interfaces';
import { stringifyBlocks } from '../utils/diff';

class DollieInteractiveGenerator extends DollieGeneratorBase {
  initializing() {
    this.cliName = 'Dollie';
    super.initializing.call(this);
  }

  async prompting() {
    try {
      // default and essential questions
      // it is hard-coded in the generator, DO NOT MODIFY IT
      const defaultQuestions: Questions = [
        {
          type: 'input',
          name: 'name',
          message: 'Enter the project name',
          default: 'project',
        },
        {
          type: 'input',
          name: 'scaffold',
          message:
            'Enter the scaffold id',
          default: 'react',
        },
      ];

      // get props from user's input
      // eslint-disable-next-line prettier/prettier
      const props = await this.prompt(defaultQuestions) as DollieScaffoldProps;

      if (!props.name || !props.scaffold) {
        this.log.error('There are essential params lost');
      }

      this.projectName = props.name;
      const scaffold: DollieScaffold = {
        uuid: uuid(),
        scaffoldName: parseScaffoldName(props.scaffold),
        dependencies: [],
      };
      await parseScaffolds(scaffold, this);
      this.scaffold = scaffold;
    } catch (e) {
      this.log.error(e.message || e.toString());
      process.exit(1);
    }
  }

  default() {
    super.default.call(this);
  }

  async writing() {
    await super.writing.call(this);
    const deletions = getComposedArrayValue<string>(this.scaffold, 'files.delete');
    const conflicts = this.conflicts.filter(
      (conflict) => deletions.indexOf(conflict.pathname) === -1
    );
    this.conflicts = conflicts;
    if (conflicts.length === 0) { return; }

    const keepsTable: Record<string, Array<Array<string>>> = {};

    for (const conflict of conflicts) {
      if (!keepsTable[conflict.pathname]) {
        keepsTable[conflict.pathname] = [];
      }
      const conflictBlocks = conflict.blocks.filter((blocks) => blocks.status === 'CONFLICT');
      for (const [index, block] of conflictBlocks.entries()) {
        const { keeps } = (await this.prompt([
          {
            type: 'checkbox',
            name: 'keeps',
            message: `Solving conflicts in ${conflict.pathname} (${index + 1}/${conflictBlocks.length}):`,
            choices: ['former', 'current'].reduce((result, currentKey) => {
              const choices = (block.values[currentKey] as Array<string> || []).map((value, index) => {
                return {
                  name: `[${currentKey}] ${value.trim()}`,
                  value: `${currentKey}#${index}`,
                };
              });
              return result.concat(choices);
            }, []),
          },
        ])) as { keeps: Array<string> };
        keepsTable[conflict.pathname].push(keeps);
      }
    }

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

export default DollieInteractiveGenerator;
