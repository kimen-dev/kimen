export type TopNavSize = 'sm' | 'md' | 'lg' | 'xl';

export function appBarSize(size: string, behavior: string, scrolled: boolean): TopNavSize {
  if (size === 'lg' || size === 'xl') {
    return behavior === 'collapse' && scrolled ? 'md' : size;
  }
  return size === 'sm' ? 'sm' : 'md';
}

export function hasCenteredTitle(
  size: TopNavSize,
  align: string,
  compact: boolean,
  actionCount: number,
): boolean {
  return compact && align === 'center' && (size === 'sm' || size === 'md') && actionCount <= 1;
}

export function headingTag(level: number): string {
  return Number.isInteger(level) && level >= 1 && level <= 6 ? `h${String(level)}` : 'h1';
}
