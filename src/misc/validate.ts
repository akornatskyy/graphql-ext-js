import {
  ASTVisitor,
  DocumentNode,
  GraphQLError,
  GraphQLSchema,
  TypeInfo,
  ValidationContext,
  visit,
  visitInParallel,
  visitWithTypeInfo,
} from 'graphql';

export type Variables = {readonly [name: string]: unknown};

export type ValidationRule = (
  ctx: ValidationContext,
  variables?: Variables,
) => ASTVisitor;

export function validate(
  schema: GraphQLSchema,
  node: DocumentNode,
  rules: readonly ValidationRule[],
  variables?: Variables,
): GraphQLError[] {
  const typeInfo = new TypeInfo(schema);
  const errors: GraphQLError[] = [];
  const context = new ValidationContext(schema, node, typeInfo, (error) => {
    errors.push(error);
  });
  const visitor = visitInParallel(
    rules.map((rule) => rule(context, variables)),
  );
  visit(node, visitWithTypeInfo(typeInfo, visitor));
  return errors;
}
