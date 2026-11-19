import type { NavigationIntent } from './keyboard-intent';

interface RovingFocusOptions<T> {
  wrap?: boolean;
  isFocusable?: (item: T) => boolean;
}

/**
 * Finds an eligible destination in the caller's ordered roster. By default all
 * items are eligible and movement stops at the ends. With no current index,
 * next starts at the first item and previous starts at the last. Returns null
 * if there is no destination. Wrapping can return the current item.
 */
export function rovingFocusIndex<T>(
  items: readonly T[],
  currentIndex: number,
  intent: NavigationIntent,
  { isFocusable = () => true, wrap = false }: RovingFocusOptions<T> = {},
): number | null {
  const count = items.length;
  const step = intent === 'previous' || intent === 'last' ? -1 : 1;
  const startAtEdge =
    intent === 'first' || intent === 'last' || currentIndex < 0 || currentIndex >= count;
  const edge = step === 1 ? 0 : count - 1;
  const from = startAtEdge ? edge : currentIndex + step;
  let match = findFocusableIndex(items, from, step, isFocusable);
  if (match < 0 && wrap && !startAtEdge) {
    match = findFocusableIndex(items, edge, step, isFocusable);
  }
  return match < 0 ? null : match;
}

/** Searches from the given index up to a roster boundary, or returns -1. */
export function findFocusableIndex<T>(
  items: readonly T[],
  from: number,
  step: -1 | 1,
  isFocusable: (item: T) => boolean,
): number {
  for (let index = from; index >= 0 && index < items.length; index += step) {
    const item = items[index];
    if (item !== undefined && isFocusable(item)) {
      return index;
    }
  }
  return -1;
}

/** Projects the caller's chosen tab stop to a roster item's tabindex. */
export function rovingTabIndex(index: number, tabStopIndex: number): 0 | -1 {
  return index === tabStopIndex ? 0 : -1;
}
