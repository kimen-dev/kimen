import { describe, expect, it } from 'vitest';
import { arrowDirection, nextEnabledIndex } from './ki-radio-group.keyboard';

// @spec:007-ki-radio-group
describe('ki-radio-group keyboard', () => {
  it('S6 computes next enabled index with wrapping and disabled skips', () => {
    expect(nextEnabledIndex([false, false, false], 0, 1)).toBe(1);
    expect(nextEnabledIndex([false, false, false], 0, -1)).toBe(2);
    expect(nextEnabledIndex([false, true, false], 0, 1)).toBe(2);
    expect(nextEnabledIndex([false, true, true], 0, 1)).toBe(0);
    expect(nextEnabledIndex([true, true], 0, 1)).toBeNull();
  });

  it('S7 computes previous navigation with wrapping and disabled runs', () => {
    expect(nextEnabledIndex([false, false, true], 1, 1)).toBe(0);
    expect(nextEnabledIndex([false, true, false], 2, -1)).toBe(0);
    expect(nextEnabledIndex([false], 0, 1)).toBe(0);
  });

  it('S21 maps horizontal arrows through writing direction', () => {
    expect(arrowDirection('ArrowDown', false)).toBe(1);
    expect(arrowDirection('ArrowUp', false)).toBe(-1);
    expect(arrowDirection('ArrowRight', false)).toBe(1);
    expect(arrowDirection('ArrowLeft', false)).toBe(-1);
    expect(arrowDirection('ArrowRight', true)).toBe(-1);
    expect(arrowDirection('ArrowLeft', true)).toBe(1);
    expect(arrowDirection('Home', false)).toBeNull();
  });
});
