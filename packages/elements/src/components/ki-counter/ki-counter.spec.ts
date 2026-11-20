import { expect, it } from 'vitest';
import { formatCount } from './ki-counter.count';

it.each([
  { value: undefined, max: 99, expected: undefined },
  { value: 0, max: 99, expected: undefined },
  { value: -1, max: 99, expected: undefined },
  { value: Number.NaN, max: 99, expected: undefined },
  { value: Infinity, max: 99, expected: undefined },
  { value: 0.9, max: 99, expected: undefined },
  { value: 3.8, max: 99, expected: '3' },
  { value: 9, max: 9, expected: '9' },
  { value: 10, max: 9.5, expected: '9+' },
  { value: 120, max: 0, expected: '99+' },
  { value: 120, max: Number.NaN, expected: '99+' },
])('formats $value with cap $max as $expected', ({ value, max, expected }) => {
  expect(formatCount(value, max)).toBe(expected);
});
