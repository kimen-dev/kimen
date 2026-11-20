/** Maps a visual arrow to a bounded position in DOM order. */
export function adjacentIndex(
  key: 'ArrowLeft' | 'ArrowRight',
  direction: string,
  index: number,
  count: number,
): number {
  const forward = (key === 'ArrowRight') !== (direction === 'rtl');
  return Math.max(0, Math.min(count - 1, index + (forward ? 1 : -1)));
}

/** Substitutes the documented placeholders without rewriting label content. */
export function positionAnnouncement(
  template: string,
  label: string,
  index: number,
  count: number,
): string {
  const values: Record<string, string> = {
    label,
    position: String(index + 1),
    total: String(count),
  };
  return template.replace(
    /\{(label|position|total)\}/gu,
    (placeholder, key: string) => values[key] ?? placeholder,
  );
}
