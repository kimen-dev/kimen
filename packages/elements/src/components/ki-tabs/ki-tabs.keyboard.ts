import type { TabRecord } from './ki-tabs.selection';

export type NavigationIntent = 'next' | 'previous' | 'first' | 'last' | null;

export function nextSelectableIndex(
  tabs: TabRecord[],
  currentIndex: number,
  direction: 'next' | 'previous',
): number | null {
  if (tabs.length === 0 || tabs.every((tab) => tab.disabled || tab.duplicate)) {
    return null;
  }

  const step = direction === 'next' ? 1 : -1;

  for (let offset = 1; offset <= tabs.length; offset += 1) {
    const index = (currentIndex + offset * step + tabs.length) % tabs.length;
    const tab = tabs[index];

    if (tab && !tab.disabled && !tab.duplicate) {
      return index;
    }
  }

  return null;
}

export function firstSelectableIndex(tabs: TabRecord[]): number | null {
  const index = tabs.findIndex((tab) => !tab.disabled && !tab.duplicate);
  return index >= 0 ? index : null;
}

export function lastSelectableIndex(tabs: TabRecord[]): number | null {
  for (let index = tabs.length - 1; index >= 0; index -= 1) {
    const tab = tabs[index];

    if (tab && !tab.disabled && !tab.duplicate) {
      return index;
    }
  }

  return null;
}

export function navigationIntentForKey(key: string, dir: 'ltr' | 'rtl'): NavigationIntent {
  if (key === 'Home') {
    return 'first';
  }

  if (key === 'End') {
    return 'last';
  }

  if (key === 'ArrowRight') {
    return dir === 'rtl' ? 'previous' : 'next';
  }

  if (key === 'ArrowLeft') {
    return dir === 'rtl' ? 'next' : 'previous';
  }

  return null;
}
