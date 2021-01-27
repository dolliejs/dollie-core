#!/usr/bin/env node

const Environment = require('yeoman-environment');
const InteractiveGenerator = require('../src/generators/interactive').default;
const ComposeGenerator = require('../src/generators/compose').default;

const type = process.argv[2];
const env = Environment.createEnv();

env.registerStub(InteractiveGenerator, 'dollie:interactive');
env.registerStub(ComposeGenerator, 'dollie:compose');

switch (type) {
  case 'interactive':
    env.run('dollie:interactive', null);
    break;
  case 'compose':
    env.run(
      'dollie:compose',
      {
        dollieScaffoldConfig: {
          scaffoldName: 'dolliejs/scaffold-test',
          props: { name: 'project', test: 'exit 0' },
          dependencies: [
            {
              scaffoldName: 'dolliejs/extend-scaffold-less',
              dependencies: [],
              props: { example: 'lenconda', test: 'jest' },
            },
          ],
        },
      },
      null
    );
    break;
  default:
    break;
}
