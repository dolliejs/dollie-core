#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Environment = require('yeoman-environment');
const InteractiveGenerator = require('../src/generators/interactive').default;
const ComposeGenerator = require('../src/generators/compose').default;
const WebGenerator = require('../src/generators/web').default;
const { parseComposeConfig } = require('../src/utils/compose');

const type = process.argv[2];
const env = Environment.createEnv();

env.registerStub(InteractiveGenerator, 'dollie:interactive');
env.registerStub(ComposeGenerator, 'dollie:compose');
env.registerStub(WebGenerator, 'dollie:web');

switch (type) {
  case 'interactive':
    env.run('dollie:interactive', null);
    break;
  case 'compose': {
    const content = fs.readFileSync(path.resolve(__dirname, './test.yml'), {
      encoding: 'utf-8',
    });
    const config = parseComposeConfig(content);
    env.run('dollie:compose', config, null);
    break;
  }
  case 'web': {
    const config = {
      projectName: 'project',
      dollieScaffoldConfig: {
        scaffoldName: 'react',
        dependencies: [
          { scaffoldName: 'react-ts' },
          { scaffoldName: 'react-less' },
          { scaffoldName: 'react-dva' },
        ],
      }
    };
    env.run('dollie:web', config, null);
    break;
  }
  default:
    break;
}
