const http = require('http');
const {schema, rootValue} = require('./schema');
// const {graphql} = require('graphql-ext');
const {graphql} = require('../dist');

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
