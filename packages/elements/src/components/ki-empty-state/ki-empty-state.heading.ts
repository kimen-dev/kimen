export function resolveHeadingLevel(attribute: string | null, level: number): number {
  if (attribute !== null) {
    return /^[1-6]$/u.test(attribute) ? Number(attribute) : 3;
  }
  return Number.isInteger(level) && level >= 2 && level <= 6 ? level : 3;
}
