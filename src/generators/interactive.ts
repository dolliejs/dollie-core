/**
 * @file src/generators/yeoman.ts
 * @author lenconda <i@lenconda.top>
 */

import { Questions } from 'yeoman-generator';
import { v4 as uuid } from 'uuid';
import { parseScaffoldName, solveConflicts } from '../utils/scaffold';
import { parseScaffolds } from '../utils/generator';
import DollieGeneratorBase from './base';
import { ConflictKeepsTable, DollieBasicProps, DollieScaffold } from '../interfaces';
import { stringifyBlocks } from '../utils/diff';

class DollieInteractiveGenerator extends DollieGeneratorBase {
  public initializing() {
    this.cliName = 'Dollie';
    super.initializing.call(this);
  }

  public async prompting() {
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
      const props = await this.prompt(defaultQuestions) as DollieBasicProps;

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

  public default() {
    super.default.call(this);
  }

  public async writing() {
    await super.writing.call(this);

    if (this.conflicts.length === 0) { return; }

    const keepsTable: ConflictKeepsTable = {};

    for (const conflict of this.conflicts) {
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

  public install() {
    super.install.call(this);
  }

  public end() {
    super.end.call(this);
  }
}

export default DollieInteractiveGenerator;
