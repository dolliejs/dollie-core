# Dollie Core

![Shields Build Status](https://img.shields.io/circleci/build/github/dolliejs/dollie-core/master)
![Circle CI Build](https://circleci.com/gh/dolliejs/dollie-core.svg?style=svg)
![License](https://img.shields.io/github/license/dolliejs/dollie-core)
![GitHub Version](https://img.shields.io/github/package-json/v/dolliejs/dollie-core)

Dollie.js is a generator for generating everything, based on [Yeoman](http://yeoman.io). Dollie core is the essential components for Dollie.js.

## Installation

```bash
npm install -g @dollie/core
```

## Usage

```javascript
const dollie = require('@dollie/core');
```

### Dollie Generator

`@dollie/core` exposes generator configuration for Yeoman, you can install `yeoman-environment` and run this generator:

```bash
npm i yeoman-environment -S
```

```javascript
const { DollieGenerator } = require('@dollie/core');
const Environment = require('yeoman-environment');

const env = Environment.createEnv();
env.registerStub(DollieGenerator, 'dollie');
env.run('dollie', () => console.log('dollie generator started'));
```

see <https://github.com/dolliejs/dollie-cli#readme> for details.

## License

MIT © [Lenconda](https://lenconda.top) & [Dollie.js](https://github.com/dolliejs)
