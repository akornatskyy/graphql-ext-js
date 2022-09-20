/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line unicorn/prefer-module
const {buildSchema} = require('graphql');

const schema = buildSchema(`
  type Query {
    hello: String
  }
`);

const rootValue = {
  hello: () => 'Hello world!',
};

// eslint-disable-next-line unicorn/prefer-module
module.exports = {schema, rootValue};
