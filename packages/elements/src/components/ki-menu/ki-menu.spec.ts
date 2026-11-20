import { describe, expect, it } from 'vitest';

import { menuItemMatches, menuNavigationIndex } from './ki-menu.keyboard';

describe('menu navigation', () => {
  it('wraps in both directions and handles missing current focus', () => {
    expect(menuNavigationIndex('next', 2, 3)).toBe(0);
    expect(menuNavigationIndex('previous', 0, 3)).toBe(2);
    expect(menuNavigationIndex('next', -1, 3)).toBe(0);
    expect(menuNavigationIndex('previous', -1, 3)).toBe(2);
  });

  it('finds either edge and treats an empty menu as having no destination', () => {
    expect(menuNavigationIndex('first', 1, 3)).toBe(0);
    expect(menuNavigationIndex('last', 1, 3)).toBe(2);
    expect(menuNavigationIndex('next', 0, 0)).toBe(-1);
  });

  it('matches a substring without case or surrounding whitespace', () => {
    expect(menuItemMatches('Pin to sidebar', '  SIDEBAR ')).toBe(true);
    expect(menuItemMatches('Duplicate', 'pin')).toBe(false);
    expect(menuItemMatches('Duplicate', '')).toBe(true);
  });
});
