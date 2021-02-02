/**
 * @file src/generators/yeoman.ts
 * @author lenconda <i@lenconda.top>
 */

import { Questions } from 'yeoman-generator';
import { v4 as uuid } from 'uuid';
import { checkConflictBlockCount, parseScaffoldName } from '../utils/scaffold';
import { getComposedArrayValue, parseScaffolds } from '../utils/generator';
import DollieGeneratorBase from './base';
import { DollieScaffold, DollieScaffoldProps, MergeBlock } from '../interfaces';
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

    while (
      this.conflicts.filter(
        (conflict) => checkConflictBlockCount(conflict.blocks) > 0
      ).length !== 0
    ) {
      const currentConflictFile = this.conflicts.shift();
      let conflictBlockIndex = 0;
      const currentBlocks = [];
      for (const block of currentConflictFile.blocks) {
        if (block.status === 'OK' || block.ignored) {
          currentBlocks.push(block);
          continue;
        }
        conflictBlockIndex += 1;
        const { keeps } = (await this.prompt([
          {
            type: 'checkbox',
            name: 'keeps',
            message: `Solving conflicts in ${currentConflictFile.pathname} [${conflictBlockIndex}]:`,
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
        if (keeps.length === 0) {
          block.ignored = true;
          currentBlocks.push(block);
        } else {
          const solvedBlock: MergeBlock = {
            status: 'OK',
            values: {
              former: [],
              current: keeps.reduce((result, currentKey) => {
                const [key, index] = currentKey.split('#');
                result.push(block.values[key][index]);
                return result;
              }, [] as Array<string>),
            },
          };
          currentBlocks.push(solvedBlock);
        }
      }
      currentConflictFile.blocks = currentBlocks;
      if (checkConflictBlockCount(currentBlocks) > 0) {
        this.conflicts.push(currentConflictFile);
      }
      this.fs.delete(currentConflictFile.pathname);
      this.fs.write(currentConflictFile.pathname, stringifyBlocks(currentBlocks));
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
