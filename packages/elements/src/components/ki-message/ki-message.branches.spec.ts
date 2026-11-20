import { expect, it } from 'vitest';

import { replyBranches } from './ki-message.branches';

it.each([0, 1, -3, 2.5, Infinity, NaN])('omits the picker when the branch count is %s', (count) => {
  expect(replyBranches(2, count)).toBeUndefined();
});

it.each([
  [2, 2],
  [-1, 1],
  [8, 3],
  [2.5, 1],
  [Infinity, 1],
  [NaN, 1],
])('normalizes branch index %s to %s', (requested, index) => {
  expect(replyBranches(requested, 3)).toEqual({ index, count: 3 });
});
