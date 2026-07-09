import type { TabRecord } from './ki-tabs.selection';

export type NavigationIntent = 'next' | 'previous' | 'first' | 'last' | null;

export function nextSelectableIndex(
  tabs: TabRecord[],
  currentIndex: number,
  direction: 'next' | 'previous',
): number | null {
  void tabs;
  void currentIndex;
  void direction;
  return null;
}

export function firstSelectableIndex(tabs: TabRecord[]): number | null {
  void tabs;
  return null;
}

export function lastSelectableIndex(tabs: TabRecord[]): number | null {
  void tabs;
  return null;
}

export function navigationIntentForKey(key: string, dir: 'ltr' | 'rtl'): NavigationIntent {
  void key;
  void dir;
  return null;
}
