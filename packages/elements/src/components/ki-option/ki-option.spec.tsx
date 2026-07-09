import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { normalizeBooleanPresence, optionValue } from '../ki-select/ki-select.form';

// @spec:005-ki-select
describe('ki-option', () => {
  it('S1 is a hidden data element with no rendered row parts', async () => {
    const { root } = await render(<ki-option value="fr">France</ki-option>);

    expect(root.shadowRoot?.querySelector('[part]')).toBeNull();
    expect(root.shadowRoot?.querySelector('slot')?.nodeName).toBe('SLOT');
    expect(root.shadowRoot?.querySelector('style')?.textContent).toContain('display:none');
  });

  it('S1 derives the label as the default value without materializing the attribute', async () => {
    const { root } = await render(<ki-option> France </ki-option>);

    expect(root).not.toHaveProperty('selected');
    expect(root).not.toHaveProperty('checked');
    // An implicit value is NOT written into the reflected attribute (it would go
    // stale if the label changed); the effective value is derived on read via
    // optionValue (asserted below and exercised by the ki-select suite).
    expect(root.getAttribute('value')).toBeNull();
    // An explicit value still reflects.
    (root as HTMLElement & { value: string }).value = 'fr';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(root.getAttribute('value')).toBe('fr');
    expect(optionValue(null, ' France ')).toBe('France');
  });

  it('S4 treats disabled as boolean presence and reflects it', async () => {
    const { root } = await render(h('ki-option', null, 'France'));
    root.setAttribute('disabled', 'false');

    expect(root.hasAttribute('disabled')).toBe(true);
    expect(normalizeBooleanPresence(root.getAttribute('disabled'))).toBe(true);
  });
});
