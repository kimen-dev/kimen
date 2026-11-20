import { describe, expect, it } from 'vitest';

import { checkboxGroupConstraint, checkboxGroupFormValue } from './ki-checkbox-group.form';

describe('checkbox group constraints', () => {
  it.each([
    [0, 1, undefined, 'valueMissing'],
    [1, 1, 1, undefined],
    [2, 1, 1, 'rangeOverflow'],
    [1, undefined, 0, 'rangeOverflow'],
    [0, undefined, 0, undefined],
    [0, -1, Number.NaN, undefined],
    [0, 0.5, Infinity, undefined],
    [1, 2, 0, 'valueMissing'],
  ])('validates count %s against min %s and max %s', (count, min, max, result) => {
    expect(checkboxGroupConstraint(count, min, max)).toBe(result);
  });
});

describe('checkbox group form data', () => {
  it('contributes one ordered entry per selected option, including equal and empty values', () => {
    const result = checkboxGroupFormValue('regions', ['eu', 'am', 'eu', '']);
    expect(result === null ? null : [...result]).toEqual([
      ['regions', 'eu'],
      ['regions', 'am'],
      ['regions', 'eu'],
      ['regions', ''],
    ]);
  });

  it('contributes nothing without a name or selected options', () => {
    expect(checkboxGroupFormValue(undefined, ['eu'])).toBeNull();
    expect(checkboxGroupFormValue('', ['eu'])).toBeNull();
    expect(checkboxGroupFormValue('regions', [])).toBeNull();
  });
});
