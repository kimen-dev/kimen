import { describe, expect, it } from 'vitest';
import { fixedColumnCount } from './ki-grid.columns';

describe('fixed grid count', () => {
  it.each([1, 3])('accepts %s as a fixed count', (count) => {
    expect(fixedColumnCount(count)).toBe(count);
  });

  it.each([
    undefined,
    0,
    -2,
    2.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('uses auto-fill for %s', (count) => {
    expect(fixedColumnCount(count)).toBeUndefined();
  });
});
