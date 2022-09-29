/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const {buildSchema, specifiedRules} = require('graphql');
// const {graphql} = require('graphql-ext/http');
const {graphql} = require('../dist/http');
// const {inputValidationDirectiveRule} = require('graphql-ext/validation');
const {inputValidationDirectiveRule} = require('../dist/validation');
// const {length} = require('graphql-ext/validation/rules');
const {length} = require('../dist/validation/rules');

const schema = buildSchema(`
  directive @length(
    min: Int
    max: Int
    message: String
  ) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION

  type Query {
    hello(name: String! @length(min: 2, max: 10)): String!
  }
`);

const rootValue = {
  hello: ({name}) => `Hello, ${name}!`,
};

/*
  {
    hello(name: "World")
  }
*/

function main() {
  const app = express();
  app.use(express.json());
  app.post(
    '/graphql',
    graphql({
      schema,
      rootValue,
      rules: [
        ...specifiedRules,
        inputValidationDirectiveRule({
          entries: [['length', length]],
        }),
      ],
      parseParams: async (req) => req.body,
    }),
  );
  app.listen(4000, () =>
    console.info('Running a GraphQL API at http://localhost:4000/graphql'),
  );
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main();
