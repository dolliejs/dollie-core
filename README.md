# Dollie Core

![Shields Build Status](https://img.shields.io/circleci/build/github/dolliejs/dollie-core/master)
![Circle CI Build](https://circleci.com/gh/dolliejs/dollie-core.svg?style=svg)
![License](https://img.shields.io/github/license/dolliejs/dollie-core)
![GitHub Version](https://img.shields.io/github/package-json/v/dolliejs/dollie-core)

Dollie.js is a generator for generating everything, based on [Yeoman](http://yeoman.io). Dollie core is the essential components for Dollie.js.

## Usage

### CLI

#### Installation

```bash
npm i @dollie/cli -g
```

#### Run Dollie

```bash
# Interactive mode
dollie

# Compose mode
dollie compose ./config.yml
```

### Programmatic API

#### Installation

```bash
npm i @dollie/core -S
```

#### Set up Environment

```javascript
// by CommonJS
const dollie = require('@dollie/core').default;
// or by ES6
import dollie from '@dollie/core';

const app = async () => {
  try {
    await dollie.interactive();
  } catch (e) {
    log.error(e.toString());
    process.exit(1);
  }
};

app();
```

## License

- MIT © [Lenconda](https://lenconda.top) & [Dollie.js](https://github.com/dolliejs)
- BSD © [diff](https://github.com/kpdecker/jsdiff#license)
