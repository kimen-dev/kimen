import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { normalizeKiTextareaRows } from './ki-textarea.form';

// @spec:004-ki-textarea
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-textarea', () => {
  it('S6 renders unknown rows values with the default internal rows count', async () => {
    const { root } = await render(h('ki-textarea', { label: 'Delivery notes', rows: 'tall' }));
    const textarea = root.shadowRoot?.querySelector('textarea');

    expect(textarea?.tagName).toBe('TEXTAREA');
    expect(textarea?.getAttribute('rows')).toBe('2');
  });

  it('S9 renders the textarea anatomy without slots or light-DOM value content', async () => {
    const { root } = await render(
      h('ki-textarea', { label: 'Delivery notes', value: 'Attribute default' }, 'Ignored child'),
    );
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const field = root.shadowRoot?.querySelector('[part="field"]');
    const textarea = root.shadowRoot?.querySelector('textarea[part="textarea"]');

    expect(label?.tagName).toBe('LABEL');
    expect(field?.tagName).toBe('DIV');
    expect(textarea?.tagName).toBe('TEXTAREA');
    expect(label?.getAttribute('for')).toBe(textarea?.getAttribute('id'));
    expect(root.shadowRoot?.querySelector('slot')).toBeNull();
    expect(root.shadowRoot?.textContent).not.toContain('Ignored child');
    expect(textarea).toHaveProperty('value', 'Attribute default');
  });

  it('S6 normalizes positive finite rows and floors fractional values', () => {
    expect(normalizeKiTextareaRows(1)).toBe(1);
    expect(normalizeKiTextareaRows(2)).toBe(2);
    expect(normalizeKiTextareaRows(6)).toBe(6);
    expect(normalizeKiTextareaRows(3.9)).toBe(3);
  });

  it('S6 normalizes invalid rows values to the default count', () => {
    expect(normalizeKiTextareaRows(undefined)).toBe(2);
    expect(normalizeKiTextareaRows(Number.NaN)).toBe(2);
    expect(normalizeKiTextareaRows('tall')).toBe(2);
    expect(normalizeKiTextareaRows(0)).toBe(2);
    expect(normalizeKiTextareaRows(-1)).toBe(2);
  });
});
