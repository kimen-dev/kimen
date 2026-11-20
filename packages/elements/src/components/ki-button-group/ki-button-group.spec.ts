import { describe, expect, it } from 'vitest';

import { resolveButtonOverride } from './ki-button-group.override';

describe('temporary button group attributes', () => {
  const group = {};
  const otherGroup = {};

  it('restores an originally absent attribute when the group releases it', () => {
    const held = resolveButtonOverride(null, undefined, group, 'sm');

    expect(resolveButtonOverride(held.value, held.override, group)).toEqual({
      value: null,
      override: undefined,
    });
  });

  it('keeps the latest author value after reapplying the group value', () => {
    const held = resolveButtonOverride('lg', undefined, group, 'sm');
    const updated = resolveButtonOverride('xl', held.override, group, 'sm');

    expect(resolveButtonOverride(updated.value, updated.override, group).value).toBe('xl');
  });

  it('preserves the author value if the attribute changes just before release', () => {
    const held = resolveButtonOverride('lg', undefined, group, 'sm');

    expect(resolveButtonOverride('xl', held.override, group).value).toBe('xl');
  });

  it('preserves the authored attribute when the button moves between groups', () => {
    const held = resolveButtonOverride('secondary', undefined, group, 'primary');
    const moved = resolveButtonOverride(held.value, held.override, otherGroup, 'ghost');

    expect(resolveButtonOverride(moved.value, moved.override, group)).toEqual(moved);
    expect(resolveButtonOverride(moved.value, moved.override, otherGroup).value).toBe('secondary');
  });
});
