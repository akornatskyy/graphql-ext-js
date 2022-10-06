import {
  buildSchema,
  GraphQLFormattedError,
  parse,
  specifiedRules,
} from 'graphql';
import {inputValidationDirectiveRule} from '../';
import {validate, Variables} from '../../misc/validate';
import {items, range} from '../rules';

describe('input validation directive rule', () => {
  describe.each(['Int', 'Int!'])('query scalar %s', (t) => {
    const schema = `
      directive @range(max: Int) on ARGUMENT_DEFINITION
      type Query {
        test(input: ${t} @range(max: 10)): Int
      }
    `;

    const query = `
      query ($input: ${t}) {
        test(input: $input)
      }
    `;

    it('none', () => {
      const schema = `
        type Query {
          test(input: ${t}): Int
        }
      `;
      const errors = prepare(schema, query, {input: 100});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('unknown directive', () => {
      const schema = `
        directive @x on ARGUMENT_DEFINITION
        type Query {
          test(input: ${t} @x): Int
        }
      `;
      const errors = prepare(schema, query, {input: 100});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('pass', () => {
      const errors = prepare(schema, query, {input: 10});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('value undefined', () => {
      const errors = prepare(schema, query, {});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('fail', () => {
      const errors = prepare(schema, query, {input: 100});
      expect(errors).toMatchInlineSnapshot(`
        [
          {
            "extensions": {
              "args": {
                "max": 10,
              },
              "code": "EINVAL",
              "directive": "range",
            },
            "locations": [
              {
                "column": 14,
                "line": 4,
              },
            ],
            "message": "Exceeds maximum allowed value of 10.",
            "path": [
              "test",
              "input",
            ],
          },
        ]
      `);
    });
  });

  describe.each(['Object', 'Object!'])('query input %s', (t) => {
    const schema = `
      type Query {
        test(input: ${t}): Int
      }
      input Object {
        value: Int!
      }
    `;
    const query = `
      query ($input: ${t}) {
        test(input: $input)
      }
    `;

    it('none', () => {
      const errors = prepare(schema, query, {input: {value: 100}});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('value undefined', () => {
      const errors = prepare(schema, query, {});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });
  });

  it('query input nested object', () => {
    const schema = `
      type Query {
        test(input: Object!): Int
      }
      input Object {
        nested: Nested!
      }
      input Nested {
        value: Int!
      }
    `;
    const query = `
      query ($input: Object!) {
        test(input: $input)
      }
    `;
    const errors = prepare(schema, query, {input: {nested: {value: 100}}});
    expect(errors).toMatchInlineSnapshot(`[]`);
  });

  describe('multiple queries with arguments', () => {
    const schema = `
      directive @range(max: Int) on ARGUMENT_DEFINITION
      type Query {
        a(input: Int! @range(max: 10)): Int
        b(input: Int! @range(max: 5)): Int
      }
    `;
    const query = `
      query ($input: Int!) {
        a(input: $input)
        b(input: $input)
      }
    `;
    it('pass', () => {
      const errors = prepare(schema, query, {input: 0});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('value undefined', () => {
      const errors = prepare(schema, query, {});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('fail some', () => {
      const errors = prepare(schema, query, {input: 7});
      expect(errors).toMatchInlineSnapshot(`
        [
          {
            "extensions": {
              "args": {
                "max": 5,
              },
              "code": "EINVAL",
              "directive": "range",
            },
            "locations": [
              {
                "column": 11,
                "line": 5,
              },
            ],
            "message": "Exceeds maximum allowed value of 5.",
            "path": [
              "b",
              "input",
            ],
          },
        ]
      `);
    });

    it('fail all', () => {
      const errors = prepare(schema, query, {input: 20});
      expect(errors).toMatchInlineSnapshot(`
        [
          {
            "extensions": {
              "args": {
                "max": 10,
              },
              "code": "EINVAL",
              "directive": "range",
            },
            "locations": [
              {
                "column": 11,
                "line": 4,
              },
            ],
            "message": "Exceeds maximum allowed value of 10.",
            "path": [
              "a",
              "input",
            ],
          },
          {
            "extensions": {
              "args": {
                "max": 5,
              },
              "code": "EINVAL",
              "directive": "range",
            },
            "locations": [
              {
                "column": 11,
                "line": 5,
              },
            ],
            "message": "Exceeds maximum allowed value of 5.",
            "path": [
              "b",
              "input",
            ],
          },
        ]
      `);
    });
  });

  describe('multiple queries with object', () => {
    const schema = `
      directive @range(max: Int) on ARGUMENT_DEFINITION
      type Query {
        a: Object
        b(input: Int! @range(max: 5)): Int
      }
      type Object {
        value: Int
      }
    `;
    const query = `
      query ($input: Int!) {
        a {value}
        b(input: $input)
      }
    `;

    it('pass', () => {
      const errors = prepare(schema, query, {input: 0});
      expect(errors).toMatchInlineSnapshot(`[]`);
    });

    it('fail', () => {
      const errors = prepare(schema, query, {input: 10});
      expect(errors).toMatchInlineSnapshot(`
        [
          {
            "extensions": {
              "args": {
                "max": 5,
              },
              "code": "EINVAL",
              "directive": "range",
            },
            "locations": [
              {
                "column": 11,
                "line": 5,
              },
            ],
            "message": "Exceeds maximum allowed value of 5.",
            "path": [
              "b",
              "input",
            ],
          },
        ]
      `);
    });
  });

  describe.each(['[Int]', '[Int!]', '[Int]!', '[Int!]!'])(
    'query input list %s',
    (t) => {
      const schema = `
        directive @items(min: Int) on ARGUMENT_DEFINITION
        directive @range(max: Int) on ARGUMENT_DEFINITION
        type Query {
          test(input: ${t} @items(min: 2) @range(max: 10)): Int
        }
      `;
      const query = `
        query ($input: ${t}) {
          test(input: $input)
        }
      `;

      it('none', () => {
        const schema = `
          type Query {
            test(input: ${t}): Int
          }
        `;
        const errors = prepare(schema, query, {input: []});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('unknown', () => {
        const schema = `
          directive @x on ARGUMENT_DEFINITION
          type Query {
            test(input: ${t} @x): Int
          }
        `;
        const errors = prepare(schema, query, {input: []});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('pass', () => {
        const errors = prepare(schema, query, {input: [5, 10]});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('fail for list', () => {
        const errors = prepare(schema, query, {input: []});
        expect(errors).toMatchInlineSnapshot(`
          [
            {
              "extensions": {
                "args": {
                  "min": 2,
                },
                "code": "EINVAL",
                "directive": "items",
              },
              "locations": [
                {
                  "column": 16,
                  "line": 5,
                },
              ],
              "message": "Required to be a minimum of 2 items in length.",
              "path": [
                "test",
                "input",
              ],
            },
          ]
        `);
      });

      it('fail for first item', () => {
        const errors = prepare(schema, query, {input: [10, 100, 200]});
        expect(errors).toMatchInlineSnapshot(`
          [
            {
              "extensions": {
                "args": {
                  "max": 10,
                },
                "code": "EINVAL",
                "directive": "range",
              },
              "locations": [
                {
                  "column": 16,
                  "line": 5,
                },
              ],
              "message": "Exceeds maximum allowed value of 10.",
              "path": [
                "test",
                "input",
                "1",
              ],
            },
          ]
        `);
      });
    },
  );

  describe.each(['[Int]', '[Int!]', '[Int]!', '[Int!]!'])(
    'query input list of primitives %s',
    (t) => {
      const schema = `
        directive @items(min: Int) on INPUT_FIELD_DEFINITION
        directive @range(max: Int) on INPUT_FIELD_DEFINITION
        type Query {
          test(input: Object): Int
        }
        input Object {
          value: ${t} @items(min: 2) @range(max: 10)
        }
      `;
      const query = `
        query ($input: Object) {
          test(input: $input)
        }
      `;

      it('none', () => {
        const schema = `
          type Query {
            test(input: Object): Int
          }
          input Object {
            value: ${t}
          }
        `;
        const errors = prepare(schema, query, {input: {value: [100]}});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('unknown', () => {
        const schema = `
          directive @x on INPUT_FIELD_DEFINITION
          type Query {
            test(input: Object): Int
          }
          input Object {
            value: ${t} @x
          }
        `;
        const errors = prepare(schema, query, {input: {value: [100]}});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('pass', () => {
        const errors = prepare(schema, query, {
          input: {value: [5, 10]},
        });
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('fail for list', () => {
        const errors = prepare(schema, query, {input: {value: [100]}});
        expect(errors).toMatchInlineSnapshot(`
          [
            {
              "extensions": {
                "args": {
                  "min": 2,
                },
                "code": "EINVAL",
                "directive": "items",
              },
              "locations": [
                {
                  "column": 11,
                  "line": 8,
                },
              ],
              "message": "Required to be a minimum of 2 items in length.",
              "path": [
                "test",
                "input",
                "value",
              ],
            },
          ]
        `);
      });

      it('fail for all items', () => {
        const errors = prepare(schema, query, {
          input: {value: [5, 100, 200]},
        });
        expect(errors).toMatchInlineSnapshot(`
          [
            {
              "extensions": {
                "args": {
                  "max": 10,
                },
                "code": "EINVAL",
                "directive": "range",
              },
              "locations": [
                {
                  "column": 11,
                  "line": 8,
                },
              ],
              "message": "Exceeds maximum allowed value of 10.",
              "path": [
                "test",
                "input",
                "value",
                "1",
              ],
            },
          ]
        `);
      });
    },
  );

  describe.each(['[Object]', '[Object!]', '[Object]!', '[Object!]!'])(
    'query input list of objects %s',
    (t) => {
      const schema = `
        directive @items(min: Int) on ARGUMENT_DEFINITION
        directive @range(max: Int) on INPUT_FIELD_DEFINITION
        type Query {
          test(input: ${t} @items(min: 2)): Int
        }
        input Object {
          value: Int! @range(max: 10)
        }
      `;
      const query = `
        query ($input: ${t}) {
          test(input: $input)
        }
      `;

      it('none', () => {
        const schema = `
          type Query {
            test(input: ${t}): Int
          }
          input Object {
            value: Int!
          }
        `;
        const errors = prepare(schema, query, {input: [{value: 100}]});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('unknown', () => {
        const schema = `
          directive @x on ARGUMENT_DEFINITION
          type Query {
            test(input: ${t} @x): Int
          }
          input Object {
            value: Int!
          }
        `;
        const errors = prepare(schema, query, {input: [{value: 100}]});
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('pass', () => {
        const errors = prepare(schema, query, {
          input: [{value: 5}, {value: 10}],
        });
        expect(errors).toMatchInlineSnapshot(`[]`);
      });

      it('fail for list', () => {
        const errors = prepare(schema, query, {input: [{value: 100}]});
        expect(errors).toMatchInlineSnapshot(`
          [
            {
              "extensions": {
                "args": {
                  "min": 2,
                },
                "code": "EINVAL",
                "directive": "items",
              },
              "locations": [
                {
                  "column": 16,
                  "line": 5,
                },
              ],
              "message": "Required to be a minimum of 2 items in length.",
              "path": [
                "test",
                "input",
              ],
            },
          ]
        `);
      });

      it('fail for all items', () => {
        const errors = prepare(schema, query, {
          input: [{value: 5}, {value: 100}, {value: 200}],
        });
        expect(errors).toMatchInlineSnapshot(`
          [
            {
              "extensions": {
                "args": {
                  "max": 10,
                },
                "code": "EINVAL",
                "directive": "range",
              },
              "locations": [
                {
                  "column": 11,
                  "line": 8,
                },
              ],
              "message": "Exceeds maximum allowed value of 10.",
              "path": [
                "test",
                "input",
                "1",
                "value",
              ],
            },
            {
              "extensions": {
                "args": {
                  "max": 10,
                },
                "code": "EINVAL",
                "directive": "range",
              },
              "locations": [
                {
                  "column": 11,
                  "line": 8,
                },
              ],
              "message": "Exceeds maximum allowed value of 10.",
              "path": [
                "test",
                "input",
                "2",
                "value",
              ],
            },
          ]
        `);
      });
    },
  );

  it('mutation input', () => {
    const schema = `
      type Mutation {
        test(input: Int): Int
      }
    `;
    const query = `
      mutation ($input: Int) {
        test(input: $input)
      }
    `;
    const errors = prepare(schema, query, {input: 10});
    expect(errors).toMatchInlineSnapshot(`[]`);
  });

  it('subscription input', () => {
    const schema = `
      type Subscription {
        test(input: Int): Int
      }
    `;
    const query = `
      subscription ($input: Int) {
        test(input: $input)
      }
    `;
    const errors = prepare(schema, query, {input: 10});
    expect(errors).toMatchInlineSnapshot(`[]`);
  });

  it('query input exit visitor on nested fields', () => {
    const schema = `
      type Query {
        test: Object
      }
      type Object {
        value: Int
      }
    `;
    const query = `
      {
        test {
          value
        }
      }
    `;
    const errors = prepare(schema, query, {});
    expect(errors).toMatchInlineSnapshot(`[]`);
  });

  it('noop if variables undefined', () => {
    const schema = `
      type Query {
        test: Int
      }
    `;
    const query = `
      {
        test
      }
    `;
    const errors = prepare(schema, query);
    expect(errors).toMatchInlineSnapshot(`[]`);
  });
});

function prepare(
  schema: string,
  query: string,
  variables?: Variables,
): GraphQLFormattedError[] {
  const rules = [
    ...specifiedRules,
    inputValidationDirectiveRule({
      entries: [
        ['items', items],
        ['range', range],
      ],
    }),
  ];
  return validate(buildSchema(schema), parse(query), rules, variables).map(
    (error) => error.toJSON(),
  );
}
