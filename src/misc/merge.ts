/* eslint-disable @typescript-eslint/no-explicit-any */
import {GraphQLResolveInfo} from 'graphql';

export type Resolver<Context> = (
  parent: any,
  args: any,
  ctx: Context,
  info: GraphQLResolveInfo,
) => Promise<unknown> | unknown;

export type Resolvers<C> = {
  [name: string]: {
    [operation: string]: Resolver<C>;
  };
};

export function merge<Context>(
  resolvers: Resolvers<Context>[],
): Resolvers<Context> {
  const r: Resolvers<Context> = {};
  for (const resolver of resolvers) {
    for (const name of Object.keys(resolver)) {
      r[name] = Object.assign(r[name] ?? {}, resolver[name]);
    }
  }

  return r;
}
