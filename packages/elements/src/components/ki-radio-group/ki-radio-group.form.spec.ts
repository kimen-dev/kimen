import { describe, expect, it } from 'vitest';
import { radioGroupFormValue } from './ki-radio-group.form';

// @spec:007-ki-radio-group
describe('radioGroupFormValue', () => {
  it('S12 computes form value only from a selected enabled option', () => {
    expect(radioGroupFormValue(null)).toBeNull();
    expect(radioGroupFormValue({ value: 'email', disabled: false })).toBe('email');
    expect(radioGroupFormValue({ disabled: false })).toBe('on');
    expect(radioGroupFormValue({ value: 'email', disabled: true })).toBeNull();
  });
});
