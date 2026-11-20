import { describe, expect, it } from 'vitest';
import { viewportScrollPosition } from './ki-fab.scroll';

describe('FAB viewport scroll position', () => {
  it.each([
    { scrollY: 125.5, scrollHeight: 2000, viewportHeight: 800, expected: 125.5 },
    { scrollY: -12, scrollHeight: 2000, viewportHeight: 800, expected: 0 },
    { scrollY: 1225, scrollHeight: 2000, viewportHeight: 800, expected: 1200 },
    { scrollY: 20, scrollHeight: 600, viewportHeight: 800, expected: 0 },
  ])(
    'bounds scroll position $scrollY to $expected',
    ({ scrollY, scrollHeight, viewportHeight, expected }) => {
      expect(viewportScrollPosition(scrollY, scrollHeight, viewportHeight)).toBe(expected);
    },
  );
});
