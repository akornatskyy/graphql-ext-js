import {
  DocumentNode,
  execute,
  GraphQLError,
  GraphQLFormattedError,
  GraphQLSchema,
  parse,
} from 'graphql';
import {IncomingMessage, RequestListener, ServerResponse} from 'http';
import {formatError as defaultFormatError} from './format';
import {parseParams as defaultParseParams} from './params';
import {GraphQLParams, ValidationRule, Variables} from './types';
import {unexpectedErrorHandler} from './unexpected';
import {validate as defaultValidate} from './validate';

export type Options = {
  schema: GraphQLSchema;
  rootValue?: unknown;
  rules?: readonly ValidationRule[];
  context?: <Request extends IncomingMessage>(req: Request) => unknown;
  formatError?: (error: GraphQLError) => GraphQLFormattedError;
  parseParams?: <Request extends IncomingMessage>(
    req: Request,
  ) => Promise<GraphQLParams>;
  stringify?: (value: unknown) => string;
  unexpected?: <Response extends ServerResponse>(
    res: Response,
    error: unknown,
  ) => void;
  validate?: (
    schema: GraphQLSchema,
    node: DocumentNode,
    rules: readonly ValidationRule[],
    variables?: Variables,
  ) => GraphQLError[];
};

export function graphql(options: Options): RequestListener {
  const {
    schema,
    rules,
    rootValue,
    context = (req) => req,
    formatError = defaultFormatError,
    parseParams = defaultParseParams(),
    stringify = JSON.stringify,
    unexpected = unexpectedErrorHandler,
    validate = defaultValidate,
  } = options;
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const {query, variables} = await parseParams(req);
      if (query === undefined) {
        res.statusCode = 400;
        res.end('Expecting "query" in JSON request.');
        return;
      }

      const document = parse(query);
      if (rules !== undefined) {
        const errors = validate(schema, document, rules, variables);
        if (errors.length > 0) {
          res.statusCode = 400;
          res
            .setHeader('Content-Type', 'application/json')
            .end(stringify({errors}));
          return;
        }
      }

      const r = await execute({
        schema,
        document,
        rootValue,
        contextValue: context(req),
        variableValues: variables,
      });
      res.setHeader('Content-Type', 'application/json');
      if (r.errors !== undefined) {
        res.end(
          stringify({
            errors: r.errors.map(formatError),
            data: r.data,
          }),
        );
        return;
      }

      res.end(stringify(r));
    } catch (error) {
      unexpected(res, error);
    }
  };
}
