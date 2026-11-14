import { describe, expect, it } from 'vitest';
import { isOutsideRect } from './ki-dialog.backdrop';

// @spec:012-ki-dialog
describe('isOutsideRect', () => {
  it('S4 treats outside points as outside and boundary points as inside', () => {
    const rect = {
      bottom: 70,
      left: 10,
      right: 110,
      top: 20,
    } as DOMRectReadOnly;

    expect(isOutsideRect(9, 45, rect)).toBe(true);
    expect(isOutsideRect(111, 45, rect)).toBe(true);
    expect(isOutsideRect(40, 19, rect)).toBe(true);
    expect(isOutsideRect(40, 71, rect)).toBe(true);
    expect(isOutsideRect(10, 20, rect)).toBe(false);
    expect(isOutsideRect(110, 70, rect)).toBe(false);
    expect(isOutsideRect(60, 45, rect)).toBe(false);
  });
});
