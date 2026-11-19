import { getKeyboardIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';

export function nextEnabledIndex(
  disabledStates: readonly boolean[],
  currentIndex: number,
  direction: -1 | 1,
): number | null {
  return rovingFocusIndex(disabledStates, currentIndex, direction === 1 ? 'next' : 'previous', {
    isFocusable: (disabled) => !disabled,
    wrap: true,
  });
}

export function arrowDirection(key: string, isRtl: boolean): -1 | 1 | null {
  const intent = getKeyboardIntent(key, 'both', isRtl ? 'rtl' : 'ltr');
  if (intent === 'next') {
    return 1;
  }
  return intent === 'previous' ? -1 : null;
}
