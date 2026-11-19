export function checkboxGroupConstraint(
  count: number,
  min?: number,
  max?: number,
): 'valueMissing' | 'rangeOverflow' | undefined {
  if (isCount(min) && count < min) return 'valueMissing';
  if (isCount(max) && count > max) return 'rangeOverflow';
  return undefined;
}

function isCount(bound: number | undefined): bound is number {
  return bound !== undefined && Number.isInteger(bound) && bound >= 0;
}

export function checkboxGroupFormValue(
  name: string | undefined,
  values: readonly string[],
): FormData | null {
  if (!name || values.length === 0) return null;

  const data = new FormData();
  for (const value of values) data.append(name, value);
  return data;
}
