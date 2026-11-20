import { describe, expect, it } from 'vitest';
import { describeRelativeTime } from './ki-relative-time.timing';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

describe('relative-time formatting boundaries', () => {
  it('stays in seconds until a full minute of past time has elapsed', () => {
    expect(describeRelativeTime(-59_999)).toEqual({
      value: -59,
      unit: 'second',
      nextDelay: 1,
    });
    expect(describeRelativeTime(-MINUTE)).toEqual({
      value: -1,
      unit: 'minute',
      nextDelay: MINUTE,
    });
  });

  it('advances from weeks to months as soon as 30 days elapse', () => {
    expect(describeRelativeTime(-29 * DAY)).toEqual({
      value: -4,
      unit: 'week',
      nextDelay: DAY,
    });
  });

  it('moves down a unit as soon as a future time is inside its boundary', () => {
    expect(describeRelativeTime(MINUTE)).toEqual({ value: 1, unit: 'minute', nextDelay: 1 });
    expect(describeRelativeTime(MINUTE - 1)).toEqual({
      value: 59,
      unit: 'second',
      nextDelay: SECOND,
    });
  });

  it('keeps zero stable across the present until one second has elapsed', () => {
    expect(describeRelativeTime(300)).toEqual({
      value: 0,
      unit: 'second',
      nextDelay: 1300,
    });
    expect(describeRelativeTime(-1)).toEqual({ value: 0, unit: 'second', nextDelay: 999 });
  });

  it('reaches a subsecond threshold even when the future wording rounds to zero', () => {
    expect(describeRelativeTime(300, 0.5)).toEqual({
      value: 0,
      unit: 'second',
      nextDelay: 800,
    });
  });

  it('schedules the threshold ahead of the next relative unit boundary', () => {
    expect(describeRelativeTime(-65_000, 90)).toEqual({
      value: -1,
      unit: 'minute',
      nextDelay: 25_000,
    });
    expect(describeRelativeTime(-90_000, 90)).toEqual({});
  });

  it('wakes at the relative window for future absolute dates', () => {
    expect(describeRelativeTime(95_000, 90)).toEqual({ nextDelay: 5001 });
    expect(describeRelativeTime(90_000, 90)).toEqual({ nextDelay: 1 });
    expect(describeRelativeTime(0, 0)).toEqual({});
  });
});
