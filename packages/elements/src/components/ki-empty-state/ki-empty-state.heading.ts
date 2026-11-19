export function resolveHeadingLevel(input: number | string | null): number {
  const level = Number(input);
  return Number.isInteger(level) && level >= 2 && level <= 6 ? level : 3;
}
