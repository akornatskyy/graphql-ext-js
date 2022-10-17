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
const {specifiedRules: rules} = require('graphql');
const {graphql} = require('graphql-ext/http');
const {schema, rootValue} = require('./schema');

function main() {
  const app = express();
  app.use(express.json());
  app.post(
    '/graphql',
    graphql({
      schema,
      rootValue,
      rules,
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

### validation

```graphql
directive @length(
  min: Int
  max: Int
  message: String
) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION

type Query {
  hello(name: String! @length(min: 2, max: 10)): String!
}
```

```js
const {specifiedRules} = require('graphql');
const {inputValidationDirectiveRule} = require('graphql-ext/validation');
const {length} = require('graphql-ext/validation/rules');

app.post(
  '/graphql',
  graphql({
    // ...
    rules: [
      ...specifiedRules,
      inputValidationDirectiveRule({
        entries: [['length', length]],
      }),
    ],
  }),
);
```

### relay

```graphql
directive @range(
  min: Int
  max: Int
  message: String
) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION

type Query {
  numbers(
    first: Int @range(min: 1, max: 15)
    after: String
    last: Int @range(min: 1, max: 15)
    before: String
  ): NumberConnection!
}

type NumberConnection {
  edges: [NumberEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type NumberEdge {
  cursor: String!
  node: Int!
}

type PageInfo {
  endCursor: String!
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String!
}
```

```js
const {CursorConnection} = require('graphql-ext/relay');
const {addResolvers} = require('graphql-ext/misc');

// ...
const items = Array.from({length: 20}).map((_, i) => i);
const cc = new CursorConnection('numbers:');
const resolvers = {
  Query: {
    numbers: (parent, args) => cc.fromArray(items, args),
  },
};
addResolvers(schema, resolvers);
```

offset paging:

```js
const service = {
  countNumbers: async () => items.length,
  listNumbers: async ({offset, limit}) => items.slice(offset, offset + limit),
};

const resolvers = {
  Query: {
    numbers: async (parent, args) => {
      const totalCount = await service.countNumbers();
      const [offset, limit] = cc.toOffsetPaging(args, totalCount);
      const items = await service.listNumbers({offset, limit});
      return cc.fromSlice(items, offset, totalCount);
    },
  },
};
```
