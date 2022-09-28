import {items} from '../';
import {ItemsArgs} from '../items';

type Sample = [args: ItemsArgs, error?: string];

describe('validation rules items', () => {
  it('noop if value is undefined', () => {
    expect(items(undefined, {})).toBeUndefined();
  });

  it('noop if value is not array', () => {
    expect(items(100, {})).toBeUndefined();
  });

  const value = [1, 2, 3, 4, 5];
  it.each<Sample>([
    [{}, undefined],
    [{message: ''}, undefined],
    [{min: 2, max: 10, message: ''}, undefined],
    [{min: 2, max: 4, message: 'message {min} - {max}'}, 'message 2 - 4'],
    [{min: 5, max: 5}, undefined],
    [{min: 2, max: 2}, 'The length must be exactly 2 items.'],
    [{min: 2, max: 10}, undefined],
    [{min: 2, max: 4}, 'Required to be between 2 and 4 items in length.'],
    [{min: 2}, undefined],
    [{min: 10}, 'Required to be a minimum of 10 items in length.'],
    [{max: 10}, undefined],
    [{max: 2}, 'Exceeds maximum length of 2 items.'],
  ])('with args %s error is: %s', (args, error) =>
    expect(items(value, args)).toEqual(error),
  );
});
