// @spec:096-ki-breadcrumb
import { expect, it } from 'vitest';

import { formatMoreLabel, getCollapsedRange } from './ki-breadcrumb.layout';

it.each([
  [4, 4],
  [4, 1],
  [5, 5],
  [0, 4],
  [9, undefined],
  [9, 0],
  [9, -1],
  [9, Number.NaN],
  [9, Number.POSITIVE_INFINITY],
])('S2 leaves %i levels expanded with a limit of %s', (count, limit) => {
  expect(getCollapsedRange(count, limit)).toBeUndefined();
});

it.each([
  [5, 4, { start: 1, end: 3 }],
  [5, 1, { start: 1, end: 3 }],
  [7, 6, { start: 1, end: 5 }],
  [7, 6.8, { start: 1, end: 5 }],
])('S2 returns the middle of %i levels with a limit of %s', (count, limit, range) => {
  expect(getCollapsedRange(count, limit)).toEqual(range);
});

it('S6 inserts the hidden level count in the supplied label', () => {
  expect(formatMoreLabel('Browse {n} earlier levels', 3)).toBe('Browse 3 earlier levels');
});
