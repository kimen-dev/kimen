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

  it('S1 keeps the items in source order through the single default slot', async () => {
    const { root } = await render(
      <ki-list>
        <ki-list-item>Email</ki-list-item>
        <ki-list-item>Notifications</ki-list-item>
        <ki-list-item>Storage</ki-list-item>
      </ki-list>,
    );
    // String() reconciles Stencil's bundled TS (textContent nullable) with
    // the root type-aware lint (string in TS 6 lib.dom) — hence the local
    // exception for the conversion rule (ki-badge.spec.tsx precedent).
    const texts = [...root.querySelectorAll('ki-list-item')].map((item) =>
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
      String(item.textContent).trim(),
    );

    expect(texts).toEqual(['Email', 'Notifications', 'Storage']);
    expect(root.shadowRoot?.querySelectorAll('slot')).toHaveLength(1);
  });

  it('S6 exposes one listitem role per item under the list role', async () => {
    const { root } = await render(
      <ki-list>
        <ki-list-item>Email</ki-list-item>
        <ki-list-item>Notifications</ki-list-item>
        <ki-list-item>Storage</ki-list-item>
      </ki-list>,
    );
    const itemRoles = [...root.querySelectorAll('ki-list-item')].map((item) =>
      item.getAttribute('role'),
    );

    expect(root.getAttribute('role')).toBe('list');
    expect(itemRoles).toEqual(['listitem', 'listitem', 'listitem']);
  });

  it('S6 keeps an author-provided role instead of forcing the list default', async () => {
    // Semantics ownership: the default role is structural only; an author role
    // (e.g. presentation) must win so authors can opt out of list semantics.
    const { root } = await render(
      h('ki-list', { role: 'presentation' }, h('ki-list-item', null, 'Storage')),
    );

    expect(root.getAttribute('role')).toBe('presentation');
  });
});
