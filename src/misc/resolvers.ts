import {
  GraphQLEnumType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLType,
  getNullableType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
} from 'graphql/type';

export type Resolver<Context> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const typeMap = schema.getTypeMap();
  for (const typeName of Object.keys(resolvers)) {
    const type = typeMap[typeName];
    if (isEnumType(type)) {
      const config = type.toConfig();
      const enumValues = config.values;
      const enumType = resolvers[typeName];
      for (const key of Object.keys(enumType)) {
        const value = enumValues[toUpperSnakeCase(key)];
        if (value !== undefined) {
          value.value = enumType[key];
        }
      }

      typeMap[typeName] = new GraphQLEnumType(config);
    } else if (isObjectType(type)) {
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

  fixSchemaTypeReferences(typeMap);
  fixSchemaDefaultValues(typeMap);
}

function toUpperSnakeCase(s: string): string {
  return s
    .split(/(?=[A-Z])/)
    .join('_')
    .toUpperCase();
}

function fixSchemaTypeReferences(typeMap: Record<string, GraphQLNamedType>) {
  for (const typeName of Object.keys(typeMap)) {
    const type = typeMap[typeName];
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        field.type = fixTypeReference(typeMap, field.type);
        for (const arg of field.args) {
          arg.type = fixTypeReference(typeMap, arg.type);
        }
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        field.type = fixTypeReference(typeMap, field.type);
      }
    }
    // TODO: interfaces & unions
  }
}

function fixTypeReference<T extends GraphQLType>(
  typeMap: Record<string, GraphQLNamedType>,
  type: T,
): T {
  if (isNonNullType(type)) {
    const t = fixTypeReference(typeMap, type.ofType);
    return t === type.ofType ? type : (new GraphQLNonNull(t) as T);
  }

  if (isListType(type)) {
    const t = fixTypeReference(typeMap, type.ofType);
    return t === type.ofType ? type : (new GraphQLList(t) as T);
  }

  return typeMap[type.name] as T;
}

function fixSchemaDefaultValues(typeMap: Record<string, GraphQLNamedType>) {
  for (const typeName of Object.keys(typeMap)) {
    const type = typeMap[typeName];
    if (isObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        for (const arg of field.args) {
          arg.defaultValue = fixTypeDefaultValue(arg.type, arg.defaultValue);
        }
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        field.defaultValue = fixTypeDefaultValue(
          field.type,
          field.defaultValue,
        );
      }
    }
  }
}

function fixTypeDefaultValue(type: GraphQLInputType, value: unknown) {
  if (value === undefined || value === null) {
    return value;
  }

  type = getNullableType(type);
  if (isEnumType(type)) {
    return type.parseValue(value);
  }

  if (isInputObjectType(type) && typeof value === 'object') {
    const fields = type.getFields();
    const newValue: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const field = fields[key];
      if (field !== undefined) {
        newValue[key] = fixTypeDefaultValue(
          field.type,
          (value as Record<string, unknown>)[key],
        );
      }
    }

    return newValue;
  }

  // scalar
  return value;
}
