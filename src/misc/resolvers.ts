/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getNamedType,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isNonNullType,
  isObjectType,
} from 'graphql/type';

export type Resolver<Context> = (
  parent: any,
  args: any,
  ctx: Context,
  info: GraphQLResolveInfo,
) => Promise<unknown> | unknown;

export type Subscriber<Context> = {
  subscribe: Resolver<Context>;
  resolve: Resolver<Context>;
};

export type Resolvers<Context> = {
  [typeName: string]: {
    [fieldName: string]:
      | Resolver<Context>
      | Subscriber<Context>
      | string
      | number;
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
      if (isEnumType(type)) {
        const config = type.toConfig();
        const enumValues: GraphQLEnumValueConfigMap = {};
        for (const [key, value] of Object.entries(config.values)) {
          enumValues[key] = value;
        }

        const enumType = resolvers[typeName];
        for (const key of Object.keys(enumType)) {
          const valueConfig = enumValues[toUpperSnakeCase(key)];
          if (valueConfig !== undefined) {
            valueConfig.value = enumType[key];
          }
        }

        fixSchemaTypeReferences(schema, new GraphQLEnumType(config));
      }

      continue;
    }

    const resolver = resolvers[typeName];
    const fields = type.getFields();
    for (const fieldName of Object.keys(resolver)) {
      const field = fields[fieldName];
      if (field === undefined) {
        continue;
      }

      const r = resolver[fieldName];
      if (typeof r === 'function') {
        field.resolve = r;
      } else if (typeName === 'Subscription' && typeof r === 'object') {
        field.subscribe = r.subscribe;
        field.resolve = r.resolve;
      }
    }
  }
}

function fixSchemaTypeReferences(
  schema: GraphQLSchema,
  target: GraphQLNamedType,
) {
  const types = schema.getTypeMap();
  types[target.name] = target;
  for (const t of Object.values(types)) {
    if (isObjectType(t) || isInputObjectType(t)) {
      fixTypeReferences(t, target);
    }
  }
}

function fixTypeReferences(
  t: GraphQLInputObjectType | GraphQLObjectType,
  target: GraphQLNamedType,
) {
  for (const field of Object.values(t.getFields())) {
    const fieldType = field.type;
    if (isNonNullType(fieldType)) {
      if (getNamedType(fieldType).name === target.name) {
        field.type = new GraphQLNonNull(target);
      }
    } else if (fieldType.name === target.name) {
      field.type = target;
    } else if (isObjectType(field)) {
      fixTypeReferences(field, target);
    } else if (isInputObjectType(field)) {
      fixTypeReferences(field, target);
    }
  }
}

function toUpperSnakeCase(s: string): string {
  return s
    .split(/(?=[A-Z])/)
    .join('_')
    .toUpperCase();
}
