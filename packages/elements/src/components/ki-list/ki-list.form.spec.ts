import { describe, expect, it } from 'vitest';
import { listFormValue, listSelectionValue } from './ki-list.form';

describe('list form value', () => {
  it('uses a string or null for single selection and an ordered array for multiple selection', () => {
    expect(listSelectionValue('single', ['ana', 'sara'])).toBe('ana');
    expect(listSelectionValue('single', [])).toBeNull();
    expect(listSelectionValue('multiple', ['ana', 'sara'])).toEqual(['ana', 'sara']);
    expect(listSelectionValue('multiple', [])).toEqual([]);
    expect(listSelectionValue('none', ['ana'])).toBeNull();
  });

  it('keeps an explicitly empty option and repeats the form name in row order', () => {
    expect(listFormValue('reviewers', '')).toBe('');
    const multi = listFormValue('reviewers', ['ana', 'sara']);
    expect(multi instanceof FormData && [...multi.entries()]).toEqual([
      ['reviewers', 'ana'],
      ['reviewers', 'sara'],
    ]);
  });

  it('omits unnamed and unselected lists', () => {
    expect(listFormValue('', ['ana'])).toBeNull();
    expect(listFormValue('reviewers', [])).toBeNull();
    expect(listFormValue('reviewers', null)).toBeNull();
  });
});
