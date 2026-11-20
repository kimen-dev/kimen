import { describe, expect, it } from 'vitest';
import { labelMatcher, normalizedValues, offerCustom } from './ki-combobox.options';

describe('labelMatch', () => {
  it('finds matches case insensitively with indices into the original label', () => {
    expect(labelMatcher('AN', 'contains')('Juan Antón')).toEqual([2, 4]);
    expect(labelMatcher('AN', 'starts-with')('Ana Ruiz')).toEqual([0, 2]);
    expect(labelMatcher('AN', 'starts-with')('Juan Antón')).toBeNull();
  });

  it('retains all options without emphasis for empty or server queries', () => {
    expect(labelMatcher('missing', 'none')('Ana Ruiz')).toEqual([0, 0]);
    expect(labelMatcher(' ', 'contains')('Ana Ruiz')).toEqual([0, 0]);
  });

  it('keeps highlight boundaries in UTF-16 coordinates when folding changes length', () => {
    expect(labelMatcher('ANA', 'contains')('İl Ana')).toEqual([3, 6]);
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
