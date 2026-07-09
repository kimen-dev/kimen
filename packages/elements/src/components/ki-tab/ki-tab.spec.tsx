import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:014-ki-tabs
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test title carries an approved S-ID.

function requireElement<T extends Element>(value: T | null, selector: string): T {
  if (value === null) {
    throw new Error(`Missing ${selector}`);
  }
  return value;
}

function shadowRootOf(root: HTMLElement): ShadowRoot {
  if (root.shadowRoot === null) {
    throw new Error('Missing shadow root');
  }
  return root.shadowRoot;
}

describe('ki-tab', () => {
  it('S7 renders a host-role tab anatomy without inner focusable controls', async () => {
    const { root } = await render(
      <ki-tab>
        <span slot="start">I</span>
        Email
        <span slot="end">3</span>
      </ki-tab>,
    );

    const shadow = shadowRootOf(root);
    const tab = requireElement(shadow.querySelector('[part="tab"]'), '[part="tab"]');
    const indicator = requireElement(
      shadow.querySelector('[part="indicator"]'),
      '[part="indicator"]',
    );
    const slots = [...tab.querySelectorAll('slot')].map((slot) => slot.name);

    expect(slots).toEqual(['start', '', 'end']);
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(shadow.querySelector('button,a,input,select,textarea,[tabindex]')).toBeNull();
  });

  it('S7 exposes host tab role and selected state attributes', async () => {
    const { root } = await render(h('ki-tab', { selected: true }, 'Email'));

    expect(root.getAttribute('role')).toBe('tab');
    expect(root.getAttribute('aria-selected')).toBe('true');
  });

  it('S2 exposes disabled presence semantics through host attributes', async () => {
    const { root } = await render(h('ki-tab', { 'attr:disabled': 'false' }, 'Billing'));

    expect(root.hasAttribute('disabled')).toBe(true);
    expect(root.getAttribute('aria-disabled')).toBe('true');
  });

  it('S3 reflects value with an empty-string effective default', async () => {
    const { root } = await render(h('ki-tab', { value: 'email' }, 'Email'));
    const { root: emptyRoot } = await render(<ki-tab>Email</ki-tab>);

    expect(root.getAttribute('value')).toBe('email');
    expect((emptyRoot as HTMLElement & { value: string }).value).toBe('');
  });
});
