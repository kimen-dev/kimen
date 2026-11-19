import { describe, expect, it } from 'vitest';
import { rovingFocusIndex, rovingTabIndex } from './roving-focus';

const items = [
  { disabled: true },
  { disabled: false },
  { disabled: true },
  { disabled: false },
  { disabled: true },
];
const isFocusable = (item: { disabled: boolean }): boolean => !item.disabled;

describe('rovingFocusIndex', () => {
  it('finds the next, previous, first and last eligible indices in the original roster', () => {
    const options = { isFocusable };
    expect(rovingFocusIndex(items, 1, 'next', options)).toBe(3);
    expect(rovingFocusIndex(items, 3, 'previous', options)).toBe(1);
    expect(rovingFocusIndex(items, 3, 'first', options)).toBe(1);
    expect(rovingFocusIndex(items, 1, 'last', options)).toBe(3);
  });

  it('can land on aria-disabled items when the caller keeps them focusable', () => {
    expect(rovingFocusIndex(items, 1, 'next')).toBe(2);
    expect(rovingFocusIndex(items, 1, 'first')).toBe(0);
  });

  it('reports no destination at the boundaries unless wrapping is enabled', () => {
    expect(rovingFocusIndex(items, 3, 'next', { isFocusable })).toBeNull();
    expect(rovingFocusIndex(items, 1, 'previous', { isFocusable })).toBeNull();
    expect(rovingFocusIndex(items, 3, 'next', { isFocusable, wrap: true })).toBe(1);
    expect(rovingFocusIndex(items, 1, 'previous', { isFocusable, wrap: true })).toBe(3);
  });

  it('starts from the corresponding end when no item is current', () => {
    expect(rovingFocusIndex(items, -1, 'next', { isFocusable, wrap: true })).toBe(1);
    expect(rovingFocusIndex(items, -1, 'previous', { isFocusable, wrap: true })).toBe(3);
    expect(rovingFocusIndex(items, items.length, 'next', { isFocusable })).toBe(1);
  });

  it('handles empty and ineligible rosters and can wrap back to the only eligible item', () => {
    expect(rovingFocusIndex([], -1, 'next', { wrap: true })).toBeNull();
    expect(
      rovingFocusIndex([{ disabled: true }], 0, 'next', { isFocusable, wrap: true }),
    ).toBeNull();
    expect(rovingFocusIndex([{ disabled: false }], 0, 'next', { isFocusable, wrap: true })).toBe(0);
  });
});

describe('rovingTabIndex', () => {
  it('assigns a single tab stop when an active index is present', () => {
    expect([0, 1, 2].map((index) => rovingTabIndex(index, 1))).toEqual([-1, 0, -1]);
  });

  it('keeps all items out of the Tab order when there is no active index', () => {
    expect([0, 1, 2].map((index) => rovingTabIndex(index, -1))).toEqual([-1, -1, -1]);
  });
});
