// @spec:105-ki-top-nav
import { describe, expect, it } from 'vitest';

import { appBarSize, headingTag, hasCenteredTitle } from './ki-top-nav.layout';

describe('TopNav app-bar layout', () => {
  it('S4: collapses only large sizes when the page opts into collapse', () => {
    expect(appBarSize('lg', 'collapse', true)).toBe('md');
    expect(appBarSize('xl', 'collapse', true)).toBe('md');
    expect(appBarSize('xl', 'collapse', false)).toBe('xl');
    expect(appBarSize('lg', 'elevate', true)).toBe('lg');
    expect(appBarSize('sm', 'collapse', true)).toBe('sm');
    expect(appBarSize('other', 'collapse', true)).toBe('md');
  });

  it('S6: centers single-row titles on compact bars with zero or one action', () => {
    expect(hasCenteredTitle('sm', 'center', true, 0)).toBe(true);
    expect(hasCenteredTitle('md', 'center', true, 1)).toBe(true);
    expect(hasCenteredTitle('md', 'center', true, 2)).toBe(false);
    expect(hasCenteredTitle('xl', 'center', true, 1)).toBe(false);
    expect(hasCenteredTitle('sm', 'center', false, 1)).toBe(false);
    expect(hasCenteredTitle('sm', 'start', true, 1)).toBe(false);
  });

  it('S14: picks a real heading and safely falls back to level one', () => {
    expect(headingTag(3)).toBe('h3');
    expect(headingTag(6)).toBe('h6');
    expect(headingTag(2.5)).toBe('h1');
    expect(headingTag(7)).toBe('h1');
    expect(headingTag(Number.NaN)).toBe('h1');
  });
});
