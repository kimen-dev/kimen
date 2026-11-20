import { describe, expect, it } from 'vitest';
import { formatElapsedTime } from './ki-reasoning.duration';

const labels = {
  done: 'Thought',
  singular: 'Thought for {seconds} second',
  plural: 'Thought for {seconds} seconds',
};

describe('formatElapsedTime', () => {
  it.each([
    [0, 'Thought for 0 seconds'],
    [499, 'Thought for 0 seconds'],
    [500, 'Thought for 1 second'],
    [1499, 'Thought for 1 second'],
    [1500, 'Thought for 2 seconds'],
    [12000, 'Thought for 12 seconds'],
  ])('formats %i milliseconds as %s', (duration, expected) => {
    expect(formatElapsedTime(duration, labels)).toBe(expected);
  });

  it.each([undefined, -1, Number.NaN, Infinity, -Infinity])(
    'uses untimed wording when duration is %s',
    (duration) => {
      expect(formatElapsedTime(duration, labels)).toBe('Thought');
    },
  );

  it('uses a translated label without assuming the position of the number', () => {
    expect(
      formatElapsedTime(1000, {
        ...labels,
        singular: '{seconds} Sekunde nachgedacht',
      }),
    ).toBe('1 Sekunde nachgedacht');
  });
});
