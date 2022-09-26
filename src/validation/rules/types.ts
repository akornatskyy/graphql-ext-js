export type InputValidationRule = (
  value: unknown,
  args: Record<string, unknown>,
  object?: Record<string, unknown>,
) => string | undefined;

export type InputValidationRuleEntry = [
  name: string,
  rule: InputValidationRule,
];
