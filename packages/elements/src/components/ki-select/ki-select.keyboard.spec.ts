import { describe, expect, it } from 'vitest';
import {
  firstEnabled,
  keyIntent,
  lastEnabled,
  moveHighlight,
  openHighlight,
  typeaheadIndex,
} from './ki-select.keyboard';

// @spec:005-ki-select
describe('ki-select keyboard helpers', () => {
  it('S7 S10 S22 S23 computes non-wrapping disabled-skipping highlight movement', () => {
    const options = [
      { disabled: true },
      { disabled: false },
      { disabled: true },
      { disabled: false },
    ];

    expect(firstEnabled(options)).toBe(1);
    expect(lastEnabled(options)).toBe(3);
    expect(openHighlight(options, 3)).toBe(3);
    expect(openHighlight(options, 0)).toBe(1);
    expect(moveHighlight(options, 1, 'next')).toBe(3);
    expect(moveHighlight(options, 3, 'next')).toBe(3);
    expect(moveHighlight(options, 3, 'previous')).toBe(1);
    expect(moveHighlight([{ disabled: true }], -1, 'next')).toBe(-1);
  });

  it('S7 S8 S9 S10 S21 S27 maps approved keys to intents and excludes the APG-optional ones', () => {
    expect(keyIntent('ArrowDown', false)).toBe('open-selected');
    expect(keyIntent('Home', false)).toBe('open-first');
    expect(keyIntent('End', false)).toBe('open-last');
    expect(keyIntent('ArrowDown', true)).toBe('next');
    expect(keyIntent('ArrowUp', true)).toBe('previous');
    expect(keyIntent('Enter', true)).toBe('commit');
    expect(keyIntent(' ', true)).toBe('commit');
    expect(keyIntent('Escape', true)).toBe('close');
    expect(keyIntent('Tab', true)).toBe('tab');
    expect(keyIntent('f', true)).toBe('type');
    expect(keyIntent('F', false)).toBe('type');
    expect(keyIntent('7', true)).toBe('type');
    expect(keyIntent(' ', false)).toBe('open-selected');
    expect(keyIntent('PageDown', true)).toBeNull();
    expect(keyIntent('PageUp', false)).toBeNull();
    expect(keyIntent('Shift', true)).toBeNull();
  });

  const typeaheadCountries = [
    { label: 'Spain', disabled: false },
    { label: 'France', disabled: false },
    { label: 'Portugal', disabled: false },
    { label: 'Poland', disabled: false },
  ];

  it.each([
    { typed: 'f', from: 0, expected: 1, rule: 'moves forward to the match' },
    { typed: 's', from: 2, expected: 0, rule: 'wraps past the end of the list' },
    { typed: 'F', from: 0, expected: 1, rule: 'ignores letter case' },
    { typed: 'f', from: -1, expected: 1, rule: 'starts at the top when nothing is active' },
    { typed: 'p', from: 2, expected: 3, rule: 'moves a single character on to the next match' },
    { typed: 'p', from: 3, expected: 2, rule: 'wraps a single character back to the first match' },
    { typed: 'f', from: 1, expected: 1, rule: 'stays when the active option is the only match' },
    { typed: 'po', from: 2, expected: 2, rule: 'refines a longer string in place' },
    { typed: 'pol', from: 2, expected: 3, rule: 'moves once the longer string stops matching' },
    { typed: 'pp', from: 2, expected: 3, rule: 'walks the matches of a repeated character' },
    { typed: 'pf', from: 2, expected: -1, rule: 'reports no match for an unknown string' },
    { typed: 'x', from: 0, expected: -1, rule: 'reports no match for an unknown character' },
  ])('S27 typeahead $rule ("$typed" from $from)', ({ typed, from, expected }) => {
    expect(typeaheadIndex(typeaheadCountries, typed, from)).toBe(expected);
  });

  it('S27 S22 typeahead never lands on a disabled option and tolerates an empty list', () => {
    const options = [
      { label: 'Spain', disabled: false },
      { label: 'Portugal', disabled: true },
      { label: 'Poland', disabled: false },
    ];

    expect(typeaheadIndex(options, 'p', 0)).toBe(2);
    expect(typeaheadIndex(options, 'por', 0)).toBe(-1);
    expect(typeaheadIndex([], 'p', -1)).toBe(-1);
  });
});
