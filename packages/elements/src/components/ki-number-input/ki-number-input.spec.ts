import { expect, it } from 'vitest';
import { createNumberCodec, readNumberFormat, stepNumber } from './ki-number-input.numeric';

it('displays currency with the supplied locale and keeps full precision in the editor', () => {
  const options = { style: 'currency', currency: 'EUR' } as const;
  const codec = createNumberCodec('de-DE', options);

  expect(codec.display(1234.567)).toBe(new Intl.NumberFormat('de-DE', options).format(1234.567));
  expect(codec.edit(1234.567)).toBe('1234,567');
  expect(codec.parse(codec.edit(1234.567))).toBe(1234.567);
});

it('converts percentage points in both directions without multiplying binary rounding errors', () => {
  const codec = createNumberCodec('de-DE', { style: 'percent' });

  expect(codec.edit(0.145)).toBe('14,5');
  expect(codec.parse('14,5')).toBe(0.145);
  expect(codec.parse('14,5 %')).toBe(0.145);
});

it('recognizes localized digits, grouping and the decimal separator', () => {
  const codec = createNumberCodec('ar-EG');

  expect(codec.edit(-1234.5)).toBe('-١٢٣٤٫٥');
  expect(codec.parse('؜-١٬٢٣٤٫٥')).toBe(-1234.5);
});

it('accepts grouped currency pasted in its configured locale', () => {
  const codec = createNumberCodec('de-DE', { style: 'currency', currency: 'EUR' });

  expect(codec.parse(codec.display(-1234.5))).toBe(-1234.5);
});

it.each([
  ['en-US', '1,234.', 1234],
  ['de-DE', '+1.234,5E+2', 123450],
  ['hi-IN', '12,34,567.89', 1234567.89],
  ['fr-FR', '1 234,5', 1234.5],
])('parses valid grouping in %s for %j', (locale, text, value) => {
  expect(createNumberCodec(locale).parse(text)).toBe(value);
});

it.each([
  ['en-US', '12,34'],
  ['en-US', '1234,567'],
  ['en-US', ',123'],
  ['en-US', '123,'],
  ['en-US', '1,,234'],
  ['en-US', '1,234.5,67'],
  ['en-US', '1,234e1,000'],
  ['hi-IN', '1,234,567'],
  ['ar-EG', '١٬٢.٣'],
])('rejects malformed grouping in %s for %j', (locale, text) => {
  expect(createNumberCodec(locale).parse(text)).toBeUndefined();
});

it.each(['junk', '0x10', '12 seats', '12.5.4', '2,2', 'Infinity', '1e309', ''])(
  'rejects invalid English numeric input %j',
  (text) => {
    expect(createNumberCodec('en-US').parse(text)).toBeUndefined();
  },
);

it.each(['{', 'null', '[]', '42', '{"style":"currency"}'])(
  'falls back to the plain display for unusable format %j',
  (attribute) => {
    expect(createNumberCodec('en-US', readNumberFormat(attribute)).display(1000.1257)).toBe(
      '1000.1257',
    );
  },
);

it('rejects a duplicated format affix', () => {
  const codec = createNumberCodec('en-US', { style: 'percent' });

  expect(codec.parse('12%%')).toBeUndefined();
});

it('parses a JSON options object for callers using HTML', () => {
  expect(readNumberFormat('{"style":"percent"}')).toEqual({ style: 'percent' });
});

it.each([
  [0.1, 0.2, 1, undefined, undefined, 0.3],
  [0.3, 0.1, -1, undefined, undefined, 0.2],
  [0.1, 0.05, 10, undefined, undefined, 0.6],
  [0, 1e-25, 1, undefined, undefined, 1e-25],
  [10, 0.2, 10, 0, 10.3, 10.3],
  [2, 0, -1, undefined, undefined, 1],
  [undefined, 2, -1, 4, 30, 4],
  [1, 1, 1, 1, 0, 2],
])('steps %j by %j × %j in the configured range', (value, step, count, min, max, expected) => {
  expect(stepNumber(value, step, count, min, max)).toBe(expected);
});
