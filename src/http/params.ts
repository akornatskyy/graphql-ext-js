import {IncomingMessage} from 'http';
import getRawBody from 'raw-body';
import {Variables} from '../misc/validate';

export type GraphQLParams = {
  query?: string;
  variables?: Variables;
};

export type Options = {
  limit?: number;
};

export function parseParams(
  options?: Options,
): (req: IncomingMessage) => Promise<GraphQLParams> {
  // eslint-disable-next-line unicorn/numeric-separators-style
  const {limit = 10240} = options ?? {};
  return async (req: IncomingMessage): Promise<GraphQLParams> => {
    if (req.headers['content-type'] !== 'application/json') {
      throw Object.assign(
        new Error('Expecting "application/json" content type.'),
        {status: 415},
      );
    }

    const buffer = await getRawBody(req, {
      limit,
      encoding: true,
    });
    return JSON.parse(buffer);
  };
}
