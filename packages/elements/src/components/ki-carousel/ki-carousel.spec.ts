// @spec:123-ki-carousel
import { expect, it } from 'vitest';
import { leadingLimit, movementTarget, normalizeIndex } from './ki-carousel.position';

it.each([
  [5, 2, 4],
  [3, 8, 1],
  [4, 0, 4],
  [0, 1, 1],
])('limits the leading position for %i slides and a view of %i', (count, view, limit) => {
  expect(leadingLimit(count, view)).toBe(limit);
});

it.each([
  [0, 1],
  [Number.NaN, 1],
  [Number.POSITIVE_INFINITY, 1],
  [2.9, 2],
  [99, 5],
])('normalizes requested index %s', (value, expected) => {
  expect(normalizeIndex(value, 5)).toBe(expected);
});

it.each([
  [1, 2, false, 3],
  [4, 2, false, 5],
  [5, 2, false, 5],
  [4, 2, true, 5],
  [5, 2, true, 1],
  [2, -2, true, 1],
  [1, -2, true, 5],
])('moves from %i by %i with loop %s', (current, step, loop, expected) => {
  expect(movementTarget(current, step, 5, loop)).toBe(expected);
});
