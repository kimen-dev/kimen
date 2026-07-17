import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:020-ki-divider
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-divider', () => {
  it('S1 renders the rule part with the default horizontal orientation reflected', async () => {
    const { root } = await render(<ki-divider></ki-divider>);
    expect(root.shadowRoot?.querySelector('[part="divider"]')).toBeTruthy();
    expect(root.getAttribute('orientation')).toBe('horizontal');
  });

  it('S2 reflects the vertical orientation for token-driven styling', async () => {
    const { root } = await render(<ki-divider orientation="vertical"></ki-divider>);
    expect(root.getAttribute('orientation')).toBe('vertical');
    expect(root.shadowRoot?.querySelector('[part="divider"]')).toBeTruthy();
  });

  it('S3 keeps the anatomy unchanged under an unrecognized orientation value', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising unknown vocabulary
      <ki-divider orientation={'inset' as never}></ki-divider>,
    );
    expect(root.shadowRoot?.querySelector('[part="divider"]')).toBeTruthy();
  });

  it('S4 exposes no interactive anatomy: no tabindex, no role, no controls', async () => {
    const { root } = await render(<ki-divider></ki-divider>);
    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(root.hasAttribute('role')).toBe(false);
    const inner = root.shadowRoot?.querySelectorAll('[tabindex], [role], button, a');
    expect(inner?.length).toBe(0);
  });

  it('S5 renders no slot: light-DOM children are never rendered (FR-008)', async () => {
    const { root } = await render(<ki-divider>OR</ki-divider>);
    expect(root.shadowRoot?.querySelector('slot')).toBeNull();
    expect(root.shadowRoot?.querySelector('[part="divider"]')?.textContent).toBe('');
  });
});
