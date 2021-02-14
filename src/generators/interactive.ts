/**
 * @file src/generators/yeoman.ts
 * @author lenconda <i@lenconda.top>
 */

import { Questions } from 'yeoman-generator';
import { v4 as uuid } from 'uuid';
import { parseScaffoldName, solveConflicts, parseRepoDescription } from '../utils/scaffold';
import { parseScaffolds } from '../utils/generator';
import DollieGeneratorBase from './base';
import {
  ConflictSolveItem,
  ConflictSolveTable,
  DollieBasicProps,
  DollieScaffold,
  MergeBlock,
} from '../interfaces';
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
        scaffoldName: parseRepoDescription(parseScaffoldName(props.scaffold)).original,
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

    const keepsTable: ConflictSolveTable = {};

    for (const conflict of this.conflicts) {
      if (!keepsTable[conflict.pathname]) {
        keepsTable[conflict.pathname] = [];
      }
      const conflictBlocks = conflict.blocks.filter((blocks) => blocks.status === 'CONFLICT');

      const askForKeeps = async (
        block: MergeBlock,
        lineChoices: Array<{ name: 'string', value: 'string' }>,
      ): Promise<ConflictSolveItem>  => {
        const getTempResult = (keeps: string | Array<string>): string => {
          const former = Array.from(block.values.former);
          const current = Array.from(block.values.current);

          if (Array.isArray(keeps)) {
            return keeps.join('\n');
          }

          if (['all', 'former', 'current', 'none'].indexOf(keeps) !== -1) {
            switch (keeps) {
              case 'all':
                break;
              case 'former':
                current.splice(0);
                break;
              case 'current':
                former.splice(0);
                break;
              case 'none':
                former.splice(0);
                current.splice(0);
                break;
              default:
                break;
            }
            return former.concat(current).join('');
          }

          return keeps;
        };

        let currentOperation = '';
        let tempResult = '';
        let currentKeeps: string | Array<string> = '';

        if (!currentOperation) {
          const { conflictOperation } = (await this.prompt([
            {
              type: 'list',
              name: 'conflictOperation',
              message: 'Select an appropriate way to solve this conflict:',
              choices: [
                {
                  name: 'Keep all lines',
                  value: 'all',
                },
                {
                  name: 'Keep former lines',
                  value: 'former',
                },
                {
                  name: 'Keep current lines',
                  value: 'current',
                },
                {
                  name: 'Do not keep any line',
                  value: 'none',
                },
                {
                  name: 'Select manually',
                  value: 'select',
                },
                {
                  name: 'Edit manually',
                  value: 'edit',
                },
                {
                  name: 'Give up and skip this conflict',
                  value: 'skip',
                },
              ],
            },
          ]));

          currentOperation = conflictOperation;
        }

        if (currentOperation === 'skip') {
          return currentOperation;
        }

        if (['all', 'former', 'current', 'none'].indexOf(currentOperation) !== -1) {
          tempResult = getTempResult(currentOperation);
          currentKeeps = currentOperation;
        }

        if (currentOperation === 'select') {
          const { keeps } = (await this.prompt([
            {
              type: 'checkbox',
              name: 'keeps',
              message: 'Select the lines that should be kept:',
              choices: lineChoices,
            },
          ])) as { keeps: Array<string> };
          tempResult = lineChoices
            .filter((choice) => keeps.indexOf(choice.value) !== -1)
            .map((line) => line.name)
            .map((line) => {
              if (line.startsWith('[current] ')) {
                return line.slice(10);
              } else if (line.startsWith('[former] ')) {
                return line.slice(9);
              }
              return line;
            })
            .map((line) => `${line}\n`)
            .join('');
          currentKeeps = keeps;
        }

        if (currentOperation === 'edit') {
          const { content } = (await this.prompt([
            {
              type: 'editor',
              name: 'content',
              message: 'Edit conflicts with editor',
              default: block.values.former
                .concat(block.values.current)
                .map((value) => value.slice(0, -1))
                .join('\n'),
            },
          ])) as { content: string };
          tempResult = getTempResult(`${(content || '')}`);
          currentKeeps = tempResult;
        }

        const { confirmStatus } = (await this.prompt([
          {
            type: 'confirm',
            message: `\n${tempResult}\nis that the solved result of this conflict?`,
            name: 'confirmStatus',
          },
        ])) as { confirmStatus: boolean };

        if (!confirmStatus) {
          return await askForKeeps(block, lineChoices);
        } else {
          return currentKeeps;
        }
      };

      for (const [index, block] of conflictBlocks.entries()) {
        const lineChoices = ['former', 'current'].reduce((result, currentKey) => {
          const choices = (block.values[currentKey] as Array<string> || []).map((value, index) => {
            return {
              name: `[${currentKey}] ${value.slice(0, -1)}`,
              value: `${currentKey}#${index}`,
            };
          });
          return result.concat(choices);
        }, []);
        this.log(
          `Solving conflicts in ${conflict.pathname} (${index + 1}/${conflictBlocks.length}):\n` +
          `${lineChoices.map((choice) => choice.name).join('\n')}`,
        );
        const keeps = await askForKeeps(block, lineChoices);
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
