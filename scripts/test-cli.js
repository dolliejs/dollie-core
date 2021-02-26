#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseComposeConfig } = require('../src/utils/compose');
const dollie = require('../src/dollie');
const log = require('../src/utils/log').default;

async function test() {
  const type = process.argv[2];
  let config = {};

  if (type === 'compose') {
    const content = fs.readFileSync(path.resolve(__dirname, './test.yml'), {
      encoding: 'utf-8',
    });
    config = parseComposeConfig(content);
  }

  if (type === 'container') {
    config = {
      projectName: 'project',
      scaffoldConfig: {
        scaffoldName: 'react',
        dependencies: [
          { scaffoldName: 'react-ts' },
          { scaffoldName: 'react-less' },
          { scaffoldName: 'react-dva' },
        ],
      },
    };
  }

  try {
    switch (type) {
      case 'interactive': {
        await dollie.interactive();
        break;
      }
      case 'compose': {
        await dollie.compose(config);
        break;
      }
      case 'container': {
        const manifest = await dollie.container(config);
        console.log(manifest);
        break;
      }
      default: break;
    }
  } catch (e) {
    log.error(e.toString());
    process.exit(1);
  }
}

test();
