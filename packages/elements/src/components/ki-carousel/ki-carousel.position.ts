export function wholeStep(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

export function leadingLimit(count: number, view: number): number {
  return Math.max(1, count - wholeStep(view) + 1);
}

export function normalizeIndex(value: number, limit: number): number {
  return Math.min(limit, wholeStep(value));
}

export function movementTarget(
  current: number,
  step: number,
  limit: number,
  loop: boolean,
): number {
  if (loop && current === limit && step > 0) return 1;
  if (loop && current === 1 && step < 0) return limit;
  return normalizeIndex(current + step, limit);
}
