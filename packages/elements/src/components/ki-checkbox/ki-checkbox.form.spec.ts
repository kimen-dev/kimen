import { describe, expect, it } from 'vitest';
import { checkboxFormValue } from './ki-checkbox.form';

// @spec:006-ki-checkbox
describe('checkboxFormValue', () => {
  it('S10 computes native checkbox form values', () => {
    expect(checkboxFormValue(true, undefined)).toBe('on');
    expect(checkboxFormValue(true, '')).toBe('');
    expect(checkboxFormValue(true, 'weekly')).toBe('weekly');
    expect(checkboxFormValue(false, undefined)).toBeNull();
    expect(checkboxFormValue(false, '')).toBeNull();
    expect(checkboxFormValue(false, 'weekly')).toBeNull();
  });
});
