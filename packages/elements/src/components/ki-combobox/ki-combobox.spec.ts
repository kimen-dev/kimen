import { describe, expect, it } from 'vitest';
import { labelMatch, normalizedValues, offerCustom } from './ki-combobox.options';

describe('labelMatch', () => {
  it('finds matches case insensitively with indices into the original label', () => {
    expect(labelMatch('Juan Antón', 'AN', 'contains')).toEqual([2, 4]);
    expect(labelMatch('Ana Ruiz', 'AN', 'starts-with')).toEqual([0, 2]);
    expect(labelMatch('Juan Antón', 'AN', 'starts-with')).toBeNull();
  });

  it('retains all options without emphasis for empty or server queries', () => {
    expect(labelMatch('Ana Ruiz', 'missing', 'none')).toEqual([0, 0]);
    expect(labelMatch('Ana Ruiz', ' ', 'contains')).toEqual([0, 0]);
  });

  it('keeps highlight boundaries in UTF-16 coordinates when folding changes length', () => {
    expect(labelMatch('İl Ana', 'ANA', 'contains')).toEqual([3, 6]);
  });
});

describe('normalizedValues', () => {
  it('deduplicates arrays without changing order or trimming values', () => {
    expect(normalizedValues(['bug', 'search', 'bug', ' spaced '], true)).toEqual([
      'bug',
      'search',
      ' spaced ',
    ]);
  });

  it('decodes a multiple attribute without splitting values containing delimiters', () => {
    expect(normalizedValues('["a,b","x"]', true)).toEqual(['a,b', 'x']);
    expect(normalizedValues('a,b', true)).toEqual(['a,b']);
    expect(normalizedValues('["x"]', false)).toEqual(['["x"]']);
  });
});

it('offers trimmed custom text only when no known or selected value matches', () => {
  const options = [{ label: 'Ana Ruiz', value: 'ana' }];
  expect(offerCustom(' search ', options, [])).toBe('search');
  expect(offerCustom(' ANA ', options, [])).toBeNull();
  expect(offerCustom('ANA RUIZ', options, [])).toBeNull();
  expect(offerCustom('SEARCH', options, ['search'])).toBeNull();
  expect(offerCustom(' ', options, [])).toBeNull();
});
