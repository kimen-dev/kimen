/** A deliberate downward gesture, measured in CSS pixels. */
export function isDownwardSwipe(deltaX: number, deltaY: number): boolean {
  return deltaY >= 48 && deltaY > Math.abs(deltaX);
}
