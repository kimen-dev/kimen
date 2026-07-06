import { h } from '@stencil/core';
import { describe, expect, it, vi, render } from '@stencil/vitest';

// @spec:002-ki-button
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-button', () => {
  it('S1 dispatches exactly one composed click activation', async () => {
    const onClick = vi.fn();
    const { root } = await render(<ki-button onClick={onClick}>Save</ki-button>);
    const button = root.shadowRoot?.querySelector('button');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    button?.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('S2 renders a disabled internal button that is inert', async () => {
    const onClick = vi.fn();
    const { root } = await render(h('ki-button', { disabled: true, onClick }, 'Save'));
    const button = root.shadowRoot?.querySelector('button');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button).toHaveProperty('disabled', true);
    button?.click();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('S11 preserves unknown appearance attributes while rendering default anatomy', async () => {
    const { root } = await render(
      h('ki-button', { variant: 'loud', tone: 'warning', size: 'jumbo' }, 'Save'),
    );
    const button = root.shadowRoot?.querySelector('button[part="button"]');
    const label = root.shadowRoot?.querySelector('[part="label"]');

    expect(root.getAttribute('variant')).toBe('loud');
    expect(root.getAttribute('tone')).toBe('warning');
    expect(root.getAttribute('size')).toBe('jumbo');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.getAttribute('type')).toBe('button');
    expect(label).toHaveTextContent('Save');
  });
});
