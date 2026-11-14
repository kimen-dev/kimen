export interface RadioGroupFormOption {
  disabled: boolean;
  value?: string;
}

export function radioGroupFormValue(option: RadioGroupFormOption | null): string | null {
  if (!option || option.disabled) {
    return null;
  }

  return option.value ?? 'on';
}
