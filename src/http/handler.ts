import {
  DocumentNode,
  execute,
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  GraphQLFormattedError,
  GraphQLSchema,
  Kind,
  OperationTypeNode,
  parse,
  subscribe,
} from 'graphql';
import {isAsyncIterable} from 'graphql/jsutils/isAsyncIterable';
import {IncomingMessage, RequestListener, ServerResponse} from 'http';
import {formatError as defaultFormatError} from '../misc/format';
import {
  validate as defaultValidate,
  ValidationRule,
  Variables,
} from '../misc/validate';
import {GraphQLParams, parseParams as defaultParseParams} from './params';
import {unexpectedErrorHandler} from './unexpected';

export type Options = {
  schema: GraphQLSchema;
  rootValue?: unknown;
  rules?: readonly ValidationRule[];
  context?: <Request extends IncomingMessage>(req: Request) => unknown;
  formatError?: (error: GraphQLError) => GraphQLFormattedError;
  parseParams?: <Request extends IncomingMessage>(
    req: Request,
  ) => GraphQLParams | Promise<GraphQLParams>;
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
    rootValue,
    rules,
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

      const args: ExecutionArgs = {
        schema,
        document,
        rootValue,
        contextValue: context(req),
        variableValues: variables,
      };

      let r: ExecutionResult;
      const op = getOperation(document);
      if (op === OperationTypeNode.SUBSCRIPTION) {
        const maybeAsyncIterable = await subscribe(args);
        if (isAsyncIterable(maybeAsyncIterable)) {
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.flushHeaders();
          res.on('close', () => maybeAsyncIterable.return());
          for await (const chunk of maybeAsyncIterable) {
            res.write(stringify(chunk) + '\n');
          }

          res.end();
          return;
        }

        r = maybeAsyncIterable;
      } else {
        r = await execute(args);
      }

      res.setHeader('Content-Type', 'application/json');
      if (r.errors !== undefined) {
        res.end(
          stringify({
            // eslint-disable-next-line unicorn/no-array-callback-reference
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

function getOperation(doc: DocumentNode): OperationTypeNode | undefined {
  for (const d of doc.definitions) {
    if (d.kind === Kind.OPERATION_DEFINITION) {
      return d.operation;
    }
  }

  return;
}
