import type { KiListSelection, KiListValue } from './ki-list';

export function listSelectionValue(mode: KiListSelection, selected: string[]): KiListValue {
  if (mode === 'multiple') return selected;
  return mode === 'single' ? (selected[0] ?? null) : null;
}

export function listFormValue(
  name: string | undefined,
  value: KiListValue,
): string | FormData | null {
  if (!name || value === null) return null;
  if (typeof value === 'string') return value;
  if (value.length === 0) return null;
  const data = new FormData();
  for (const selected of value) data.append(name, selected);
  return data;
}
