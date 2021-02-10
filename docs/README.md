---
title: Dollie
hero:
  title: Dollie
  desc: 📦 快速、通用的项目生成工具。
  actions:
    - text: 用户文档
      link: /zh/guide
footer: 遵循 MIT 开源协议 | 版权所有 © 2021<br />由 [dumi](https://d.umijs.org) 提供支持
---

<div style="height: 20px;"></div>

## 安装

```bash
$ npm i @dollie/core -S
# 或者
$ yarn add @dollie/core
```

## 使用

安装 `yeoman-environment` 依赖：

```bash
$ npm i yeoman-environment -S
# 或者
$ yarn add yeoman-environment
```

运行 Dollie Generator：

```ts
const { DollieInteractiveGenerator } = require('@dollie/core');
const Environment = require('yeoman-environment');

const env = Environment.createEnv();
env.registerStub(DollieInteractiveGenerator, 'dollie:interactive');
env.run('dollie:interactive', () => console.log('dollie generator started'));
```
