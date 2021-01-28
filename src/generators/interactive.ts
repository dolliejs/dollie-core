/**
 * @file src/generators/yeoman.ts
 * @author lenconda <i@lenconda.top>
 */

import { Questions } from 'yeoman-generator';
import { v4 as uuid } from 'uuid';
import { parseScaffoldName } from '../utils/scaffold';
import { parseScaffolds } from '../utils/generator';
import DollieGeneratorBase from './base';
import { DollieScaffold, DollieScaffoldProps } from '../interfaces';

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
          default: 'react-ts-sass',
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
  }

  install() {
    super.install.call(this);
  }

  end() {
    super.end.call(this);
  }
}

export default DollieInteractiveGenerator;
