type RangeArgs = {min?: number; max?: number; message?: string};

export function range(
  value: unknown | undefined,
  args: RangeArgs,
): string | undefined {
  if (value === undefined || typeof value !== 'number') {
    return;
  }

  const message = args.message;
  if (message !== undefined) {
    const {min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER} = args;
    if (value >= min && value <= max) {
      return;
    }

    return message
      .replace('{min}', min.toString())
      .replace('{max}', max.toString());
  }

  const {min, max} = args;
  if (min !== undefined) {
    if (max !== undefined) {
      if (value >= min && value <= max) {
        return;
      }

      return `The value must fall within the range ${min} - ${max}.`;
    }

    if (value >= min) {
      return;
    }

    return `Required to be greater or equal to ${min}.`;
  }

  if (max === undefined || value <= max) {
    return;
  }

  return `Exceeds maximum allowed value of ${max}.`;
}
