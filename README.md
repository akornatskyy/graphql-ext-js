# graphql-ext-js

[![tests](https://github.com/akornatskyy/graphql-ext-js/actions/workflows/tests.yml/badge.svg)](https://github.com/akornatskyy/graphql-ext-js/actions/workflows/tests.yml)

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

### http

```js
const http = require('http');
const {graphql} = require('graphql-ext');
const {schema, rootValue} = require('./schema');

async function main() {
  const handler = graphql({schema, rootValue});
  const server = http.createServer((req, res) => {
    if (req.url === '/graphql' && req.method === 'POST') {
      handler(req, res);
    } else {
      res.writeHead(404).end();
    }
  });
  server.listen(4000, () =>
    console.info('Running a GraphQL API at http://localhost:4000/graphql'),
  );
}

main();
```
