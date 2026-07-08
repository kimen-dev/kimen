export function normalizeMax(raw: number | undefined): number {
  return raw === undefined || !Number.isFinite(raw) || raw <= 0 ? 100 : raw;
}

export function clampValue(raw: number | undefined, max: number): number {
  if (raw === undefined || !Number.isFinite(raw)) {
    return 0;
  }

  return Math.min(max, Math.max(0, raw));
}

export function resolveShape(raw: string | undefined): 'linear' | 'circular' {
  return raw === 'circular' ? 'circular' : 'linear';
}
