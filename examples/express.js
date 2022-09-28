/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const {specifiedRules: rules} = require('graphql');
// const {graphql} = require('graphql-ext/http');
const {graphql} = require('../dist/http');
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

// eslint-disable-next-line unicorn/prefer-top-level-await
main();
