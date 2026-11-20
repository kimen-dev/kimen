import { describe, expect, it } from 'vitest';
import { formatTimelineDate, orderTimelineItems, parseTimelineDate } from './ki-timeline.time';

describe('timeline dates', () => {
  it('reads zone offsets and local wall time', () => {
    expect(parseTimelineDate('2026-11-19T10:41:05.125+02:00')).toBe(
      Date.UTC(2026, 10, 19, 8, 41, 5, 125),
    );
    expect(parseTimelineDate('2026-11-19T10:41')).toBe(new Date(2026, 10, 19, 10, 41).getTime());
  });

  it('reads a leap-day date as local midnight', () => {
    expect(parseTimelineDate('2024-02-29')).toBe(new Date(2024, 1, 29).getTime());
  });

  it.each([undefined, '', '11/19/2026', '2025-02-29', '2026-04-31', '2026-11-19T25:00Z'])(
    'rejects an absent or impossible ISO value (%s)',
    (value) => {
      expect(parseTimelineDate(value)).toBeUndefined();
    },
  );

  it.each([
    ['2026-11-19T11:57Z', 3, 'minute'],
    ['2026-11-19T10:00Z', 2, 'hour'],
  ] as const)('formats a recent event (%s) in the requested locale', (value, amount, unit) => {
    const now = Date.UTC(2026, 10, 19, 12);

    expect(formatTimelineDate(value, Date.parse(value), now, 'fr')).toBe(
      new Intl.RelativeTimeFormat('fr').format(-amount, unit),
    );
  });

  it.each([
    ['2026-11-18T12:00Z', Date.UTC(2026, 10, 18, 12)],
    ['2026-11-20T00:00Z', Date.UTC(2026, 10, 20)],
  ] as const)('formats dates outside the recent range as absolute (%s)', (value, timestamp) => {
    const far = formatTimelineDate(value, timestamp, timestamp + 172_800_000, 'en');
    const absolute = formatTimelineDate(value, timestamp, Date.UTC(2026, 10, 19, 12), 'en');

    expect(absolute).toBe(far);
    expect(absolute).toMatch(/2026/u);
  });

  it('keeps a date-only value absolute throughout its day', () => {
    const value = '2026-11-19';
    const timestamp = new Date(2026, 10, 19).getTime();
    const near = formatTimelineDate(value, timestamp, timestamp + 60_000, 'en');
    const far = formatTimelineDate(value, timestamp, timestamp + 172_800_000, 'en');

    expect(near).toBe(far);
    expect(near).toMatch(/2026/u);
  });
});

describe('timeline order', () => {
  it.each([
    ['newest-first', ['merge', 'build', 'review', 'note', 'comment']],
    ['oldest-first', ['review', 'merge', 'build', 'note', 'comment']],
  ] as const)('preserves source order across ties and undated entries (%s)', (order, expected) => {
    const events = [
      { id: 'note', timestamp: undefined },
      { id: 'merge', timestamp: 20 },
      { id: 'review', timestamp: 10 },
      { id: 'comment', timestamp: undefined },
      { id: 'build', timestamp: 20 },
    ];

    expect(orderTimelineItems(events, order).map(({ id }) => id)).toEqual(expected);
    expect(events.map(({ id }) => id)).toEqual(['note', 'merge', 'review', 'comment', 'build']);
  });
});
