import { describe, expect, it } from 'vitest';
import { normalizeKiTextareaRows } from './ki-textarea.form';

// @spec:004-ki-textarea
describe('normalizeKiTextareaRows', () => {
  it('S6 normalizes positive finite rows and floors fractional values', () => {
    expect(normalizeKiTextareaRows(1)).toBe(1);
    expect(normalizeKiTextareaRows(2)).toBe(2);
    expect(normalizeKiTextareaRows(6)).toBe(6);
    expect(normalizeKiTextareaRows(3.9)).toBe(3);
  });

  it('S6 normalizes invalid rows values to the default count', () => {
    expect(normalizeKiTextareaRows(undefined)).toBe(2);
    expect(normalizeKiTextareaRows(Number.NaN)).toBe(2);
    expect(normalizeKiTextareaRows('tall')).toBe(2);
    expect(normalizeKiTextareaRows(0)).toBe(2);
    expect(normalizeKiTextareaRows(-1)).toBe(2);
  });
});
