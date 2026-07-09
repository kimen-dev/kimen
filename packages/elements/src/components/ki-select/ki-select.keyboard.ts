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
  | null;

export interface KeyboardOption {
  disabled: boolean;
}

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
    return null;
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
  return null;
}
