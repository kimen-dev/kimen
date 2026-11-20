const TYPEAHEAD_RESET_MS = 500;

/** Adds a character, starting a new prefix after a gap over 500 ms. */
export function extendTypeahead(text: string, character: string, elapsedMs: number): string {
  return elapsedMs > TYPEAHEAD_RESET_MS ? character : text + character;
}

/**
 * Finds the index of a case-insensitive prefix match, wrapping once, or -1.
 * One character starts after the current item. Longer prefixes start at it
 * so they can refine the match in place. A repeated initial cycles through
 * matches for that initial if the full prefix has no match.
 */
export function typeaheadIndex<T extends { label: string; disabled?: boolean }>(
  items: readonly T[],
  typed: string,
  currentIndex: number,
  isFocusable: (item: T) => boolean = (item) => !item.disabled,
): number {
  const needle = typed.toLowerCase();
  const start = needle.length > 1 ? Math.max(currentIndex, 0) : currentIndex + 1;
  for (let offset = 0; offset < items.length; offset += 1) {
    const index = (start + offset) % items.length;
    const item = items[index];
    if (item && isFocusable(item) && item.label.toLowerCase().startsWith(needle)) {
      return index;
    }
  }

  const initial = needle.charAt(0);
  if (needle.length > 1 && needle === initial.repeat(needle.length)) {
    return typeaheadIndex(items, initial, currentIndex, isFocusable);
  }
  return -1;
}
