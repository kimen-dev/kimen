export function copySourceText(
  source: { textContent: string | null; value?: unknown } | null,
): string | undefined {
  const value = source?.value;
  return typeof value === 'string' ? value : (source?.textContent ?? undefined);
}

export function feedbackTimeout(duration: number): number {
  if (!Number.isFinite(duration) || duration < 0) return 1500;
  return Math.min(duration, 2_147_483_647);
}
