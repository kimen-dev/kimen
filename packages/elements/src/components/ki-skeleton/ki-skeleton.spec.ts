// @spec:084-ki-skeleton
import { expect, it } from 'vitest';

import { normalizeSkeletonLines } from './normalize-lines';

it.each([
  [1, 1],
  [3, 3],
  [3.9, 3],
  [0, 1],
  [-5, 1],
  [20, 20],
  [21, 20],
  [Number.MAX_VALUE, 20],
  [Number.NaN, 1],
  [Number.POSITIVE_INFINITY, 1],
  [Number.NEGATIVE_INFINITY, 1],
])('S1 normalizes a line count of %s to %s', (input, expected) => {
  expect(normalizeSkeletonLines(input)).toBe(expected);
});
