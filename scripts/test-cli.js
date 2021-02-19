#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Environment = require('yeoman-environment');
const InteractiveGenerator = require('../src/generators/interactive').default;
const ComposeGenerator = require('../src/generators/compose').default;
const { parseComposeConfig } = require('../src/utils/compose');
const { memory, container } = require('../src/dollie');

async function test() {
  const type = process.argv[2];
  const env = Environment.createEnv();

  env.registerStub(InteractiveGenerator, 'dollie:interactive');
  env.registerStub(ComposeGenerator, 'dollie:compose');

  switch (type) {
    case 'interactive':
      try {
        await env.run('dollie:interactive', null);
      } catch (e) {
        console.log(e.toString());
        process.exit(1);
      }
      break;
    case 'compose': {
      try {
        const content = fs.readFileSync(path.resolve(__dirname, './test.yml'), {
          encoding: 'utf-8',
        });
        const config = parseComposeConfig(content);
        await env.run('dollie:compose', config, null);
      } catch (e) {
        console.log(e.toString());
        process.exit(1);
      }
      break;
    }
    case 'memory': {
      try {
        const config = {
          projectName: 'project',
          dollieScaffoldConfig: {
            scaffoldName: 'react',
            dependencies: [
              { scaffoldName: 'react-ts' },
              { scaffoldName: 'react-less' },
              { scaffoldName: 'react-dva' },
            ],
          },
        };
        const data = await memory(config);
        console.log(data);
      } catch (e) {
        console.log(e.toString());
      }
      break;
    }
    case 'container': {
      const config = {
        projectName: 'project',
        dollieScaffoldConfig: {
          scaffoldName: 'react',
          dependencies: [
            { scaffoldName: 'react-ts' },
            { scaffoldName: 'react-less' },
            { scaffoldName: 'react-dva' },
          ],
        },
      };
      const data = await container(config);
      console.log(data);
      break;
    }
    default:
      break;
  }
}

test();
