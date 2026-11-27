import { describe, expect, it } from 'vitest';
import {
  optionValue,
  resolveSelection,
  type SelectOptionRecord,
  selectFormValue,
  selectValueMissing,
} from './ki-select.form';

// @spec:005-ki-select
describe('ki-select form helpers', () => {
  it('S5 resolves selection and value helpers with native select parity', () => {
    const options: SelectOptionRecord[] = [
      { value: 'fr', label: 'France', disabled: false },
      { value: 'fr', label: 'France duplicate', disabled: false },
      { value: '', label: 'Empty', disabled: false },
    ];

    expect(resolveSelection(options, 'fr')).toBe(options[0]);
    expect(resolveSelection(options, 'missing')).toBeNull();
    expect(optionValue(null, ' France ')).toBe('France');
    expect(selectFormValue(null)).toBeNull();
    expect(selectFormValue(options[2] ?? null)).toBe('');
    expect(selectValueMissing(true, null)).toBe(true);
    expect(selectValueMissing(true, '')).toBe(true);
    expect(selectValueMissing(true, 'fr')).toBe(false);
  });
});
