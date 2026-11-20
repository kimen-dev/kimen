import { describe, expect, it } from 'vitest';
import { getKeyboardIntent, isNavigationIntent } from './keyboard-intent';

describe('getKeyboardIntent', () => {
  it.each([
    ['ArrowRight', 'horizontal', 'ltr', 'next'],
    ['ArrowLeft', 'horizontal', 'ltr', 'previous'],
    ['ArrowRight', 'horizontal', 'rtl', 'previous'],
    ['ArrowLeft', 'horizontal', 'rtl', 'next'],
    ['ArrowUp', 'horizontal', 'ltr', null],
    ['ArrowDown', 'horizontal', 'rtl', null],
    ['ArrowUp', 'vertical', 'rtl', 'previous'],
    ['ArrowDown', 'vertical', 'ltr', 'next'],
    ['ArrowLeft', 'vertical', 'ltr', null],
    ['ArrowRight', 'vertical', 'rtl', null],
    ['ArrowLeft', 'both', 'rtl', 'next'],
    ['ArrowUp', 'both', 'rtl', 'previous'],
    ['Home', 'vertical', 'rtl', 'first'],
    ['End', 'horizontal', 'ltr', 'last'],
    ['Enter', 'both', 'ltr', 'activate'],
    [' ', 'vertical', 'ltr', 'activate'],
    ['Escape', 'horizontal', 'ltr', 'close'],
    ['Tab', 'both', 'ltr', null],
    ['a', 'both', 'ltr', null],
    ['constructor', 'vertical', 'ltr', null],
  ] as const)('maps %s on the %s axis in %s to %s', (key, orientation, direction, intent) => {
    expect(getKeyboardIntent(key, orientation, direction)).toBe(intent);
  });

  it('identifies the four navigation intents', () => {
    expect(isNavigationIntent('next')).toBe(true);
    expect(isNavigationIntent('previous')).toBe(true);
    expect(isNavigationIntent('first')).toBe(true);
    expect(isNavigationIntent('last')).toBe(true);
    expect(isNavigationIntent('activate')).toBe(false);
    expect(isNavigationIntent('close')).toBe(false);
    expect(isNavigationIntent(null)).toBe(false);
  });
});
