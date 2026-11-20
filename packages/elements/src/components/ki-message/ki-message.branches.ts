export function replyBranches(
  index: number,
  count: number,
): { index: number; count: number } | undefined {
  if (!Number.isSafeInteger(count) || count < 2) return undefined;
  return { index: Number.isSafeInteger(index) ? Math.min(count, Math.max(1, index)) : 1, count };
}
