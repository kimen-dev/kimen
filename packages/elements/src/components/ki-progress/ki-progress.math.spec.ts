import { describe, expect, it } from 'vitest';
import { clampValue, normalizeMax, resolveShape } from './ki-progress.math';

// @spec:015-ki-progress
describe('ki-progress math', () => {
  it('S14 normalizes a malformed max to 100', () => {
    expect(normalizeMax(100)).toBe(100);
    expect(normalizeMax(0)).toBe(100);
    expect(normalizeMax(-5)).toBe(100);
    expect(normalizeMax(Number.NaN)).toBe(100);
    expect(normalizeMax(Number.POSITIVE_INFINITY)).toBe(100);
  });

  it('S4 S14 clamps the value into the 0..max range and treats non-finite values as 0', () => {
    expect(clampValue(-10, 100)).toBe(0);
    expect(clampValue(0, 100)).toBe(0);
    expect(clampValue(40, 100)).toBe(40);
    expect(clampValue(100, 100)).toBe(100);
    expect(clampValue(250, 100)).toBe(100);
    expect(clampValue(Number.NaN, 100)).toBe(0);
    expect(clampValue(Number.POSITIVE_INFINITY, 100)).toBe(0);
  });

  it('S5 resolves an unrecognized shape to linear', () => {
    expect(resolveShape('linear')).toBe('linear');
    expect(resolveShape('circular')).toBe('circular');
    expect(resolveShape('banana')).toBe('linear');
    expect(resolveShape(undefined)).toBe('linear');
  });
});
