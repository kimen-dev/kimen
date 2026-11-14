import { describe, expect, it } from 'vitest';
import { booleanFromAttributePresence } from './boolean-presence';

describe('booleanFromAttributePresence', () => {
  it('treats a present attribute as true whatever the parsed value', () => {
    expect(booleanFromAttributePresence(false, false)).toBe(false);
    expect(booleanFromAttributePresence(false, true)).toBe(true);
    expect(booleanFromAttributePresence(true, false)).toBe(true);
    expect(booleanFromAttributePresence(true, true)).toBe(true);
  });
});
