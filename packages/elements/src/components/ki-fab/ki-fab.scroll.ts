/** Bounds the viewport position so elastic overscroll does not count as a change of direction. */
export function viewportScrollPosition(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  return Math.min(maxScroll, Math.max(0, scrollY));
}
