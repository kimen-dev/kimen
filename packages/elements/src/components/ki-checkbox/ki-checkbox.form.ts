export function checkboxFormValue(checked: boolean, value: string | undefined): string | null {
  if (!checked) {
    return null;
  }

  return value ?? 'on';
}
