// @spec:086-ki-copy-button
import { describe, expect, it } from 'vitest';

import { copySourceText, feedbackTimeout } from './ki-copy-button.behavior';

describe('copy source text', () => {
  it('S2 prefers the current string value, including an empty string', () => {
    expect(copySourceText({ value: 'fresh-token', textContent: 'stale value' })).toBe(
      'fresh-token',
    );
    expect(copySourceText({ value: '', textContent: 'stale value' })).toBe('');
  });

  it('S3 preserves text content exactly when there is no string value', () => {
    expect(copySourceText({ textContent: '  code\n' })).toBe('  code\n');
    expect(copySourceText({ value: 2, textContent: 'Two' })).toBe('Two');
  });

  it('S4 reports a missing source as undefined', () => {
    expect(copySourceText(null)).toBeUndefined();
    expect(copySourceText({ textContent: null })).toBeUndefined();
  });
});

describe('feedback timeout', () => {
  it.each([0, 500, 1500])('S7 preserves a valid %i ms duration', (duration) => {
    expect(feedbackTimeout(duration)).toBe(duration);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'S7 falls back to 1500 ms for %i',
    (duration) => {
      expect(feedbackTimeout(duration)).toBe(1500);
    },
  );

  it('S7 caps a duration beyond the native timer limit', () => {
    expect(feedbackTimeout(3_000_000_000)).toBe(2_147_483_647);
  });
});
