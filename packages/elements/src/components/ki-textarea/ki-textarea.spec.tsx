import { h } from '@stencil/core';
import { describe, expect, it, render, vi } from '@stencil/vitest';
import { normalizeKiTextareaRows } from './ki-textarea.form';

// @spec:004-ki-textarea
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).

type KiTextareaHost = HTMLElement & {
  value: string;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
};

function textareaOf(root: HTMLElement): HTMLTextAreaElement {
  const textarea = root.shadowRoot?.querySelector('textarea');
  if (!textarea) {
    throw new Error('ki-textarea did not render its internal textarea');
  }
  return textarea;
}

// mock-doc implements no constraint validation; the guarded input/change
// handlers need a ValidityState to run, so the platform gap is stubbed here.
// Real validity behavior is asserted by the browser suite (Art. III).
function stubValidity(textarea: HTMLTextAreaElement): void {
  Object.defineProperty(textarea, 'validity', { configurable: true, value: { valid: true } });
}

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

  it('S3 renders the declared rows count on the internal textarea', async () => {
    const { root } = await render(h('ki-textarea', { label: 'Delivery notes', rows: 6 }));

    expect(textareaOf(root).getAttribute('rows')).toBe('6');
  });

  it('S4 forwards readonly to the internal textarea and keeps its text', async () => {
    const { root } = await render(
      h('ki-textarea', { label: 'Terms', readonly: true, value: 'No refunds after 30 days' }),
    );
    const textarea = textareaOf(root);

    expect(textarea.hasAttribute('readonly')).toBe(true);
    expect(textarea.hasAttribute('disabled')).toBe(false);
    expect(textarea).toHaveProperty('value', 'No refunds after 30 days');
  });

  it('S5 forwards disabled to the internal textarea', async () => {
    const { root } = await render(h('ki-textarea', { disabled: true, label: 'Delivery notes' }));

    expect(textareaOf(root).hasAttribute('disabled')).toBe(true);
  });

  it('S10 forwards required to the internal textarea as the exposure source', async () => {
    const { root } = await render(h('ki-textarea', { label: 'Delivery notes', required: true }));

    expect(textareaOf(root).hasAttribute('required')).toBe(true);
  });

  it('S19 forwards the placeholder only while one is declared', async () => {
    const withPlaceholder = await render(
      h('ki-textarea', { label: 'Delivery notes', placeholder: 'Add any special instructions' }),
    );
    const withoutPlaceholder = await render(h('ki-textarea', { label: 'Delivery notes' }));

    expect(textareaOf(withPlaceholder.root).getAttribute('placeholder')).toBe(
      'Add any special instructions',
    );
    expect(textareaOf(withoutPlaceholder.root).hasAttribute('placeholder')).toBe(false);
  });

  it('S25 forwards the autocomplete entry purpose and omits it by default', async () => {
    const withPurpose = await render(
      h('ki-textarea', { autocomplete: 'street-address', label: 'Shipping address' }),
    );
    const withoutPurpose = await render(h('ki-textarea', { label: 'Delivery notes' }));

    expect(textareaOf(withPurpose.root).getAttribute('autocomplete')).toBe('street-address');
    expect(textareaOf(withoutPurpose.root).hasAttribute('autocomplete')).toBe(false);
  });

  it('S1 syncs the host value while the internal textarea receives input', async () => {
    const { root, waitForChanges } = await render(h('ki-textarea', { label: 'Delivery notes' }));
    const textarea = textareaOf(root);
    stubValidity(textarea);

    textarea.value = 'Leave the package at the back door';
    textarea.dispatchEvent(new Event('input'));
    await waitForChanges();

    expect((root as KiTextareaHost).value).toBe('Leave the package at the back door');
  });

  it('S2 preserves line breaks in the synced value', async () => {
    const { root, waitForChanges } = await render(h('ki-textarea', { label: 'Delivery notes' }));
    const textarea = textareaOf(root);
    stubValidity(textarea);

    textarea.value = 'Ring twice\nLeave at the back door';
    textarea.dispatchEvent(new Event('input'));
    await waitForChanges();

    expect((root as KiTextareaHost).value).toBe('Ring twice\nLeave at the back door');
  });

  it('S20 re-dispatches a composed change from the host when an edit commits', async () => {
    const { root, waitForChanges } = await render(h('ki-textarea', { label: 'Delivery notes' }));
    const textarea = textareaOf(root);
    stubValidity(textarea);
    const change = vi.fn();
    root.addEventListener('change', change);

    textarea.value = 'Leave at the back door';
    textarea.dispatchEvent(new Event('change'));
    await waitForChanges();

    expect(change).toHaveBeenCalledTimes(1);
    expect((change.mock.calls[0] as Event[])[0]?.composed).toBe(true);
    expect((root as KiTextareaHost).value).toBe('Leave at the back door');
  });

  it('S13 formResetCallback restores the declared value attribute', async () => {
    const { root, waitForChanges } = await render(
      '<ki-textarea label="Delivery notes" value="Call on arrival"></ki-textarea>',
    );
    await waitForChanges();
    const host = root as KiTextareaHost;
    host.value = 'edited away';
    await waitForChanges();
    expect(textareaOf(root)).toHaveProperty('value', 'edited away');

    host.formResetCallback();
    await waitForChanges();

    expect(host.value).toBe('Call on arrival');
    expect(textareaOf(root)).toHaveProperty('value', 'Call on arrival');
  });

  it('S15 formDisabledCallback disables and re-enables the internal textarea', async () => {
    const { root, waitForChanges } = await render(h('ki-textarea', { label: 'Delivery notes' }));
    const host = root as KiTextareaHost;
    expect(textareaOf(root).hasAttribute('disabled')).toBe(false);

    host.formDisabledCallback(true);
    await waitForChanges();
    expect(textareaOf(root).hasAttribute('disabled')).toBe(true);

    host.formDisabledCallback(false);
    await waitForChanges();
    expect(textareaOf(root).hasAttribute('disabled')).toBe(false);
  });
});
