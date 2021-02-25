---
title: Dollie
hero:
  title: Dollie
  desc: 通过一系列工具加速工程创建与初始化的过程
  actions:
    - text: 用户文档
      link: /zh/guide
footer:
  遵循 MIT 开源协议
  <br />版权所有 © 2021 至今，Dollie.js 及其贡献者
  <br />由 [dumi](https://d.umijs.org) 提供支持
---

<div style="height: 20px;"></div>

# 安装

```bash
$ npm i @dollie/cli -g
```

# 使用

## 使用 CLI

在 Shell 中执行

```bash
$ dollie
```

或

```bash
$ dollie compose ./config.yml
```

## 使用 API

在项目中安装包含 Dollie API 的 NPM 依赖

```bash
$ npm i @dollie/core -S
```

引入依赖，并调用合适的 API 来运行 Dollie 的核心功能

```js
const dollie = require('@dollie/core');

async function app() {
	try {
		await dollie.interactive();
	} catch (e) {
		dollie.log(e.toString());
		process.exit(1);
	}
}

app();
```
