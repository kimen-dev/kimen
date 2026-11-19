// @spec:087-ki-empty-state
import { expect, it } from 'vitest';

import { resolveHeadingLevel } from './ki-empty-state.heading.js';

it.each([2, 3, 4, 5, 6])('keeps native heading level %s', (level) => {
  expect(resolveHeadingLevel(level)).toBe(level);
});

it.each([1, 7, 3.5, NaN, Infinity])('uses level three when %s is not a valid level', (level) => {
  expect(resolveHeadingLevel(level)).toBe(3);
});

it.each([
  ['4', 4],
  [' 5 ', 5],
  ['2junk', 3],
  ['4.0.1', 3],
  [null, 3],
])('reads the whole HTML heading-level value %s', (level, expected) => {
  expect(resolveHeadingLevel(level)).toBe(expected);
});
