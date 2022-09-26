type RegexArgs = {message?: string};

export function regex(
  re: RegExp,
  message = 'Required to match validation pattern.',
) {
  return (value: unknown | undefined, args: RegexArgs): string | undefined => {
    if (value === undefined || typeof value !== 'string') {
      return;
    }

    if (re.test(value)) {
      return;
    }

    return args.message ?? message;
  };
}
