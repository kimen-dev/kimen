const KI_TEXTAREA_DEFAULT_ROWS = 2;

export function normalizeKiTextareaRows(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return KI_TEXTAREA_DEFAULT_ROWS;
  }

  return Math.floor(numeric);
}
