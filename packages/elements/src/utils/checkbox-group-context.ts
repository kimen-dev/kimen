/** Internal coordination between two independently form-associated elements. */
export interface CheckboxGroupContext {
  disabled: boolean;
  optionChanged(option: HTMLElement): void;
}

export const checkboxGroups = new WeakMap<HTMLElement, CheckboxGroupContext>();
export const checkboxGroupOptions = new WeakMap<Element, () => void>();

/** Only direct children in the default slot belong to a checkbox group. */
export function checkboxGroupFor(option: HTMLElement): CheckboxGroupContext | undefined {
  const parent = option.parentElement;
  return parent && option.slot === '' ? checkboxGroups.get(parent) : undefined;
}
