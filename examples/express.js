const express = require('express');
// const {graphql} = require('graphql-ext');
const {graphql} = require('../dist');
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
