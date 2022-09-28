import {predicate} from '../';
import {PredicateArgs} from '../predicate';

type Sample = [result: boolean, args: PredicateArgs, error?: string];

describe('validation rules predicate', () => {
  it('noop if value is undefined', () => {
    expect(predicate(() => false)(undefined, {})).toBeUndefined();
  });

  const data = {value: 5};
  it.each<Sample>([
    [true, {}, undefined],
    [false, {message: 'message'}, 'message'],
    [false, {}, 'Required to satisfy validation predicate condition.'],
  ])('with result %s and args %s error is: %s', (result, args, error) =>
    expect(
      predicate((value, object) => {
        expect(value).toEqual(5);
        expect(object).toStrictEqual(data);
        return result;
      })(5, args, data),
    ).toEqual(error),
  );
});
