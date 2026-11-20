import { describe, expect, it } from 'vitest';
import { fieldCountAnnouncement, normalizeLengthLimit } from './field-count';

describe('normalizeLengthLimit', () => {
  it.each([0, 30, 2147483647])('keeps the native length limit %i', (limit) => {
    expect(normalizeLengthLimit(limit)).toBe(limit);
  });

  it.each([undefined, NaN, Infinity, -1, 2.5, 2147483648])(
    'treats unsupported limit %s as absent',
    (limit) => {
      expect(normalizeLengthLimit(limit)).toBeUndefined();
    },
  );
});

describe('fieldCountAnnouncement', () => {
  it.each([
    [0, 1, 3, undefined],
    [2, 3, 3, '3 / 3'],
    [3, 3, 3, undefined],
    [3, 4, 3, '4 / 3'],
    [2, 5, 3, '5 / 3'],
    [4, 5, 3, undefined],
    [5, 3, 3, '3 / 3'],
    [3, 2, 3, ''],
    [0, 1, 0, '1 / 0'],
    [2, 3, undefined, undefined],
  ] as const)('moves from %s to %s against limit %s', (previous, length, maximum, announcement) => {
    expect(fieldCountAnnouncement(previous, length, maximum)).toBe(announcement);
  });
});
