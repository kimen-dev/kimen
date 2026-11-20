const DEFAULT_MAX = 5;
const MAX_GLYPHS = 10;

export function ratingMax(max: number): number {
  return Number.isFinite(max) ? Math.min(MAX_GLYPHS, Math.max(1, Math.floor(max))) : DEFAULT_MAX;
}

export function ratingStep(precision: number): 1 | 0.5 {
  return precision === 0.5 ? 0.5 : 1;
}

export function ratingValue(value: number, max: number, step: 0 | 1 | 0.5): number {
  const score = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
  return step === 0 ? score : Math.round(score / step) * step;
}
