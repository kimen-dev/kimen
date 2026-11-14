export type KeyIntent =
  | 'open-selected'
  | 'open-first'
  | 'open-last'
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'commit'
  | 'close'
  | 'tab'
  | 'type'
  | null;

export interface KeyboardOption {
  disabled: boolean;
}

export interface TypeaheadOption extends KeyboardOption {
  label: string;
}

/**
 * Characters typed within this window extend one search string; a longer
 * pause starts a new one (the interval the APG select-only example uses).
 */
export const TYPEAHEAD_RESET_MS = 500;

export function firstEnabled(options: readonly KeyboardOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

export function lastEnabled(options: readonly KeyboardOption[]): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    const option = options[index];
    if (option && !option.disabled) {
      return index;
    }
  }
  return -1;
}

export function moveHighlight(
  options: readonly KeyboardOption[],
  currentIndex: number,
  direction: 'next' | 'previous',
): number {
  const step = direction === 'next' ? 1 : -1;
  let index = currentIndex + step;

  while (index >= 0 && index < options.length) {
    const option = options[index];
    if (option && !option.disabled) {
      return index;
    }
    index += step;
  }

  return currentIndex >= 0 && !options[currentIndex]?.disabled
    ? currentIndex
    : firstEnabled(options);
}

export function openHighlight(options: readonly KeyboardOption[], selectedIndex: number): number {
  return selectedIndex >= 0 && !options[selectedIndex]?.disabled
    ? selectedIndex
    : firstEnabled(options);
}

/**
 * APG select-only typeahead: the index of the enabled option whose label
 * starts with `typed` (case-insensitive), or -1. A single character searches
 * from the option AFTER `currentIndex`, so repeating a letter walks its
 * matches; a longer string searches from `currentIndex` itself, so typing on
 * refines the match in place. A repeated letter that no label starts with
 * ("pp") keeps walking the options that start with that letter.
 */
export function typeaheadIndex(
  options: readonly TypeaheadOption[],
  typed: string,
  currentIndex: number,
): number {
  const needle = typed.toLowerCase();
  const matchFrom = (start: number, prefix: string): number => {
    for (let step = 0; step < options.length; step += 1) {
      const index = (start + step) % options.length;
      const option = options[index];
      if (option && !option.disabled && option.label.toLowerCase().startsWith(prefix)) {
        return index;
      }
    }
    return -1;
  };

  const next = currentIndex + 1;
  const match = matchFrom(needle.length > 1 ? Math.max(currentIndex, 0) : next, needle);
  const repeated = needle.length > 1 && needle === needle.charAt(0).repeat(needle.length);
  return match < 0 && repeated ? matchFrom(next, needle.charAt(0)) : match;
}

/** Space is excluded: it opens the closed select and commits in the open one. */
function isPrintable(key: string): boolean {
  return key.length === 1 && key !== ' ';
}

export function keyIntent(key: string, open: boolean): KeyIntent {
  if (!open) {
    if (key === 'Enter' || key === ' ') {
      return 'open-selected';
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      return 'open-selected';
    }
    if (key === 'Home') {
      return 'open-first';
    }
    if (key === 'End') {
      return 'open-last';
    }
    return isPrintable(key) ? 'type' : null;
  }

  if (key === 'ArrowDown') {
    return 'next';
  }
  if (key === 'ArrowUp') {
    return 'previous';
  }
  if (key === 'Home') {
    return 'first';
  }
  if (key === 'End') {
    return 'last';
  }
  if (key === 'Enter' || key === ' ') {
    return 'commit';
  }
  if (key === 'Escape') {
    return 'close';
  }
  if (key === 'Tab') {
    return 'tab';
  }
  return isPrintable(key) ? 'type' : null;
}
