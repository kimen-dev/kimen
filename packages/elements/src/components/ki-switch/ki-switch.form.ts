export function checkedFromMarkup(
  hasCheckedAttribute: boolean,
  parsedChecked: boolean | undefined,
): boolean {
  return hasCheckedAttribute || parsedChecked === true;
}

export function resolveSubmittedValue(checked: boolean, value: string | undefined): string | null {
  return checked ? (value ?? 'on') : null;
}
