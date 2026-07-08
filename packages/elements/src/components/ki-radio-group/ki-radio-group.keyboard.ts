export type ArrowKey = 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp';

export function nextEnabledIndex(
  disabledStates: readonly boolean[],
  currentIndex: number,
  direction: -1 | 1,
): number | null {
  const count = disabledStates.length;

  if (count === 0 || disabledStates.every(Boolean)) {
    return null;
  }

  for (let step = 1; step <= count; step += 1) {
    const index = (currentIndex + direction * step + count) % count;
    if (!disabledStates[index]) {
      return index;
    }
  }

  return null;
}

export function arrowDirection(key: string, isRtl: boolean): -1 | 1 | null {
  if (key === 'ArrowDown') {
    return 1;
  }
  if (key === 'ArrowUp') {
    return -1;
  }
  if (key === 'ArrowRight') {
    return isRtl ? -1 : 1;
  }
  if (key === 'ArrowLeft') {
    return isRtl ? 1 : -1;
  }

  return null;
}
