import { describe, expect, it } from 'vitest';
import { resolveSubmittedValue } from './ki-switch.form';

// @spec:008-ki-switch
describe('ki-switch form helpers', () => {
  it('S10 S11 S18 resolves submitted values with native checkbox parity', () => {
    expect(resolveSubmittedValue(true, undefined)).toBe('on');
    expect(resolveSubmittedValue(true, '')).toBe('');
    expect(resolveSubmittedValue(true, 'weekly')).toBe('weekly');
    expect(resolveSubmittedValue(false, undefined)).toBeNull();
    expect(resolveSubmittedValue(false, 'weekly')).toBeNull();
  });
});
