const MAX_LINES = 20;

export function normalizeSkeletonLines(lines: number): number {
  return Number.isFinite(lines) ? Math.min(MAX_LINES, Math.max(1, Math.trunc(lines))) : 1;
}
