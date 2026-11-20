/** The native length IDL attributes accept nonnegative signed long integers. */
export function normalizeLengthLimit(limit: number | undefined): number | undefined {
  return limit !== undefined && Number.isInteger(limit) && limit >= 0 && limit <= 2147483647
    ? limit
    : undefined;
}

/** Match native text lengths, which count UTF-16 code units. */
export function countText(length: number, limit: number): string {
  return `${String(length)} / ${String(limit)}`;
}

/**
 * The next polite live-region text, or undefined while still in the same
 * threshold state. Returning below the limit clears the region for reuse.
 */
export function fieldCountAnnouncement(
  previousLength: number,
  length: number,
  limit: number | undefined,
): string | undefined {
  if (limit === undefined || Math.sign(previousLength - limit) === Math.sign(length - limit)) {
    return undefined;
  }
  return length < limit ? '' : countText(length, limit);
}
