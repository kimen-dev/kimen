export function checkboxGroupConstraint(
  _count: number,
  _min?: number,
  _max?: number,
): 'valueMissing' | 'rangeOverflow' | undefined {
  throw new Error(
    `Pending checkbox group constraints for ${String(_count)}, ${String(_min)} and ${String(_max)}`,
  );
}

export function checkboxGroupFormValue(
  _name: string | undefined,
  _values: readonly string[],
): FormData | null {
  throw new Error(
    `Pending checkbox group form data for ${String(_name)} with ${String(_values.length)} values`,
  );
}
