/**
 * The shortest time between two automatic moves (spec 123 Amendment A1).
 * Faster changes can flash more than three times a second (WCAG 2.2 SC 2.3.1)
 * and leave no time to read a slide.
 */
export const ROTATION_FLOOR_MS = 5000;

/** The longest delay a browser timer honors. */
const MAX_INTERVAL_MS = 2_147_483_647;

/** The interval to rotate at for an `autoplay` value, or 0 when rotation is off. */
export function rotationInterval(autoplay: number | undefined): number {
  if (typeof autoplay !== 'number' || !Number.isFinite(autoplay) || autoplay < 1) return 0;
  return Math.min(Math.max(autoplay, ROTATION_FLOOR_MS), MAX_INTERVAL_MS);
}

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
