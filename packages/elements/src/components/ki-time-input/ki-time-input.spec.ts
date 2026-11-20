import { describe, expect, it } from 'vitest';
import {
  createTimeLocale,
  formatCanonicalTime,
  parseCanonicalTime,
  timeBounds,
  timeSlots,
} from './ki-time-input.time';

describe('canonical time', () => {
  it.each([
    ['00:00', 0],
    ['09:17', 557],
    ['23:59', 1439],
  ])('round-trips %s without seconds, dates or timezone conversion', (value, minutes) => {
    expect(parseCanonicalTime(value)).toBe(minutes);
    expect(formatCanonicalTime(minutes)).toBe(value);
  });

  it.each(['', '9:00', '24:00', '12:60', '09:00:00', ' 09:00', '09:00Z'])(
    'rejects a noncanonical value %j',
    (value) => {
      expect(parseCanonicalTime(value)).toBeUndefined();
    },
  );
});

describe('localized time', () => {
  it.each([
    ['en-US', '9:17 AM', 557],
    ['en-US', '9:17pm', 1277],
    ['en-US', '12:00 AM', 0],
    ['en-US', '12:00 PM', 720],
    ['en-US', '00:30', 30],
    ['en-GB', '9:17', 557],
    ['fi-FI', '9.17', 557],
    ['ar-EG', '٩:١٧ م', 1277],
  ])('parses %s input %s', (locale, text, minutes) => {
    expect(createTimeLocale(locale).parse(text)).toBe(minutes);
  });

  it.each(['13:00 PM', '9:3 AM', '9:30 AM tomorrow', '12:60 PM', '09:30:00'])(
    'rejects invalid text %j',
    (text) => {
      expect(createTimeLocale('en-US').parse(text)).toBeUndefined();
    },
  );

  it.each(['en-US', 'en-GB', 'ar-EG', 'fi-FI', 'en-US-u-hc-h24'])(
    'round-trips displayed values in %s including midnight and noon',
    (locale) => {
      const format = createTimeLocale(locale);
      expect([0, 17, 720, 1439].map((value) => format.parse(format.format(value)))).toEqual([
        0, 17, 720, 1439,
      ]);
    },
  );

  it('uses a supported fallback on a malformed language tag', () => {
    const expected = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(557 * 60_000);
    expect(createTimeLocale('not_a_language', 'en-GB').format(557)).toBe(expected);
  });
});

describe('suggested slots', () => {
  it('anchors suggestions at the lower bound and includes the upper bound when aligned', () => {
    expect(timeSlots(timeBounds('08:15', '09:15'), 30)).toEqual([495, 525, 555]);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('replaces an invalid step %j with 30', (step) => {
    expect(timeSlots(timeBounds('23:00', undefined), step)).toEqual([1380, 1410]);
  });

  it('keeps an inverted range empty', () => {
    expect(timeSlots(timeBounds('18:00', '08:00'), 30)).toEqual([]);
  });

  it('uses day endpoints for absent or malformed bounds', () => {
    expect(timeBounds(undefined, '25:00')).toEqual({ min: 0, max: 1439 });
  });
});
