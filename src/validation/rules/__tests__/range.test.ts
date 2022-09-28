import {range} from '../';
import {RangeArgs} from '../range';

type Sample = [args: RangeArgs, error?: string];

describe('validation rules range', () => {
  it('noop if value is undefined', () => {
    expect(range(undefined, {})).toBeUndefined();
  });

  it('noop if value is not number', () => {
    expect(range('', {})).toBeUndefined();
  });

  const value = 5;
  it.each<Sample>([
    [{}, undefined],
    [{message: ''}, undefined],
    [{min: 2, max: 5, message: ''}, undefined],
    [{min: 2, max: 4, message: 'message {min} - {max}'}, 'message 2 - 4'],
    [{min: 5, max: 5}, undefined],
    [{min: 2, max: 10}, undefined],
    [{min: 2, max: 4}, 'The value must fall within the range 2 - 4.'],
    [{min: 2}, undefined],
    [{min: 10}, 'Required to be greater or equal to 10.'],
    [{max: 10}, undefined],
    [{max: 2}, 'Exceeds maximum allowed value of 2.'],
  ])('with args %s error is: %s', (args, error) =>
    expect(range(value, args)).toEqual(error),
  );
});
