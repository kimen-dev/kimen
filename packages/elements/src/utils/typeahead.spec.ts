import { describe, expect, it } from 'vitest';
import { extendTypeahead, typeaheadIndex } from './typeahead';

const items = [
  { label: 'Portugal', disabled: false },
  { label: 'Peru', disabled: true },
  { label: 'Poland', disabled: false },
  { label: 'Spain', disabled: false },
];

describe('extendTypeahead', () => {
  it('starts the prefix with the first character', () => {
    expect(extendTypeahead('', 'P', 100)).toBe('P');
  });

  it('appends at exactly 500 ms', () => {
    expect(extendTypeahead('p', 'o', 500)).toBe('po');
  });

  it('starts a fresh prefix after more than 500 ms', () => {
    expect(extendTypeahead('po', 's', 501)).toBe('s');
  });
});

describe('typeaheadIndex', () => {
  it('searches case-insensitively after the current index and wraps', () => {
    expect(typeaheadIndex(items, 'P', 0)).toBe(2);
    expect(typeaheadIndex(items, 'p', 2)).toBe(0);
    expect(typeaheadIndex(items, 'p', -1)).toBe(0);
  });

  it('includes or skips disabled items according to the chosen focus policy', () => {
    expect(typeaheadIndex(items, 'pe', 0)).toBe(-1);
    expect(typeaheadIndex(items, 'pe', 0, () => true)).toBe(1);
  });

  it('starts longer prefixes at the current index to refine a match in place', () => {
    expect(typeaheadIndex(items, 'po', 2)).toBe(2);
    expect(typeaheadIndex(items, 'por', 2)).toBe(0);
  });

  it('tries the full prefix before cycling through repeated initials', () => {
    expect(typeaheadIndex([...items, { label: 'PPT' }], 'pp', 0)).toBe(4);
    expect(typeaheadIndex(items, 'pp', 1)).toBe(2);
  });

  it('reports no match for a missing prefix or an empty roster', () => {
    expect(typeaheadIndex(items, 'xy', 0)).toBe(-1);
    expect(typeaheadIndex([], 'p', -1)).toBe(-1);
  });
});
