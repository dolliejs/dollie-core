#!/usr/bin/env node

const Environment = require('yeoman-environment');
const InteractiveGenerator = require('../src/generators/interactive').default;
const ComposeGenerator = require('../src/generators/compose').default;

const type = process.argv[2];
const env = Environment.createEnv();

env.registerStub(InteractiveGenerator, 'dollie:interactive');
env.registerStub(ComposeGenerator, 'dollie:compose');
env.run(`dollie:${type}`, null);
