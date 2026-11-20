// @spec:097-ki-table
import { expect, it } from 'vitest';
import { nextSortDirection } from './ki-table.sort';

it.each([
  ['ascending', 'descending'],
  ['descending', 'ascending'],
  ['none', 'ascending'],
  ['other', 'ascending'],
  [null, 'ascending'],
])('S2: derives the next sort request from the supplied direction (%s)', (current, next) => {
  expect(nextSortDirection(current)).toBe(next);
});
