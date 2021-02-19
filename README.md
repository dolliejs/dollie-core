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
// by CommonJS
const dollie = require('@dollie/core').default;
// by ES6
import dollie from '@dollie/core';
```

### By Using Yeoman Generator

`@dollie/core` exposes generator configuration for Yeoman, you can install `yeoman-environment` and run this generator:


```javascript
const { DollieInteractiveGenerator } = require('@dollie/core');
const Environment = require('yeoman-environment');

const env = Environment.createEnv();
env.registerStub(DollieInteractiveGenerator, 'dollie:interactive');
env.run('dollie:interactive', () => console.log('dollie generator started'));
```

see <https://github.com/dolliejs/dollie-cli#readme> for details.

### By API functions

```js
const { run, log } = require('@dollie/core');

const app = async () => {
  try {
    await run('interactive');
  } catch (e) {
    log.error(e.toString());
    process.exit(1);
  }
};
```

## License

- MIT © [Lenconda](https://lenconda.top) & [Dollie.js](https://github.com/dolliejs)
- BSD © [diff](https://github.com/kpdecker/jsdiff#license)
