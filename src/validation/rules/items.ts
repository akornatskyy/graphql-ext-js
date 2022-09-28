export type ItemsArgs = {min?: number; max?: number; message?: string};

const MAX_ARRAY_ITEMS = 2 ** 32 - 1;

export function items(
  value: unknown | undefined,
  args: ItemsArgs,
): string | undefined {
  if (value === undefined || !Array.isArray(value)) {
    return;
  }

  const message = args.message;
  if (message !== undefined) {
    const {min = 0, max = MAX_ARRAY_ITEMS} = args;
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

        return `The length must be exactly ${max} items.`;
      }

      if (value.length >= min && value.length <= max) {
        return;
      }

      return `Required to be between ${min} and ${max} items in length.`;
    }

    if (value.length >= min) {
      return;
    }

    return `Required to be a minimum of ${min} items in length.`;
  }

  if (max === undefined || value.length <= max) {
    return;
  }

  return `Exceeds maximum length of ${max} items.`;
}
