// @spec:124-ki-date-picker
import { describe, expect, it } from 'vitest';
import {
  calendarLocale,
  daysForMonth,
  firstWeekday,
  formatValue,
  moveDate,
  normalizeValue,
  parseEntry,
} from './ki-date-picker.dates';

describe('date value', () => {
  it.each(['2026-02-29', '2026-11-31', '0000-01-01', '2026-1-05'])(
    'rejects impossible or noncanonical ISO date %s',
    (value) => {
      expect(normalizeValue(value, 'single')).toBeUndefined();
    },
  );

  it('keeps leap days and civil years below 100', () => {
    expect(normalizeValue('0004-02-29', 'single')).toBe('0004-02-29');
  });

  it('orders range endpoints and accepts equal endpoints', () => {
    expect(normalizeValue('2026-11-20/2026-11-12', 'range')).toBe('2026-11-12/2026-11-20');
    expect(normalizeValue('2026-11-12/2026-11-12', 'range')).toBe('2026-11-12/2026-11-12');
  });

  it('rejects a partial range', () => {
    expect(normalizeValue('2026-11-12', 'range')).toBeUndefined();
  });

  it('rejects out-of-bounds endpoints and inverted bounds', () => {
    expect(normalizeValue('2026-11-12/2026-11-20', 'range', '2026-11-13')).toBeUndefined();
    expect(normalizeValue('2026-11-20', 'single', '2026-11-21', '2026-11-19')).toBeUndefined();
  });
});

describe('localized entry', () => {
  it.each([
    ['en-GB', '20/11/2026'],
    ['en-US', '11/20/2026'],
    ['de-DE', '20.11.2026'],
    ['ja-JP', '2026/11/20'],
    ['ar-EG', '٢٠/١١/٢٠٢٦'],
  ])('parses the date order and digits in %s', (locale, entry) => {
    expect(parseEntry(entry, 'single', calendarLocale(locale))).toBe('2026-11-20');
  });

  it('round-trips ISO dates through Gregorian localized range text', () => {
    const locale = calendarLocale('th-TH');
    const range = '2026-11-12/2026-11-20';
    expect(parseEntry(formatValue(range, locale), 'range', locale)).toBe(range);
  });

  it('uses the page language when the supplied locale is malformed', () => {
    expect(calendarLocale('not_a_locale', 'en-GB')).toBe('en-GB');
  });

  it('resolves the week start and allows Sunday as an explicit override', () => {
    expect(firstWeekday('en-GB')).toBe(1);
    expect(firstWeekday('en-US')).toBe(0);
    expect(firstWeekday('en-GB', 0)).toBe(0);
  });

  it('rejects ambiguous short years and invalid calendar dates', () => {
    expect(parseEntry('20/11/26', 'single', 'en-GB')).toBeUndefined();
    expect(parseEntry('31/02/2026', 'single', 'en-GB')).toBeUndefined();
  });
});

describe('calendar navigation', () => {
  it('creates six weeks including adjacent months in locale order', () => {
    const weeks = daysForMonth('2026-11-12', 1);
    expect(weeks.map((week) => week.length)).toEqual([7, 7, 7, 7, 7, 7]);
    expect(weeks[0]?.[0]).toBe('2026-10-26');
    expect(weeks[5]?.[6]).toBe('2026-12-06');
  });

  it('does not create out-of-domain ISO dates at the civil year edges', () => {
    expect(daysForMonth('0001-01-01', 0)[0]?.[0]).toBeUndefined();
    expect(daysForMonth('9999-12-31', 1)[5]?.[6]).toBeUndefined();
  });

  it('clamps the month and year jumps at the end of shorter months', () => {
    expect(moveDate('2026-01-31', 'PageDown', 1, false, false)).toBe('2026-02-28');
    expect(moveDate('2024-02-29', 'PageUp', 1, true, false)).toBe('2023-02-28');
  });

  it('uses the first available day for a bounded week and reverses visual RTL arrows', () => {
    expect(moveDate('2026-11-12', 'Home', 1, false, false, '2026-11-11')).toBe('2026-11-11');
    expect(moveDate('2026-11-12', 'ArrowRight', 1, false, true)).toBe('2026-11-11');
  });
});
