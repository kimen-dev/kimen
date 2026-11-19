import {
  getVerticalKeyboardIntent,
  type KeyboardIntent,
  type NavigationIntent,
} from '../../utils/keyboard-intent';
import { findFocusableIndex } from '../../utils/roving-focus';

type KeyIntent = KeyboardIntent | 'tab' | 'type' | null;

interface KeyboardOption {
  disabled: boolean;
}

const isFocusable = (option: KeyboardOption): boolean => !option.disabled;

export function firstEnabled(options: readonly KeyboardOption[]): number {
  return options.findIndex(isFocusable);
}

export function moveHighlight(
  options: readonly KeyboardOption[],
  currentIndex: number,
  intent: NavigationIntent,
): number {
  if (intent === 'first') {
    return firstEnabled(options);
  }
  if (intent === 'last') {
    return findFocusableIndex(options, options.length - 1, -1, isFocusable);
  }
  const step = intent === 'next' ? 1 : -1;
  const match = findFocusableIndex(options, currentIndex + step, step, isFocusable);
  return match < 0 ? openHighlight(options, currentIndex) : match;
}

export function openHighlight(options: readonly KeyboardOption[], selectedIndex: number): number {
  const selected = options[selectedIndex];
  return selected && isFocusable(selected) ? selectedIndex : firstEnabled(options);
}

export function keyIntent(key: string, open: boolean): KeyIntent {
  const intent = getVerticalKeyboardIntent(key) ?? (key === 'Tab' ? 'tab' : null);
  if (!open && (intent === 'close' || intent === 'tab')) {
    return null;
  }
  return intent ?? (key.length === 1 ? 'type' : null);
}
