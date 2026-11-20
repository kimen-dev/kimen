export type KiListSelection = 'none' | 'single' | 'multiple';
export type KiListValue = string | string[] | null;

export function listSelectionValue(mode: KiListSelection, selected: string[]): KiListValue {
  return mode === 'none' ? null : (selected[0] ?? null);
}

export function listFormValue(
  name: string | undefined,
  value: KiListValue,
): string | FormData | null {
  return name && typeof value === 'string' ? value : null;
}
