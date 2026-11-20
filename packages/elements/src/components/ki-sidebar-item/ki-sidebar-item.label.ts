export function normalizeSidebarCount(value: number | undefined): number | undefined {
  return value;
}

export function formatSidebarLabel(
  label: string,
  count: number | undefined,
  template: string,
): string {
  return count === undefined ? label : template;
}
