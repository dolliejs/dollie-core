#!/usr/bin/env node

import Environment from 'yeoman-environment';
import DollieGenerator from '../generator';

const env = Environment.createEnv();
env.registerStub(DollieGenerator, 'dollie');
env.run('dollie', null);
