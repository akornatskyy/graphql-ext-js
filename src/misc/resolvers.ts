/* eslint-disable @typescript-eslint/no-explicit-any */
import {GraphQLResolveInfo, GraphQLSchema, isObjectType} from 'graphql/type';

export type Resolver<Context> = (
  parent: any,
  args: any,
  ctx: Context,
  info: GraphQLResolveInfo,
) => Promise<unknown> | unknown;

export type Resolvers<Context> = {
  [typeName: string]: {
    [fieldName: string]: Resolver<Context>;
  };
};

export function mergeResolvers<Context>(
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

export function addResolvers<Context = unknown>(
  schema: GraphQLSchema,
  resolvers: Resolvers<Context>,
): void {
  for (const typeName of Object.keys(resolvers)) {
    const type = schema.getType(typeName);
    if (!isObjectType(type)) {
      continue;
    }

    const resolver = resolvers[typeName];
    const fields = type.getFields();
    for (const fieldName of Object.keys(resolver)) {
      const field = fields[fieldName];
      if (field === undefined) {
        continue;
      }

      field.resolve = resolver[fieldName];
    }
  }
}
