export type ComboboxFilter = 'contains' | 'starts-with' | 'none';

export const labelMatch: (
  label: string,
  query: string,
  filter: ComboboxFilter,
) => readonly [number, number] | null = () => null;

export const normalizedValues: (value: string | string[], multiple: boolean) => string[] = () => [];

export const offerCustom: (
  query: string,
  options: readonly { label: string; value: string }[],
  selected: readonly string[],
) => string | null = () => null;
