import { describe, expect, it } from 'vitest';
import { normalizeCode, normalizeCodeInputLength } from './ki-code-input.value';

describe('normalizeCodeInputLength', () => {
  it.each([4, 5, 6, 7, 8])('accepts %i as a supported length', (length) => {
    expect(normalizeCodeInputLength(length)).toBe(length);
  });

  it.each([undefined, 0, 3, 5.5, 9, Infinity, NaN])(
    'defaults unsupported length %s to six',
    (length) => {
      expect(normalizeCodeInputLength(length)).toBe(6);
    },
  );
});

describe('normalizeCode', () => {
  it('filters and then caps digits, preserving leading zeros', () => {
    expect(normalizeCode('a04 29-11z7', 'numeric', 6)).toBe('042911');
  });

  it('preserves ASCII letter case and digits in alphanumeric codes', () => {
    expect(normalizeCode('a-7 B9á你好2', 'alphanumeric', 8)).toBe('a7B92');
  });

  it('uses numeric mode for unsupported types', () => {
    expect(normalizeCode('B09A', 'unsupported', 4)).toBe('09');
  });

  it('clears an absent value', () => {
    expect(normalizeCode(undefined, 'numeric', 6)).toBe('');
  });
});
