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
    const wrapper = root.shadowRoot?.querySelector('[part="list"]');

    // Role is reflected on the host (verified in the real AX tree by S6);
    // here we assert the reflected attribute and the wrapper anatomy.
    expect(root.getAttribute('role')).toBe('list');
    expect(root.hasAttribute('aria-label')).toBe(false);
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper?.children).toHaveLength(1);
    expect(wrapper?.querySelector('slot:not([name])')?.tagName).toBe('SLOT');
  });

  it('S4 ignores unrecognized variant attributes without changing anatomy', async () => {
    const { root } = await render(
      h('ki-list', { variant: 'two-line' }, h('ki-list-item', null, 'Storage')),
    );

    expect(root.getAttribute('variant')).toBe('two-line');
    expect(root.shadowRoot?.querySelector('[part="list"] > slot')?.tagName).toBe('SLOT');
  });
});
