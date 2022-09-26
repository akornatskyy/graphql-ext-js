type RegexArgs = {message?: string};

export function predicate(
  condition: (value: unknown, object?: Record<string, unknown>) => boolean,
  message = 'Required to satisfy validation predicate condition.',
) {
  return (
    value: unknown | undefined,
    args: RegexArgs,
    object?: Record<string, unknown>,
  ): string | undefined => {
    if (value === undefined) {
      return;
    }

    if (condition(value, object)) {
      return;
    }

    return args.message ?? message;
  };
}
