// @spec:088-ki-stat
import { describe, expect, it } from 'vitest';
import { deltaPresentation, formatStatNumber } from './ki-stat.presentation';

describe('formatStatNumber', () => {
  it('S1 uses locale punctuation and the supplied decimal suffix', () => {
    expect(formatStatNumber(1234.5, 'de-DE', 'ms')).toBe('1.234,5 ms');
  });

  it('S1 lets percent, currency and Intl unit formats supply their own units', () => {
    expect(formatStatNumber(0.12, 'en-US', 'ms', { style: 'percent' })).toBe('12%');
    expect(formatStatNumber(1234.5, 'en-US', 'ms', { style: 'currency', currency: 'USD' })).toBe(
      '$1,234.50',
    );
    expect(formatStatNumber(8, 'en-US', 'ms', { style: 'unit', unit: 'second' })).toBe('8 sec');
  });

  it('uses the literal suffix with compact decimal notation', () => {
    expect(formatStatNumber(1250, 'en-US', 'ms', { notation: 'compact' })).toBe('1.3K ms');
  });

  it('uses decimal formatting when the options are invalid', () => {
    expect(formatStatNumber(1234.5, 'de-DE', ' ms ', { style: 'currency' })).toBe('1.234,5 ms');
  });

  it('uses the runtime locale when the requested locale is invalid', () => {
    expect(formatStatNumber(1234.5, 'not_a_locale')).toBe(new Intl.NumberFormat().format(1234.5));
  });

  it.each([undefined, Number.NaN, Infinity, -Infinity])(
    'omits an invalid or absent reading (%s)',
    (value) => { expect(formatStatNumber(value, 'en-US', 'ms')).toBeUndefined(); },
  );

  it('S2 leaves the signed trend to the glyph and word even if the format requests a sign', () => {
    expect(formatStatNumber(-9, 'en-US', 'ms', { signDisplay: 'always' }, true)).toBe('9 ms');
  });
});

describe('deltaPresentation', () => {
  it.each([
    [9, 'higher-is-better', 'trending-up', 'success'],
    [-9, 'higher-is-better', 'trending-down', 'danger'],
    [9, 'lower-is-better', 'trending-up', 'danger'],
    [-9, 'lower-is-better', 'trending-down', 'success'],
    [-9, 'neutral', 'trending-down', 'neutral'],
    [9, 'unrecognized', 'trending-up', 'success'],
    [0, 'higher-is-better', undefined, 'neutral'],
    [-0, 'lower-is-better', undefined, 'neutral'],
  ])('S2 S4 maps a change of %s and preference %s', (delta, preference, icon, tone) => {
    expect(deltaPresentation(delta, preference)).toEqual({ icon, tone });
  });
});
