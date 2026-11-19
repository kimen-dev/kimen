export function resolveHeadingLevel(level: number): number {
  return Number.isInteger(level) && level >= 2 && level <= 6 ? level : 3;
}
