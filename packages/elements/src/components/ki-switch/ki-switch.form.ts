export function resolveSubmittedValue(checked: boolean, value: string | undefined): string | null {
  return checked ? (value ?? 'on') : null;
}
