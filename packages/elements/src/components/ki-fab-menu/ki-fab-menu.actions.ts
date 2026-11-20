export function fabMenuActionValue(value: string | undefined, label: string | null): string {
  return value ?? label?.trim() ?? '';
}
