import { describe, expect, it } from 'vitest';
import { checkedFromMarkup, resolveSubmittedValue } from './ki-switch.form';

// @spec:008-ki-switch
describe('ki-switch form helpers', () => {
  it('S4 normalizes checked markup by attribute presence', () => {
    expect(checkedFromMarkup(true, true)).toBe(true);
    expect(checkedFromMarkup(true, false)).toBe(true);
    expect(checkedFromMarkup(true, undefined)).toBe(true);
    expect(checkedFromMarkup(false, true)).toBe(true);
    expect(checkedFromMarkup(false, false)).toBe(false);
    expect(checkedFromMarkup(false, undefined)).toBe(false);
  });

  it('S10 S11 S18 resolves submitted values with native checkbox parity', () => {
    expect(resolveSubmittedValue(true, undefined)).toBe('on');
    expect(resolveSubmittedValue(true, '')).toBe('');
    expect(resolveSubmittedValue(true, 'weekly')).toBe('weekly');
    expect(resolveSubmittedValue(false, undefined)).toBeNull();
    expect(resolveSubmittedValue(false, 'weekly')).toBeNull();
  });
});
