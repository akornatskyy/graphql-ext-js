# graphql-ext-js

[![tests](https://github.com/akornatskyy/graphql-ext-js/actions/workflows/tests.yml/badge.svg)](https://github.com/akornatskyy/graphql-ext-js/actions/workflows/tests.yml)
[![npm version](https://badge.fury.io/js/graphql-ext.svg)](https://www.npmjs.com/package/graphql-ext)

GraphQL extensions and toolkit for JS.

## Install

```sh
npm i graphql-ext
```

## Examples

See [examples](./examples).

### express

```js
const express = require('express');
const {graphql} = require('graphql-ext');
const {schema, rootValue} = require('./schema');

async function main() {
  const app = express();
  app.use(express.json());
  app.post(
    '/graphql',
    graphql({
      schema,
      rootValue,
      parseParams: async (req) => req.body,
      context: (req) => req.headers['x-user'],
    }),
  );
  app.listen(4000, () =>
    console.info('Running a GraphQL API at http://localhost:4000/graphql'),
  );
}

main();
```
