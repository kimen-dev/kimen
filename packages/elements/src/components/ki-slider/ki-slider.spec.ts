import { describe, expect, it } from 'vitest';
import {
  formatSlider,
  moveBySteps,
  normalizeScale,
  readSelection,
  scaleFraction,
  snapValue,
} from './ki-slider.math';

describe('slider scale', () => {
  it('normalizes a non-finite minimum, inverted maximum and zero step', () => {
    expect(normalizeScale(Number.NaN, -12, 0)).toEqual({ min: 0, max: 0, step: 1 });
  });

  it('snaps decimal increments from the minimum without floating-point tails', () => {
    const scale = normalizeScale(-0.15, 1, 0.1);
    expect(snapValue(0.14, scale)).toBe(0.15);
  });

  it('keeps a maximum on a partial step reachable', () => {
    const scale = normalizeScale(0, 10, 3);
    expect([snapValue(8, scale), snapValue(9.9, scale), snapValue(10, scale)]).toEqual([9, 10, 10]);
  });

  it('moves to the preceding grid step from a partial maximum', () => {
    const scale = normalizeScale(0, 10, 3);
    expect(moveBySteps(10, -1, scale)).toBe(9);
  });

  it('keeps coordinate ratios finite for extreme and collapsed scales', () => {
    expect(scaleFraction(0, normalizeScale(-1e308, 1e308, 1e307))).toBe(0.5);
    expect(scaleFraction(5, normalizeScale(5, 5, 1))).toBe(0);
  });

  it('uses endpoint defaults and puts supplied range ends in order', () => {
    const scale = normalizeScale(10, 90, 5);
    expect(readSelection(undefined, false, scale)).toEqual([10, 10]);
    expect(readSelection(undefined, true, scale)).toEqual([10, 90]);
    expect(readSelection('82,22', true, scale)).toEqual([20, 80]);
    expect(readSelection('bad,62', true, scale)).toEqual([10, 60]);
  });

  it('formats percentages as scale values out of a hundred', () => {
    expect(formatSlider('en-US', 'percent', 'EUR').format(60)).toBe('60%');
  });

  it('formats an invalid locale and currency without throwing', () => {
    expect(formatSlider('invalid_locale', 'currency', 'invalid').format(20)).toBe(
      new Intl.NumberFormat(undefined, { currency: 'EUR', style: 'currency' }).format(20),
    );
  });
});
