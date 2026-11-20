import { describe, expect, it } from 'vitest';
import { parseFormatDate } from './format-date';

describe('Format date input', () => {
  it('preserves the calendar day in UTC', () => {
    const result = parseFormatDate('2024-02-29');
    expect(result?.calendarDate).toBe(true);
    expect(result?.date.toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });

  it('interprets an offsetless timestamp as local time', () => {
    const result = parseFormatDate('2026-11-19T08:41');
    expect(result?.calendarDate).toBe(false);
    expect(result?.date.getHours()).toBe(8);
    expect(result?.date.getMinutes()).toBe(41);
  });

  it('interprets a timestamp with an offset as an instant', () => {
    const result = parseFormatDate('2026-11-19T08:41:00.125+01:00');
    expect(result?.date.toISOString()).toBe('2026-11-19T07:41:00.125Z');
  });

  it.each([
    undefined,
    '',
    '2023-02-29',
    '2026-04-31T04:00:00Z',
    '2026-00-01',
    '2026-11-19T24:01',
    '2026-11-19T12:40+26:00',
    '2026-11-19T12:40+01:99',
    '11/19/2026',
    '2026',
  ])('rejects the invalid date %s', (value) => {
    expect(parseFormatDate(value)).toBeUndefined();
  });
});
