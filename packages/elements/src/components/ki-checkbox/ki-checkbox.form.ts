export function booleanFromAttributePresence(current: boolean, hasAttribute: boolean): boolean {
  return current || hasAttribute;
}

export function checkboxFormValue(checked: boolean, value: string | undefined): string | null {
  if (!checked) {
    return null;
  }

  return value ?? 'on';
}
