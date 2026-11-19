import {
  getKeyboardIntent,
  isNavigationIntent,
  type KeyboardDirection,
  type NavigationIntent,
} from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';
import type { TabRecord } from './ki-tabs.selection';

const isFocusable = (tab: TabRecord): boolean => !tab.disabled && !tab.duplicate;

export function nextSelectableIndex(
  tabs: readonly TabRecord[],
  currentIndex: number,
  direction: 'next' | 'previous',
): number | null {
  // A direct child can fire keydown before it has joined the slot roster.
  // Previous starts before the last tab and stops at the first in that case.
  if (currentIndex === -1 && direction === 'previous' && tabs.length > 1) {
    return rovingFocusIndex(tabs, tabs.length - 1, direction, { isFocusable });
  }
  return rovingFocusIndex(tabs, currentIndex, direction, { isFocusable, wrap: true });
}

export function firstSelectableIndex(tabs: readonly TabRecord[]): number | null {
  return rovingFocusIndex(tabs, -1, 'first', { isFocusable });
}

export function lastSelectableIndex(tabs: readonly TabRecord[]): number | null {
  return rovingFocusIndex(tabs, -1, 'last', { isFocusable });
}

export function navigationIntentForKey(
  key: string,
  direction: KeyboardDirection,
): NavigationIntent | null {
  const intent = getKeyboardIntent(key, 'horizontal', direction);
  return isNavigationIntent(intent) ? intent : null;
}
