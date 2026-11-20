import { expect, it } from 'vitest';

import { formatToolCallDuration } from './ki-tool-call.duration';

it.each([
  [0, '0 ms'],
  [999, '999 ms'],
  [1000, '1 sec'],
  [1200, '1.2 sec'],
  [1234, '1.234 sec'],
])('formats a duration of %d milliseconds as %s', (duration, text) => {
  expect(formatToolCallDuration(duration, 'en')).toBe(text);
});

it.each([undefined, -1, Number.NaN, Number.POSITIVE_INFINITY])(
  'omits an invalid duration of %s',
  (duration) => {
    expect(formatToolCallDuration(duration, 'en')).toBeUndefined();
  },
);

it('uses localized numbers and falls back to English for an invalid language tag', () => {
  expect(formatToolCallDuration(1200, 'fr')).toContain('1,2');
  expect(formatToolCallDuration(1200, 'invalid_locale')).toBe('1.2 sec');
});
