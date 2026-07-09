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

  it('S1 reflects value and exposes label text as the default value', async () => {
    const { root } = await render(<ki-option> France </ki-option>);

    expect(root).not.toHaveProperty('selected');
    expect(root).not.toHaveProperty('checked');
    expect(root.getAttribute('value')).toBe('France');
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
