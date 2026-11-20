import { describe, expect, it } from 'vitest';

import { ratingMax, ratingStep, ratingValue } from './ki-rating.scale';

describe('rating scale', () => {
  it.each([
    [5.9, 5],
    [0, 1],
    [200, 10],
    [Number.POSITIVE_INFINITY, 5],
    [Number.NaN, 5],
  ])('resolves a maximum of %s to %s', (requested, expected) => {
    expect(ratingMax(requested)).toBe(expected);
  });

  it.each([
    [0.5, 0.5],
    [1, 1],
    [0.25, 1],
    [Number.NaN, 1],
  ])('resolves a precision of %s to %s', (requested, expected) => {
    expect(ratingStep(requested)).toBe(expected);
  });

  it.each([
    [4.2, 5, 0, 4.2],
    [4.3, 5, 0.5, 4.5],
    [2.2, 5, 1, 2],
    [Number.NaN, 5, 0.5, 0],
    [-2, 5, 1, 0],
    [6, 5, 0, 5],
  ] as const)(
    'resolves value %s on a %s-point scale with step %s to %s',
    (value, max, step, expected) => {
      expect(ratingValue(value, max, step)).toBe(expected);
    },
  );
});
