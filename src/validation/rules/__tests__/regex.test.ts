import {regex} from '../';
import {RegexArgs} from '../regex';

type Sample = [s: string, args: RegexArgs, error?: string];

describe('validation rules regex', () => {
  it('noop if value is undefined', () => {
    expect(regex(/\d+/)(undefined, {})).toBeUndefined();
  });

  it('noop if value is not string', () => {
    expect(regex(/\d+/)(10, {})).toBeUndefined();
  });

  it.each<Sample>([
    ['100', {}, undefined],
    ['string', {message: 'message'}, 'message'],
    ['string', {}, 'Required to match validation pattern.'],
  ])('with input %s and args %s error is: %s', (s, args, error) => {
    expect(regex(/\d+/)(s, args)).toEqual(error);
  });
});
