#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseComposeConfig } = require('../src/utils/compose');
const { run } = require('../src/dollie');

async function test() {
  const type = process.argv[2];
  let config = {};

  if (type === 'compose') {
    const content = fs.readFileSync(path.resolve(__dirname, './test.yml'), {
      encoding: 'utf-8',
    });
    config = parseComposeConfig(content);
  }

  if (type === 'memory' || type === 'container') {
    config = {
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
  }

  try {
    const manifest = await run(type, config);
    if (manifest) {
      console.log(manifest);
    }
  } catch (e) {
    console.log(e.toString());
    process.exit(1);
  }
}

test();
