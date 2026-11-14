import { describe, expect, it } from 'vitest';
import { normalizeKiInputType } from './ki-input.form';

// @spec:003-ki-input
describe('normalizeKiInputType', () => {
  it('S6 normalizes every supported input type and falls unknown values back to text', () => {
    expect(normalizeKiInputType('text')).toBe('text');
    expect(normalizeKiInputType('email')).toBe('email');
    expect(normalizeKiInputType('password')).toBe('password');
    expect(normalizeKiInputType('url')).toBe('url');
    expect(normalizeKiInputType('tel')).toBe('tel');
    expect(normalizeKiInputType('search')).toBe('search');
    expect(normalizeKiInputType('number')).toBe('text');
    expect(normalizeKiInputType('date')).toBe('text');
    expect(normalizeKiInputType(undefined)).toBe('text');
  });
});
