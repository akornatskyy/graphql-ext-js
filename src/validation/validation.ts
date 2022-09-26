/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ArgumentNode,
  ASTVisitor,
  BREAK,
  FieldNode,
  getDirectiveValues,
  getVariableValues,
  GraphQLError,
  GraphQLField,
  GraphQLFieldMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  InputValueDefinitionNode,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  Kind,
  OperationDefinitionNode,
  typeFromAST,
  ValidationContext,
  valueFromAST,
  visit,
} from 'graphql';
import {Variables} from '../misc/validate';
import {InputValidationRule, InputValidationRuleEntry} from './rules/types';

const NOOP: ASTVisitor = {};
const ERROR_CODE = 'EINVAL';

type Options = {
  entries: InputValidationRuleEntry[];
  maxErrors?: number; // TODO
};

export function inputValidationDirectiveRule(options: Options) {
  const {entries} = options;
  const rules = new Map(entries);
  return (ctx: ValidationContext, variables?: Variables): ASTVisitor => {
    if (variables === undefined) {
      return NOOP;
    }

    const visitor = new Visitor(rules, ctx, variables);
    // TODO: fragment definition, inline fragment
    return {
      OperationDefinition: {
        enter: visitor.enterOperationDefinition,
      },
      Field: {
        enter: visitor.enterFieldNode,
      },
      Argument: {
        enter: visitor.enterArgumentNode,
      },
    };
  };
}

class Visitor {
  private fields?: GraphQLFieldMap<unknown, unknown>;
  private variableValues?: Variables;
  private field?: GraphQLField<unknown, unknown>;
  private path: string[] = [];

  constructor(
    private readonly rules: Map<string, InputValidationRule>,
    private readonly ctx: ValidationContext,
    private readonly variables: Variables,
  ) {
    this.enterOperationDefinition = this.enterOperationDefinition.bind(this);
    this.enterFieldNode = this.enterFieldNode.bind(this);
    this.enterArgumentNode = this.enterArgumentNode.bind(this);
  }

  enterOperationDefinition(node: OperationDefinitionNode) {
    const schema = this.ctx.getSchema();
    switch (node.operation) {
      case 'mutation': {
        this.fields = schema.getMutationType()!.getFields();
        break;
      }
      case 'query': {
        this.fields = schema.getQueryType()!.getFields();
        break;
      }
      case 'subscription': {
        this.fields = schema.getSubscriptionType()!.getFields();
        break;
      }
    }

    const {coerced} = getVariableValues(
      schema,
      node.variableDefinitions ?? [],
      this.variables,
    );
    if (coerced === undefined) {
      return BREAK;
    }

    this.variableValues = coerced;
  }

  enterFieldNode(node: FieldNode) {
    const field = this.fields![node.name.value];
    if (!field) {
      return BREAK;
    }

    this.field = field;
    this.path.push(field.name);
  }

  enterArgumentNode(node: ArgumentNode) {
    const arg = this.field!.args.find((x) => x.name === node.name.value)!;
    let t = arg.type;
    if (isNonNullType(t)) {
      t = t.ofType;
    }

    if (isScalarType(t)) {
      this.checkScalar(
        arg.astNode!,
        valueFromAST(node.value, t, this.variableValues),
      );
    } else if (isInputObjectType(t)) {
      this.path.push(arg.name);
      const input = valueFromAST(node.value, t, this.variableValues) as Record<
        string,
        unknown
      >;
      this.checkInputObjectType(t, input);
      this.path.pop();
    } else if (isListType(t)) {
      const input = valueFromAST(
        node.value,
        t,
        this.variableValues,
      ) as unknown[];
      this.checkList(t, arg.astNode!, input);
    }
  }

  checkScalar(
    node: InputValueDefinitionNode,
    value: unknown | undefined,
    input?: Record<string, unknown>,
  ) {
    if (value === undefined) {
      return;
    }

    let t = node.type;
    if (t.kind === Kind.NON_NULL_TYPE) {
      t = t.type;
    }

    const schema = this.ctx.getSchema();
    const inputObjectType = typeFromAST(schema, t);
    if (isInputObjectType(inputObjectType)) {
      this.path.push(node.name.value);
      this.checkInputObjectType(
        inputObjectType,
        value as Record<string, unknown>,
      );
      this.path.pop();
      return;
    }

    const directives = node.directives;
    if (directives === undefined || directives.length === 0) {
      return;
    }

    for (const d of directives) {
      const name = d.name.value;
      const rule = this.rules.get(name);
      if (!rule) {
        continue;
      }

      const directive = schema.getDirective(name)!;
      const directiveValues = getDirectiveValues(directive, node)!;

      const error = rule(value, directiveValues, input);
      if (!error) {
        continue;
      }

      const {message: _, ...args} = directiveValues;
      this.ctx.reportError(
        new GraphQLError(error, {
          nodes: node.name,
          path: [...this.path, node.name.value],
          extensions: {
            code: ERROR_CODE,
            directive: directive.toString(),
            args,
          },
        }),
      );
      break;
    }
  }

  checkInputObjectType(
    t: GraphQLInputObjectType,
    input: Record<string, unknown> | undefined,
  ) {
    if (input === undefined) {
      return;
    }

    visit(t.astNode!, {
      InputValueDefinition: {
        enter: (n) => this.checkScalar(n, input[n.name.value], input),
      },
    });
  }

  checkList(
    t: GraphQLList<GraphQLInputType>,
    node: InputValueDefinitionNode,
    values: unknown[],
  ) {
    let itemType = t.ofType;
    if (isNonNullType(itemType)) {
      itemType = itemType.ofType;
    }

    if (isScalarType(itemType)) {
      this.checkListOfScalar(node, values);
    } else if (isInputObjectType(itemType)) {
      this.checkListOfInputObject(node, itemType, values);
    }
  }

  checkListOfScalar(node: InputValueDefinitionNode, values: unknown[]) {
    const directives = node.directives;
    if (directives === undefined || directives.length === 0) {
      return;
    }

    const schema = this.ctx.getSchema();
    for (const d of directives) {
      const name = d.name.value;
      const rule = this.rules.get(name);
      if (!rule) {
        continue;
      }

      const directive = schema.getDirective(name)!;
      const directiveValues = getDirectiveValues(directive, node)!;

      const error = rule(values, directiveValues);
      if (error) {
        const {message: _, ...args} = directiveValues;
        this.ctx.reportError(
          new GraphQLError(error, {
            nodes: node.name,
            path: [...this.path, node.name.value],
            extensions: {
              code: ERROR_CODE,
              directive: directive.toString(),
              args,
            },
          }),
        );
        break;
      }

      for (const [i, value] of values.entries()) {
        const error = rule(value, directiveValues);
        if (!error) {
          continue;
        }

        const {message: _, ...args} = directiveValues;
        this.ctx.reportError(
          new GraphQLError(error, {
            nodes: node.name,
            path: [...this.path, node.name.value, i.toString()],
            extensions: {
              code: ERROR_CODE,
              directive: directive.toString(),
              args,
            },
          }),
        );
        break;
      }
    }
  }

  checkListOfInputObject(
    node: InputValueDefinitionNode,
    inputObjectType: GraphQLInputObjectType,
    values: unknown[],
  ) {
    const directives = node.directives;
    if (directives === undefined || directives.length === 0) {
      return;
    }

    this.path.push(node.name.value);
    const schema = this.ctx.getSchema();
    for (const d of directives) {
      const name = d.name.value;
      const rule = this.rules.get(name);
      if (!rule) {
        continue;
      }

      const directive = schema.getDirective(name)!;
      const directiveValues = getDirectiveValues(directive, node)!;

      const error = rule(values, directiveValues);
      if (error) {
        const {message: _, ...args} = directiveValues;
        this.ctx.reportError(
          new GraphQLError(error, {
            nodes: node.name,
            path: [...this.path],
            extensions: {
              code: ERROR_CODE,
              directive: directive.toString(),
              args,
            },
          }),
        );
        break;
      }

      for (const [i, value] of values.entries()) {
        this.path.push(i.toString());
        this.checkInputObjectType(
          inputObjectType,
          value as Record<string, unknown>,
        );
        this.path.pop();
      }
    }

    this.path.pop();
  }
}
