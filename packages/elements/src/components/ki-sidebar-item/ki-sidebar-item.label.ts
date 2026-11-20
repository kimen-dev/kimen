export const DEFAULT_COUNT_LABEL = '{label}, {count} new';

export function normalizeSidebarCount(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 1) return undefined;
  return Math.floor(value);
}

export function sidebarCountLabelParts(
  label: string,
  count: number | undefined,
  template: string | undefined,
): [before: string, after: string] {
  if (!label || count === undefined) return ['', ''];
  const labelToken = '{label}';
  const pattern =
    template?.includes(labelToken) && template.includes('{count}') ? template : DEFAULT_COUNT_LABEL;
  const [before = '', ...after] = pattern.split(labelToken);
  const substitute = (part: string) =>
    part.replace(/\{(label|count)\}/gu, (_match, key: string) =>
      key === 'label' ? label : String(count),
    );
  return [substitute(before), substitute(after.join(labelToken))];
}
