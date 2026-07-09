export interface SelectOptionRecord {
  value: string;
  label: string;
  disabled: boolean;
}

export function normalizeBooleanPresence(value: unknown): boolean {
  return value !== false && value !== null && value !== undefined;
}

export function optionValue(value: string | null | undefined, label: string): string {
  return value ?? label.trim();
}

export function optionLabelText(node: Node): string {
  return node.textContent ?? '';
}

export function resolveSelection<T extends SelectOptionRecord>(
  options: readonly T[],
  value: string,
): T | null {
  return options.find((option) => option.value === value) ?? null;
}

export function selectFormValue(option: SelectOptionRecord | null): string | null {
  return option ? option.value : null;
}

export function selectValueMissing(required: boolean, submittedValue: string | null): boolean {
  return required && (submittedValue === null || submittedValue === '');
}
