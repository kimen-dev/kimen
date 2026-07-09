import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:014-ki-tabs
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test title carries an approved S-ID.
type WithInternals = HTMLElement & { internals: ElementInternals };

function requireElement<T extends Element>(value: T | null, selector: string): T {
  if (value === null) {
    throw new Error(`Missing ${selector}`);
  }
  return value;
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

    const tab = requireElement(root.shadowRoot.querySelector('[part="tab"]'), '[part="tab"]');
    const indicator = requireElement(
      root.shadowRoot.querySelector('[part="indicator"]'),
      '[part="indicator"]',
    );
    const slots = [...tab.querySelectorAll('slot')].map((slot) => slot.name);

    expect(slots).toEqual(['start', '', 'end']);
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(root.shadowRoot.querySelector('button,a,input,select,textarea,[tabindex]')).toBeNull();
  });

  it('S7 exposes tab semantics and selected state through internals', async () => {
    const { root } = await render(<ki-tab selected>Email</ki-tab>);
    const internals = (root as WithInternals).internals;

    expect(internals.role).toBe('tab');
    expect(internals.ariaSelected).toBe('true');
  });

  it('S2 exposes disabled presence semantics through internals', async () => {
    const { root } = await render(<ki-tab disabled="false">Billing</ki-tab>);
    const internals = (root as WithInternals).internals;

    expect(root.hasAttribute('disabled')).toBe(true);
    expect(internals.ariaDisabled).toBe('true');
  });

  it('S3 reflects value with an empty-string effective default', async () => {
    const { root } = await render(<ki-tab value="email">Email</ki-tab>);
    const { root: emptyRoot } = await render(<ki-tab>Email</ki-tab>);

    expect(root.getAttribute('value')).toBe('email');
    expect((emptyRoot as HTMLElement & { value: string }).value).toBe('');
  });
});
