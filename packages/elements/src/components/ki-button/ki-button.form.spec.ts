import { describe, expect, it } from 'vitest';
import { normalizeKiButtonType } from './ki-button.form';

// @spec:002-ki-button
describe('normalizeKiButtonType', () => {
  it('S7 resolves submit reset button and unknown form action types', () => {
    expect(normalizeKiButtonType('submit')).toBe('submit');
    expect(normalizeKiButtonType('reset')).toBe('reset');
    expect(normalizeKiButtonType('button')).toBe('button');
    expect(normalizeKiButtonType('launch')).toBe('submit');
    expect(normalizeKiButtonType(undefined)).toBe('submit');
  });
});
