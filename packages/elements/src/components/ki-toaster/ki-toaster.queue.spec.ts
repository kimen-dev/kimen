import { describe, expect, it } from 'vitest';
import { KI_TOASTER_DEFAULT_MAX, normalizeMax, queuedFlags } from './ki-toaster.queue';

// @spec:049-ki-toast
describe('normalizeMax', () => {
  it('S18 keeps a whole maximum of one or more', () => {
    expect(normalizeMax(2)).toBe(2);
    expect(normalizeMax(1)).toBe(1);
    expect(normalizeMax(12)).toBe(12);
  });

  it('S18 falls back to three for a maximum below one or not a whole number', () => {
    expect(KI_TOASTER_DEFAULT_MAX).toBe(3);
    expect(normalizeMax(undefined)).toBe(3);
    expect(normalizeMax(0)).toBe(3);
    expect(normalizeMax(-2)).toBe(3);
    expect(normalizeMax(1.5)).toBe(3);
    expect(normalizeMax(Number.NaN)).toBe(3);
    expect(normalizeMax(Number.POSITIVE_INFINITY)).toBe(3);
    expect(normalizeMax('2')).toBe(3);
  });
});

describe('queuedFlags', () => {
  it('S18 shows the newest toasts and queues the older ones', () => {
    expect(queuedFlags([false, false, false], 2)).toEqual([true, false, false]);
  });

  it('S19 brings the newest waiting toast back when a shown toast leaves', () => {
    expect(queuedFlags([false, false, true], 2)).toEqual([false, false, false]);
    expect(queuedFlags([false, false, false, true], 2)).toEqual([true, false, false, false]);
  });

  it('S34 never queues a toast that has left and shows everything under the maximum', () => {
    expect(queuedFlags([false, true, false], 1)).toEqual([true, false, false]);
    expect(queuedFlags([false, false], 3)).toEqual([false, false]);
    expect(queuedFlags([], 3)).toEqual([]);
  });
});

describe('queuedFlags with a focused toast', () => {
  it('S44 keeps the focused toast shown and queues the oldest other shown toast', () => {
    expect(queuedFlags([false, false], 1, 0)).toEqual([false, true]);
    expect(queuedFlags([false, false, false], 2, 0)).toEqual([false, true, false]);
  });

  it('S44 changes nothing when the focused toast is already shown', () => {
    expect(queuedFlags([false, false, false], 2, 2)).toEqual([true, false, false]);
  });

  it('S45 shows the newest toasts again once no toast holds focus', () => {
    expect(queuedFlags([false, false], 1, -1)).toEqual([true, false]);
    expect(queuedFlags([false, false], 1)).toEqual([true, false]);
  });

  it('S44 ignores a focused toast that has left', () => {
    expect(queuedFlags([true, false], 1, 0)).toEqual([false, false]);
  });
});
