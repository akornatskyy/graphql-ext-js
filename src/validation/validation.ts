/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ArgumentNode,
  ASTVisitor,
  BREAK,
  getDirectiveValues,
  getVariableValues,
  GraphQLError,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLType,
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
      OperationDefinition: visitor.enterOperationDefinition,
      Field: {
        enter: visitor.enterField,
        leave: visitor.leaveField,
      },
      Argument: visitor.enterArgument,
    };
  };
}

class Visitor {
  private readonly path: string[] = [];
  private variableValues?: Variables;

  constructor(
    private readonly rules: Map<string, InputValidationRule>,
    private readonly ctx: ValidationContext,
    private readonly variables: Variables,
  ) {
    this.enterOperationDefinition = this.enterOperationDefinition.bind(this);
    this.enterField = this.enterField.bind(this);
    this.leaveField = this.leaveField.bind(this);
    this.enterArgument = this.enterArgument.bind(this);
  }

  enterOperationDefinition(node: OperationDefinitionNode) {
    const {coerced} = getVariableValues(
      this.ctx.getSchema(),
      node.variableDefinitions ?? [],
      this.variables,
    );
    if (coerced === undefined) {
      return BREAK;
    }

    this.variableValues = coerced;
  }

  enterField() {
    const field = this.ctx.getFieldDef();
    if (!field) {
      return BREAK;
    }

    this.path.push(field.name);
  }

  leaveField() {
    this.path.pop();
  }

  enterArgument(node: ArgumentNode) {
    const arg = this.ctx.getArgument();
    if (!arg || !arg.astNode) {
      // TODO: arg.astNode is null when fragment is used
      return BREAK;
    }

    let t = arg.type;
    if (isNonNullType(t)) {
      t = t.ofType;
    }

    if (isScalarType(t)) {
      this.checkScalar(
        arg.astNode,
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
      this.checkList(t, arg.astNode, input);
    }
  }

  private checkScalar(
    node: InputValueDefinitionNode,
    value: unknown | null | undefined,
    input?: Record<string, unknown>,
  ) {
    if (value === undefined || value === null) {
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
    } else if (isListType(inputObjectType)) {
      this.checkList(inputObjectType, node, value as unknown[]);
      return;
    }

    const directives = node.directives;
    if (directives === undefined || directives.length === 0) {
      return;
    }

    for (const d of directives) {
      const name = d.name.value;
      const rule = this.rules.get(name);
      if (rule === undefined) {
        continue;
      }

      const directive = schema.getDirective(name)!;
      const directiveValues = getDirectiveValues(directive, node)!;

      const error = rule(value, directiveValues, input);
      if (error === undefined) {
        continue;
      }

      const {message: _, ...args} = directiveValues;
      this.ctx.reportError(
        new GraphQLError(error, {
          nodes: node.name,
          path: [...this.path, node.name.value],
          extensions: {
            code: ERROR_CODE,
            directive: name,
            args,
          },
        }),
      );
      break;
    }
  }

  private checkInputObjectType(
    t: GraphQLInputObjectType,
    input: Record<string, unknown> | null | undefined,
  ) {
    if (!input) {
      return;
    }

    visit(t.astNode!, {
      InputValueDefinition: (n) =>
        this.checkScalar(n, input[n.name.value], input),
    });
  }

  private checkList(
    t: GraphQLList<GraphQLType>,
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

  private checkListOfScalar(node: InputValueDefinitionNode, values: unknown[]) {
    const directives = node.directives;
    if (directives === undefined || directives.length === 0) {
      return;
    }

    const schema = this.ctx.getSchema();
    for (const d of directives) {
      const name = d.name.value;
      const rule = this.rules.get(name);
      if (rule === undefined) {
        continue;
      }

      const directive = schema.getDirective(name)!;
      const directiveValues = getDirectiveValues(directive, node)!;

      const error = rule(values, directiveValues);
      if (error !== undefined) {
        const {message: _, ...args} = directiveValues;
        this.ctx.reportError(
          new GraphQLError(error, {
            nodes: node.name,
            path: [...this.path, node.name.value],
            extensions: {
              code: ERROR_CODE,
              directive: name,
              args,
            },
          }),
        );
        break;
      }

      for (const [i, value] of values.entries()) {
        const error = rule(value, directiveValues);
        if (error === undefined) {
          continue;
        }

        const {message: _, ...args} = directiveValues;
        this.ctx.reportError(
          new GraphQLError(error, {
            nodes: node.name,
            path: [...this.path, node.name.value, i.toString()],
            extensions: {
              code: ERROR_CODE,
              directive: name,
              args,
            },
          }),
        );
        break;
      }
    }
  }

  private checkListOfInputObject(
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
      if (rule === undefined) {
        continue;
      }

      const directive = schema.getDirective(name)!;
      const directiveValues = getDirectiveValues(directive, node)!;

      const error = rule(values, directiveValues);
      if (error !== undefined) {
        const {message: _, ...args} = directiveValues;
        this.ctx.reportError(
          new GraphQLError(error, {
            nodes: node.name,
            path: [...this.path],
            extensions: {
              code: ERROR_CODE,
              directive: name,
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
