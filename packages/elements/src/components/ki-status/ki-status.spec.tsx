import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:021-ki-status
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-status', () => {
  it('S1 renders the dot part with the tone reflected for token-driven styling', async () => {
    const { root } = await render(<ki-status label="Online" tone="success"></ki-status>);
    expect(root.shadowRoot?.querySelector('[part="dot"]')).toBeTruthy();
    expect(root.getAttribute('tone')).toBe('success');
    const { root: failing } = await render(
      <ki-status label="Build failing" tone="danger"></ki-status>,
    );
    expect(failing.getAttribute('tone')).toBe('danger');
  });

  it('S3 keeps the dot anatomy unchanged under an unrecognized tone value', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising unknown vocabulary
      <ki-status tone={'primary' as never}></ki-status>,
    );
    expect(root.shadowRoot?.querySelector('[part="dot"]')).toBeTruthy();
  });

  it('S4 reflects the enabled ring as an attribute for the token-driven ring styles', async () => {
    const { root } = await render(<ki-status label="Online" ring={true}></ki-status>);
    expect(root.hasAttribute('ring')).toBe(true);
    const { root: plain } = await render(<ki-status label="Online"></ki-status>);
    expect(plain.hasAttribute('ring')).toBe(false);
  });

  it('S5 exposes no interactive anatomy: no tabindex, no interactive roles or controls', async () => {
    const { root } = await render(<ki-status label="Online"></ki-status>);
    expect(root.hasAttribute('tabindex')).toBe(false);
    const inner = root.shadowRoot?.querySelectorAll('[tabindex], button, a, input');
    expect(inner?.length).toBe(0);
  });

  it('S6 exposes a labeled dot as a named non-interactive image', async () => {
    const { root } = await render(<ki-status label="Online" tone="success"></ki-status>);
    const dot = root.shadowRoot?.querySelector('[part="dot"]');
    expect(dot?.getAttribute('role')).toBe('img');
    expect(dot?.getAttribute('aria-label')).toBe('Online');
    expect(dot?.getAttribute('aria-hidden')).toBeNull();
  });

  it('S7 renders an unlabeled dot as pure decoration: no role, no name, no text, no slot', async () => {
    const { root } = await render(<ki-status>Online</ki-status>);
    const dot = root.shadowRoot?.querySelector('[part="dot"]');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    expect(dot?.getAttribute('role')).toBeNull();
    expect(dot?.getAttribute('aria-label')).toBeNull();
    expect(dot?.textContent).toBe('');
    // No slots (FR-009): light-DOM children are never rendered.
    expect(root.shadowRoot?.querySelector('slot')).toBeNull();
  });
});
