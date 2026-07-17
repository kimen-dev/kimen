import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:026-ki-qr
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III), where the rendered code is decoded with an
// independent QR decoder. Every test maps to a scenario ID (S<n>) from the
// approved feature.feature (traceability gate, Art. II).
describe('ki-qr', () => {
  it('S1 renders the code part with the module anatomy derived from the value', async () => {
    const { root } = await render(<ki-qr value="https://onmars.dev"></ki-qr>);
    const svg = root.shadowRoot?.querySelector('svg[part="code"]');
    expect(svg).toBeTruthy();
    // A version-2 symbol (25 modules) in the 8-units-per-module space.
    expect(svg?.getAttribute('viewBox')).toBe('0 0 200 200');
    expect(root.shadowRoot?.querySelectorAll('.module').length).toBeGreaterThan(0);
    expect(root.shadowRoot?.querySelectorAll('.finder')).toHaveLength(3);
    expect(root.shadowRoot?.querySelectorAll('.finder-center')).toHaveLength(3);
  });

  it('S2 re-derives the matrix when the value changes', async () => {
    const { root, waitForChanges } = await render(<ki-qr value="https://onmars.dev"></ki-qr>);
    const before = root.shadowRoot?.querySelectorAll('.module').length ?? 0;
    root.setAttribute('value', 'https://onmars.dev/pricing');
    await waitForChanges();
    const after = root.shadowRoot?.querySelectorAll('.module').length ?? 0;
    expect(root.shadowRoot?.querySelector('svg[part="code"]')).toBeTruthy();
    expect(after).not.toBe(before);
  });

  it('S3 renders nothing and exposes nothing without a value', async () => {
    const { root } = await render(<ki-qr></ki-qr>);
    expect(root.shadowRoot?.querySelector('svg')).toBeNull();
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBeNull();
    const { root: empty } = await render(<ki-qr value=""></ki-qr>);
    expect(empty.shadowRoot?.querySelector('svg')).toBeNull();
    expect(empty.getAttribute('aria-hidden')).toBe('true');
  });

  it('S4 keeps the default anatomy under an unrecognized shape attribute', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising unknown vocabulary
      <ki-qr
        value="https://onmars.dev"
        {...({ shape: 'circle', type: 'round' } as Record<string, string>)}
      ></ki-qr>,
    );
    const svg = root.shadowRoot?.querySelector('svg[part="code"]');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 200 200');
    expect(root.shadowRoot?.querySelectorAll('.finder')).toHaveLength(3);
  });

  it('S5 exposes no interactive anatomy: no tabindex, no interactive roles or controls', async () => {
    const { root } = await render(<ki-qr value="https://onmars.dev" label="Open"></ki-qr>);
    expect(root.hasAttribute('tabindex')).toBe(false);
    const inner = root.shadowRoot?.querySelectorAll('[tabindex], button, a, input');
    expect(inner?.length).toBe(0);
  });

  it('S6 exposes one image named by the purpose-stating label', async () => {
    const { root } = await render(
      <ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>,
    );
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Open onmars.dev on your phone');
  });

  it('S7 names the image with the encoded value when no label exists', async () => {
    const { root } = await render(<ki-qr value="https://onmars.dev"></ki-qr>);
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('https://onmars.dev');
  });

  it('S12 fails soft exactly past the densest symbol capacity', async () => {
    // 2,331 bytes is the exact byte-mode capacity of version 40 at level M.
    const { root: atCapacity } = await render(<ki-qr value={'x'.repeat(2331)}></ki-qr>);
    expect(atCapacity.shadowRoot?.querySelector('svg[part="code"]')).toBeTruthy();
    const { root: overflow } = await render(<ki-qr value={'x'.repeat(2332)}></ki-qr>);
    expect(overflow.shadowRoot?.querySelector('svg')).toBeNull();
    expect(overflow.getAttribute('aria-hidden')).toBe('true');
  });
});
