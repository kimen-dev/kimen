// @spec:125-ki-audio
import { describe, expect, it } from 'vitest';

import { formatPlaybackTime, parsePlaybackRates } from './ki-audio.media';

describe('audio display time', () => {
  it.each([
    [0, '0:00'],
    [84.9, '1:24'],
    [725, '12:05'],
    [3607, '1:00:07'],
    [Number.NaN, '0:00'],
    [Number.POSITIVE_INFINITY, '0:00'],
    [-10, '0:00'],
  ])('formats %s seconds as %s', (seconds, text) => {
    expect(formatPlaybackTime(seconds)).toBe(text);
  });
});

describe('available playback rates', () => {
  it('keeps unique supported decimal rates in author order and includes normal speed', () => {
    expect(parsePlaybackRates(' 1.5, .75, 1.50, 0x1, 0, -1, 5, NaN, .25, 4 ')).toEqual([
      1.5, 0.75, 0.25, 4, 1,
    ]);
  });

  it('uses the standard rates when every entry is invalid', () => {
    expect(parsePlaybackRates('Fast,,Infinity,0')).toEqual([0.75, 1, 1.25, 1.5, 2]);
  });
});
