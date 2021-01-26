#!/usr/bin/env node

const Environment = require('yeoman-environment');
const InteractiveGenerator = require('../src/generators/interactive').default;
const ComposeGenerator = require('../src/generators/compose').default;

const type = process.argv[2];
const env = Environment.createEnv();

env.registerStub(InteractiveGenerator, 'dollie:interactive');
env.registerStub(ComposeGenerator, 'dollie:compose');

if (type === 'interactive') {
  env.run('dollie:interactive', null);
}

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
          props: { name: 'project' },
          dependencies: [
            {
              scaffoldName: 'dolliejs/extend-scaffold-less',
              dependencies: [],
              props: { test: 'lenconda' },
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
