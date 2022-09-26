type LengthArgs = {min?: number; max?: number; message?: string};

export function length(
  value: unknown | undefined,
  args: LengthArgs,
): string | undefined {
  if (value === undefined || typeof value !== 'string') {
    return;
  }

  const message = args.message;
  if (message !== undefined) {
    const {min = 0, max = Number.MAX_SAFE_INTEGER} = args;
    if (value.length >= min && value.length <= max) {
      return;
    }

    return message
      .replace('{min}', min.toString())
      .replace('{max}', max.toString());
  }

  const {min, max} = args;
  if (min !== undefined) {
    if (max !== undefined) {
      if (min === max) {
        if (value.length === max) {
          return;
        }

        return `The length must be exactly ${max} characters.`;
      }

      if (value.length >= min && value.length <= max) {
        return;
      }

      return `Required to be between ${min} and ${max} characters in length.`;
    }

    if (value.length >= min) {
      return;
    }

    return `Required to be a minimum of ${min} characters in length.`;
  }

  if (max === undefined || value.length <= max) {
    return;
  }

  return `Exceeds maximum length of ${max} characters.`;
}
