/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const {buildSchema, specifiedRules} = require('graphql');
const {graphql} = require('../dist/http');
const {inputValidationDirectiveRule} = require('../dist/validation');
const {range} = require('../dist/validation/rules');
const {CursorConnection} = require('../dist/relay');
const {addResolvers} = require('../dist/misc');

const schema = buildSchema(/* GraphQL */ `
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
`);

const items = Array.from({length: 20}).map((_, i) => i);
const cc = new CursorConnection('numbers:');
const resolvers = {
  Query: {
    numbers: (parent, args) => cc.fromArray(items, args),
  },
};
addResolvers(schema, resolvers);

/*
  {
    numbers(first: 5) {
      edges {
        cursor
        node
      }
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
      }
      totalCount
    }
  }
*/

function main() {
  const app = express();
  app.use(express.json());
  app.post(
    '/graphql',
    graphql({
      schema,
      rules: [
        ...specifiedRules,
        inputValidationDirectiveRule({
          entries: [['range', range]],
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
