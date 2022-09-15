const {buildSchema} = require('graphql');

const schema = buildSchema(`
  type Query {
    hello: String
  }
`);

const rootValue = {
  hello: () => 'Hello world!',
};

module.exports = {schema, rootValue};
