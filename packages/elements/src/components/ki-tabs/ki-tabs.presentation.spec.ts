import { describe, expect, it } from 'vitest';
import { resolveIconLayout, type KiTabsVariant } from './ki-tabs.presentation';

describe('resolveIconLayout', () => {
  it.each([
    ['primary', undefined, 'stacked'],
    ['secondary', undefined, 'inline'],
    ['primary', 'inline', 'inline'],
    ['secondary', 'stacked', 'stacked'],
    ['primary', 'unknown', 'stacked'],
    ['secondary', 'unknown', 'inline'],
  ] satisfies [KiTabsVariant, string | undefined, string][])(
    'uses %s with the %s override to resolve %s',
    (variant, override, expected) => {
      expect(resolveIconLayout(variant, override)).toBe(expected);
    },
  );
});
