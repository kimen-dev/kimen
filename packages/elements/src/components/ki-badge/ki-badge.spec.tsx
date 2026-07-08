import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:010-ki-badge
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-badge', () => {
  it('S1 renders the slotted label inside the pill part', async () => {
    const { root } = await render(<ki-badge>Beta</ki-badge>);
    expect(root).toHaveTextContent('Beta');
    expect(root.shadowRoot?.querySelector('[part="badge"] slot')).toBeTruthy();
  });

  it('S2 reflects the tone attribute for token-driven styling', async () => {
    const { root } = await render(<ki-badge tone="warning">Expiring</ki-badge>);
    expect(root.getAttribute('tone')).toBe('warning');
  });

  it('S3 keeps the anatomy unchanged under unrecognized tone and size values', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising unknown vocabulary
      <ki-badge tone={'chartreuse' as never} size={'xl' as never}>
        Odd
      </ki-badge>,
    );
    expect(root).toHaveTextContent('Odd');
    expect(root.shadowRoot?.querySelector('[part="badge"]')).toBeTruthy();
  });

  it('S8 renders an empty badge without error and without text', async () => {
    const { root } = await render(<ki-badge></ki-badge>);
    expect(root.shadowRoot?.querySelector('[part="badge"]')).toBeTruthy();
    expect(root.textContent.trim()).toBe('');
  });

  it('S4 exposes no interactive anatomy: no tabindex, no role, no listeners surface', async () => {
    const { root } = await render(<ki-badge>Static</ki-badge>);
    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(root.hasAttribute('role')).toBe(false);
    const inner = root.shadowRoot?.querySelectorAll('[tabindex], [role], button, a');
    expect(inner?.length).toBe(0);
  });
});
