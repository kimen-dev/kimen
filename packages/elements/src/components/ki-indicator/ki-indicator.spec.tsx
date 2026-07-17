import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:024-ki-indicator
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III) — mock-doc has no layout, so geometry and
// token resolution are asserted there. Every test maps to a scenario ID
// (S<n>) from the approved feature.feature (traceability gate, Art. II).
describe('ki-indicator', () => {
  it('S1 renders one dot per position with exactly the second one current', async () => {
    const { root } = await render(
      <ki-indicator label="Slide position" count={5} current={2}></ki-indicator>,
    );
    const dots = root.shadowRoot?.querySelectorAll('[part~="dot"]') ?? [];
    expect(dots).toHaveLength(5);
    const current = root.shadowRoot?.querySelectorAll('[part~="dot-current"]') ?? [];
    expect(current).toHaveLength(1);
    expect(dots[1]).toBe(current[0]);
    expect(root.shadowRoot?.querySelector('[part="indicator"]')).toBeTruthy();
  });

  it('S3 clamps an out-of-range current position to the last dot', async () => {
    const { root } = await render(
      <ki-indicator label="Slide position" count={5} current={9}></ki-indicator>,
    );
    const dots = root.shadowRoot?.querySelectorAll('[part~="dot"]') ?? [];
    expect(dots).toHaveLength(5);
    const current = root.shadowRoot?.querySelectorAll('[part~="dot-current"]') ?? [];
    expect(current).toHaveLength(1);
    expect(dots[4]).toBe(current[0]);
  });

  it('S4 falls a non-numeric current position back to the first dot', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising malformed agent output
      <ki-indicator label="Slide position" count={5} current={'next' as never}></ki-indicator>,
    );
    const dots = root.shadowRoot?.querySelectorAll('[part~="dot"]') ?? [];
    expect(dots).toHaveLength(5);
    const current = root.shadowRoot?.querySelectorAll('[part~="dot-current"]') ?? [];
    expect(current).toHaveLength(1);
    expect(dots[0]).toBe(current[0]);
  });

  it('S5 keeps the default anatomy under an unrecognized variant attribute', async () => {
    // Deliberately exercising unknown vocabulary copied from another
    // design system: no code path and no selector reads it (FR-009).
    const foreign = { variant: 'worm' } as Record<string, string>;
    const { root } = await render(
      <ki-indicator label="Slide position" count={3} current={1} {...foreign}></ki-indicator>,
    );
    expect(root.getAttribute('variant')).toBe('worm');
    expect(root.shadowRoot?.querySelectorAll('[part~="dot"]')).toHaveLength(3);
    expect(root.shadowRoot?.querySelectorAll('[part~="dot-current"]')).toHaveLength(1);
  });

  it('S7 exposes no interactive anatomy: no tabindex, no interactive roles or controls', async () => {
    const { root } = await render(
      <ki-indicator label="Slide position" count={5} current={2}></ki-indicator>,
    );
    expect(root.hasAttribute('tabindex')).toBe(false);
    const inner = root.shadowRoot?.querySelectorAll('[tabindex], button, a, input');
    expect(inner?.length).toBe(0);
  });

  it('S8 exposes one labeled graphic whose dots carry no role, name or state', async () => {
    const { root } = await render(
      <ki-indicator label="Slide position" count={5} current={2}></ki-indicator>,
    );
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Slide position, 2 / 5');
    for (const dot of root.shadowRoot?.querySelectorAll('[part~="dot"]') ?? []) {
      expect(dot.getAttribute('role')).toBeNull();
      expect(dot.getAttribute('aria-label')).toBeNull();
      expect(dot.getAttribute('aria-current')).toBeNull();
      expect(dot.textContent).toBe('');
    }
    // Zero dots convey nothing: the empty row is decorative, never an
    // unnamed graphic (FR-002/FR-005).
    const { root: empty } = await render(<ki-indicator label="Slide position"></ki-indicator>);
    expect(empty.shadowRoot?.querySelectorAll('[part~="dot"]')).toHaveLength(0);
    expect(empty.getAttribute('aria-hidden')).toBe('true');
    expect(empty.getAttribute('role')).toBeNull();
  });
});
