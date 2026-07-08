export type KiProgressShape = 'linear' | 'circular';

export function normalizeMax(raw: number | undefined): number {
  void raw;
  return 0;
}

export function clampValue(raw: number | undefined, max: number): number {
  void raw;
  void max;
  return 0;
}

export function resolveShape(raw: string | undefined): KiProgressShape {
  void raw;
  return 'linear';
}
