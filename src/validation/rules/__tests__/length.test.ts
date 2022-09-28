import {length} from '../';
import {LengthArgs} from '../length';

type Sample = [args: LengthArgs, error?: string];

describe('validation rules length', () => {
  it('noop if value is undefined', () => {
    expect(length(undefined, {})).toBeUndefined();
  });

  it('noop if value is not string', () => {
    expect(length(100, {})).toBeUndefined();
  });

  const value = 'Hello';
  it.each<Sample>([
    [{}, undefined],
    [{message: ''}, undefined],
    [{min: 2, max: 5, message: ''}, undefined],
    [{min: 2, max: 4, message: 'message {min} - {max}'}, 'message 2 - 4'],
    [{min: 5, max: 5}, undefined],
    [{min: 2, max: 2}, 'The length must be exactly 2 characters.'],
    [{min: 2, max: 10}, undefined],
    [{min: 2, max: 4}, 'Required to be between 2 and 4 characters in length.'],
    [{min: 2}, undefined],
    [{min: 10}, 'Required to be a minimum of 10 characters in length.'],
    [{max: 10}, undefined],
    [{max: 2}, 'Exceeds maximum length of 2 characters.'],
  ])('with args %s error is: %s', (args, error) =>
    expect(length(value, args)).toEqual(error),
  );
});
