import { h } from '@stencil/core';
import { render } from '@stencil/vitest';
import { describe, expect, it } from 'vitest';

// @spec:016-ki-list
describe('ki-list mock-doc anatomy', () => {
  it('S1 exposes the host as a list with only a part=list slot wrapper', async () => {
    const { root } = await render(
      <ki-list>
        <ki-list-item>Email</ki-list-item>
      </ki-list>,
    );
    const internals = (root as unknown as { internals?: ElementInternals }).internals;
    const wrapper = root.shadowRoot?.querySelector('[part="list"]');

    expect(internals?.role).toBe('list');
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.hasAttribute('aria-label')).toBe(false);
    expect(wrapper).toBeInstanceOf(HTMLDivElement);
    expect(wrapper?.children).toHaveLength(1);
    expect(wrapper?.querySelector('slot:not([name])')).toBeInstanceOf(HTMLSlotElement);
  });

  it('S4 ignores unrecognized variant attributes without changing anatomy', async () => {
    const { root } = await render(
      <ki-list variant="two-line">
        <ki-list-item>Storage</ki-list-item>
      </ki-list>,
    );

    expect(root.getAttribute('variant')).toBe('two-line');
    expect(root.shadowRoot?.querySelector('[part="list"] > slot')).toBeInstanceOf(HTMLSlotElement);
  });
});
