#!/usr/bin/env node

const Environment = require('yeoman-environment');
const DollieGenerator = require('../src/generator').default;

const env = Environment.createEnv();
env.registerStub(DollieGenerator, 'dollie');
env.run('dollie', null);
