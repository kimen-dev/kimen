export type KeyboardOrientation = 'horizontal' | 'vertical' | 'both';
export type KeyboardDirection = 'ltr' | 'rtl';
export type NavigationIntent = 'next' | 'previous' | 'first' | 'last';
export type KeyboardIntent = NavigationIntent | 'activate' | 'close';

/** Maps keys to intent. The caller selects which intents its pattern handles. */
export function getKeyboardIntent(
  key: string,
  orientation: KeyboardOrientation,
  direction: KeyboardDirection = 'ltr',
): KeyboardIntent | null {
  if (orientation !== 'vertical') {
    if (key === 'ArrowRight') {
      return direction === 'rtl' ? 'previous' : 'next';
    }
    if (key === 'ArrowLeft') {
      return direction === 'rtl' ? 'next' : 'previous';
    }
  }
  if (orientation === 'horizontal' && (key === 'ArrowUp' || key === 'ArrowDown')) {
    return null;
  }
  return getVerticalKeyboardIntent(key);
}

const verticalIntents: Readonly<Record<string, KeyboardIntent | null>> = {
  __proto__: null,
  ArrowDown: 'next',
  ArrowUp: 'previous',
  Home: 'first',
  End: 'last',
  Enter: 'activate',
  ' ': 'activate',
  Escape: 'close',
};

/** Vertical-only intent mapping for callers that always use Up and Down. */
export function getVerticalKeyboardIntent(key: string): KeyboardIntent | null {
  return verticalIntents[key] ?? null;
}

export function isNavigationIntent(intent: KeyboardIntent | null): intent is NavigationIntent {
  return intent === 'next' || intent === 'previous' || intent === 'first' || intent === 'last';
}
