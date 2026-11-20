/** The half-open range of levels represented by the overflow menu. */
export function getCollapsedRange(
  count: number,
  maxItems?: number,
): { start: number; end: number } | undefined {
  if (maxItems === undefined || !Number.isFinite(maxItems) || maxItems <= 0) {
    return undefined;
  }
  const threshold = Math.max(4, Math.floor(maxItems));
  return count > threshold ? { start: 1, end: count - 2 } : undefined;
}

export function formatMoreLabel(template: string, count: number): string {
  return template.replaceAll('{n}', String(count));
}
