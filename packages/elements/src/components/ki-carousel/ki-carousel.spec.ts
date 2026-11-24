// @spec:123-ki-carousel
import { expect, it } from 'vitest';
import {
  leadingLimit,
  movementTarget,
  normalizeIndex,
  ROTATION_FLOOR_MS,
  rotationInterval,
} from './ki-carousel.position';

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

it.each([
  [undefined, 0],
  [Number.NaN, 0],
  [Number.POSITIVE_INFINITY, 0],
  [0, 0],
  [0.5, 0],
  [-5000, 0],
  [1, ROTATION_FLOOR_MS],
  [334, ROTATION_FLOOR_MS],
  [4999, ROTATION_FLOOR_MS],
  [5000, 5000],
  [8000, 8000],
  [2_147_483_647, 2_147_483_647],
  [9_999_999_999, 2_147_483_647],
])('S21 S23 schedules autoplay %s as a %i millisecond rotation', (autoplay, expected) => {
  expect(rotationInterval(autoplay)).toBe(expected);
});

it('S21 sets the rotation floor at five seconds', () => {
  expect(ROTATION_FLOOR_MS).toBe(5000);
});
