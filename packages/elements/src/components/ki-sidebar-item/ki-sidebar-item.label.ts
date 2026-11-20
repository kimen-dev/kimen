export const DEFAULT_COUNT_LABEL = '{label}, {count} new';

export function normalizeSidebarCount(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 1) return undefined;
  return Math.floor(value);
}

export function formatSidebarLabel(
  label: string,
  count: number | undefined,
  template: string | undefined,
): string {
  if (!label || count === undefined) return label;
  const pattern =
    template?.includes('{label}') && template.includes('{count}') ? template : DEFAULT_COUNT_LABEL;
  return pattern.replace(/\{(label|count)\}/gu, (_match, key: string) =>
    key === 'label' ? label : String(count),
  );
}
