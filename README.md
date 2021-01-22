# Dollie CLI

![Shields Build Status](https://img.shields.io/circleci/build/github/dolliejs/dollie-cli/master)
![Circle CI Build](https://circleci.com/gh/dolliejs/dollie-cli.svg?style=svg)
![License](https://img.shields.io/github/license/dolliejs/dollie-cli)
![GitHub Version](https://img.shields.io/github/package-json/v/dolliejs/dollie-cli)

Dollie.js is a generator for generating everything, based on [Yeoman](http://yeoman.io). Dollie CLI is the command line interface for Dollie.js.

## Installation

```bash
npm install -g @dollie/cli
```

and then it will create a binary link to `dollie`.

## Create Project

Just run:

```bash
dollie
```

then follow the prompt.

## Scaffolds

### Find a Template

Go to <https://github.com/dolliejs?tab=repositories&q=scaffold->, find an appropriate template, and get the name without `scaffold-` prefix, and input into the CLI interface.

### Create a Template

- Create all of the essential files for your scaffold
- Rename file starts with `__` when you want to get the props from CLI's prompt to inject into it. For example, if you want to make `package.json` as a customizable file, you should rename it as `__package.json`
- Create a file named `.dollie.json`, put your questions in the `questions` param
- Contact [i@lenconda.top](mailto:i@lenconda.top), then we will fork your GitHub repository into our organization

### `.dollie.json`

`.dollie.json` is the configuration file for Dollie.js, the configuration params are shown as below:

#### `questions`

It will be used by CLI's prompt. You can get the format schema from <https://github.com/SBoudrias/Inquirer.js/#documentation>

example:

```json
{
  "questions": [
    {
      "type": "input",
      "name": "key1",
      "message": "Enter the key1"
    },
    {
      "type": "input",
      "name": "key2",
      "message": "Enter the key2"
    }
  ]
}
```

and Dollie CLI will get a data structure like:

```javascript
{ key1: 'xxx', key2: 'xxx' }
```

which will be used by Dollie CLI to inject the templates starts with `__` in your scaffold.

## License

MIT © [Lenconda](https://lenconda.top) & [Dollie.js](https://github.com/dolliejs)
