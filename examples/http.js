/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('http');
const {specifiedRules: rules} = require('graphql');
const {schema, rootValue} = require('./schema');
// const {graphql} = require('graphql-ext');
const {graphql} = require('../dist');

async function main() {
  const handler = graphql({schema, rules, rootValue});
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

// eslint-disable-next-line unicorn/prefer-top-level-await
main();
