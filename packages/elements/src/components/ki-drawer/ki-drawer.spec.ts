import { expect, it } from 'vitest';
import { isDownwardSwipe } from './ki-drawer.gesture';

it.each([
  [0, 48, true],
  [-39, 50, true],
  [50, 48, false],
  [48, 48, false],
  [0, 47, false],
  [0, -80, false],
])('classifies a swipe with delta (%d, %d) as downward: %s', (dx, dy, expected) => {
  expect(isDownwardSwipe(dx, dy)).toBe(expected);
});
