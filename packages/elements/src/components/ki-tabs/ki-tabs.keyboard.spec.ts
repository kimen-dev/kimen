import { describe, expect, it } from 'vitest';
import {
  firstSelectableIndex,
  lastSelectableIndex,
  navigationIntentForKey,
  nextSelectableIndex,
} from './ki-tabs.keyboard';
import type { TabRecord } from './ki-tabs.selection';

const tabs: TabRecord[] = [
  { value: 'email', disabled: false, duplicate: false },
  { value: 'billing', disabled: true, duplicate: false },
  { value: 'notifications', disabled: false, duplicate: false },
  { value: 'notifications', disabled: false, duplicate: true },
];

// @spec:014-ki-tabs
describe('ki-tabs keyboard', () => {
  it('S13 finds next and previous selectable tabs with wrap and duplicate skipping', () => {
    expect(nextSelectableIndex(tabs, 0, 'next')).toBe(2);
    expect(nextSelectableIndex(tabs, 2, 'next')).toBe(0);
    expect(nextSelectableIndex(tabs, 0, 'previous')).toBe(2);
    expect(
      nextSelectableIndex([{ value: 'one', disabled: false, duplicate: false }], 0, 'next'),
    ).toBe(0);
    expect(
      nextSelectableIndex([{ value: 'one', disabled: true, duplicate: false }], 0, 'next'),
    ).toBeNull();
  });

  it('S5 S14 finds first and last selectable tabs', () => {
    expect(firstSelectableIndex(tabs)).toBe(0);
    expect(lastSelectableIndex(tabs)).toBe(2);
    expect(firstSelectableIndex([{ value: 'one', disabled: true, duplicate: false }])).toBeNull();
    expect(lastSelectableIndex([{ value: 'one', disabled: true, duplicate: false }])).toBeNull();
  });

  it('S4 S16 maps horizontal arrows through writing direction plus Home and End', () => {
    expect(navigationIntentForKey('ArrowRight', 'ltr')).toBe('next');
    expect(navigationIntentForKey('ArrowLeft', 'ltr')).toBe('previous');
    expect(navigationIntentForKey('ArrowRight', 'rtl')).toBe('previous');
    expect(navigationIntentForKey('ArrowLeft', 'rtl')).toBe('next');
    expect(navigationIntentForKey('Home', 'ltr')).toBe('first');
    expect(navigationIntentForKey('End', 'rtl')).toBe('last');
    expect(navigationIntentForKey('ArrowDown', 'ltr')).toBeNull();
  });
});
