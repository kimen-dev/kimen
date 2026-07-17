import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:019-ki-avatar
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-avatar', () => {
  it('S1 renders the portrait image inside the avatar part when src is set', async () => {
    const { root } = await render(
      <ki-avatar label="Ana García" src="portrait.png" initials="AG"></ki-avatar>,
    );
    const image = root.shadowRoot?.querySelector('[part="image"]');
    expect(image?.getAttribute('src')).toBe('portrait.png');
    // The portrait never carries a second alternative text (FR-002).
    expect(image?.getAttribute('alt')).toBe('');
    expect(root.shadowRoot?.querySelector('[part="initials"]')).toBeNull();
    expect(root.shadowRoot?.querySelector('[part="icon"]')).toBeNull();
  });

  it('S2 falls back to the initials when the portrait fails, leaving no image artifact', async () => {
    const { root, waitForChanges } = await render(
      <ki-avatar label="Ana García" src="unreachable.png" initials="AG"></ki-avatar>,
    );
    root.shadowRoot?.querySelector('[part="image"]')?.dispatchEvent(new Event('error'));
    await waitForChanges();

    expect(root.shadowRoot?.querySelector('[part="image"]')).toBeNull();
    expect(root.shadowRoot?.querySelector('[part="initials"]')).toHaveTextContent('AG');
  });

  it('S3 renders the built-in generic figure without portrait and initials', async () => {
    const { root } = await render(<ki-avatar label="Guest"></ki-avatar>);
    expect(root.shadowRoot?.querySelector('[part="icon"]')).toBeTruthy();
    expect(root.shadowRoot?.querySelector('[part="image"]')).toBeNull();
    expect(root.shadowRoot?.querySelector('[part="initials"]')).toBeNull();
  });

  it('S4 keeps the avatar anatomy under an unrecognized size and reflects the vocabulary', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising unknown vocabulary (FR-007)
      <ki-avatar label="Ana García" initials="AG" size={'mega' as never}></ki-avatar>,
    );
    // The unknown value matches no style selector, so md metrics apply by
    // CSS construction — the anatomy itself never breaks (FR-007).
    expect(root.shadowRoot?.querySelector('[part="avatar"]')).toBeTruthy();
    expect(root.getAttribute('size')).toBe('mega');

    const { root: defaulted } = await render(<ki-avatar label="Ana García"></ki-avatar>);
    expect(defaulted.getAttribute('size')).toBe('md');
  });

  it('S8 exposes a labeled avatar as a named non-interactive image', async () => {
    const { root } = await render(<ki-avatar label="Ana García" initials="AG"></ki-avatar>);
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Ana García');
    expect(root.getAttribute('aria-hidden')).toBeNull();
    expect(root.hasAttribute('tabindex')).toBe(false);
    const interactive = root.shadowRoot?.querySelectorAll('[tabindex], button, a, input');
    expect(interactive?.length).toBe(0);
  });

  it('S9 keeps an unlabeled avatar out of the accessibility tree', async () => {
    const { root } = await render(<ki-avatar initials="AG"></ki-avatar>);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });
});
