import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { booleanFromAttributePresence, checkboxFormValue } from './ki-checkbox.form';

// @spec:006-ki-checkbox
describe('ki-checkbox', () => {
  it('S4 treats checked="false" as checked by boolean presence semantics', async () => {
    const { root } = await render(h('ki-checkbox', { checked: 'false' }, 'Email notifications'));
    const input = root.shadowRoot?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!input) {
      throw new Error('ki-checkbox did not render a native checkbox input');
    }

    expect(root.hasAttribute('checked')).toBe(true);
    expect(input.checked).toBe(true);
  });

  it('S4 renders native label anatomy with control and label parts', async () => {
    const { root } = await render(<ki-checkbox>Email notifications</ki-checkbox>);
    const label = root.shadowRoot?.querySelector('label');
    const input = label?.querySelector('input[type="checkbox"]');
    const control = label?.querySelector('[part="control"]');
    const labelPart = label?.querySelector('[part="label"]');
    const defaultSlot = labelPart?.querySelector('slot:not([name])');
    const namedSlots = root.shadowRoot?.querySelectorAll('slot[name]');
    const marks = control?.querySelectorAll('svg[aria-hidden="true"] path[stroke="currentColor"]');

    expect(label?.tagName).toBe('LABEL');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(control?.tagName).toBe('SPAN');
    expect(labelPart?.tagName).toBe('SPAN');
    expect(defaultSlot?.tagName).toBe('SLOT');
    expect(namedSlots?.length).toBe(0);
    expect(marks?.length).toBe(2);
  });

  it('S10 computes native checkbox form values', () => {
    expect(checkboxFormValue(true, undefined)).toBe('on');
    expect(checkboxFormValue(true, '')).toBe('');
    expect(checkboxFormValue(true, 'weekly')).toBe('weekly');
    expect(checkboxFormValue(false, undefined)).toBeNull();
    expect(checkboxFormValue(false, '')).toBeNull();
    expect(checkboxFormValue(false, 'weekly')).toBeNull();
  });

  it('S4 normalizes booleans from attribute presence', () => {
    expect(booleanFromAttributePresence(false, false)).toBe(false);
    expect(booleanFromAttributePresence(false, true)).toBe(true);
    expect(booleanFromAttributePresence(true, false)).toBe(true);
    expect(booleanFromAttributePresence(true, true)).toBe(true);
  });
});
