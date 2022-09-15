import {ASTVisitor, ValidationContext} from 'graphql';

export type Variables = {readonly [name: string]: unknown};

export type ValidationRule = (
  ctx: ValidationContext,
  variables?: Variables,
) => ASTVisitor;

export type GraphQLParams = {
  query?: string;
  variables?: Variables;
};
