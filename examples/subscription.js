/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('http');
const {buildSchema, specifiedRules: rules} = require('graphql');
const {graphql} = require('../dist/http');
const {addResolvers} = require('../dist/misc');

const schema = buildSchema(/* GraphQL */ `
  type Query {
    hello: String
  }

  type Subscription {
    countdown(initial: Int! = 2): Int
  }
`);

const resolvers = {
  Query: {
    hello: () => 'hi',
  },
  Subscription: {
    countdown: {
      async subscribe(_, {initial}) {
        let i = initial;
        let timer;
        return {
          async next() {
            if (i < 0) {
              return {done: true};
            }

            await new Promise((resolve) => {
              timer = setTimeout(resolve, 1000);
            });
            return {value: i--};
          },
          async return() {
            clearTimeout(timer);
            return {done: true};
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        };
      },
      resolve(value) {
        return value;
      },
    },
  },
};
addResolvers(schema, resolvers);

function main() {
  const handler = graphql({schema, rules});
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

/*
curl -v 'http://localhost:4000/graphql' -H 'Content-Type: application/json' \
  --data-raw '{"query":"subscription {countdown}"}'

curl -v 'http://localhost:4000/graphql' -H 'Content-Type: application/json' \
  --data-raw '{"query":"subscription {countdown(initial:5)}"}'
*/

// eslint-disable-next-line unicorn/prefer-top-level-await
main();
