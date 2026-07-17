import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:023-ki-scroller
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III) — mock-doc has no layout, so every scroller
// here measures as fitting content. Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-scroller', () => {
  it('S1 renders the viewport part as a named region with the default vertical orientation reflected', async () => {
    const { root } = await render(
      <ki-scroller label="Release notes">
        <p>Body</p>
      </ki-scroller>,
    );
    const viewport = root.shadowRoot?.querySelector('[part="viewport"]');
    expect(viewport).toBeTruthy();
    expect(viewport?.getAttribute('role')).toBe('region');
    expect(root.getAttribute('orientation')).toBe('vertical');
  });

  it('S3 reflects the horizontal orientation for token-driven axis styling', async () => {
    const { root } = await render(
      <ki-scroller orientation="horizontal" label="Weekly timeline"></ki-scroller>,
    );
    expect(root.getAttribute('orientation')).toBe('horizontal');
    expect(root.shadowRoot?.querySelector('[part="viewport"]')).toBeTruthy();
  });

  it('S4 adds no Tab stop while content fits: fitting viewports carry no tabindex', async () => {
    const { root } = await render(
      <ki-scroller label="Release notes">
        <p>Fits</p>
      </ki-scroller>,
    );
    const viewport = root.shadowRoot?.querySelector('[part="viewport"]');
    expect(viewport?.hasAttribute('tabindex')).toBe(false);
    expect(root.hasAttribute('tabindex')).toBe(false);
  });

  it('S5 keeps the anatomy unchanged under an unrecognized orientation value', async () => {
    const { root } = await render(
      // biome-ignore lint: deliberately exercising unknown vocabulary
      <ki-scroller orientation={'y' as never} label="Release notes"></ki-scroller>,
    );
    expect(root.shadowRoot?.querySelector('[part="viewport"]')).toBeTruthy();
    expect(root.shadowRoot?.querySelector('[part="viewport"]')?.getAttribute('role')).toBe(
      'region',
    );
  });

  it('S9 names the region from label and slots the content with its own semantics', async () => {
    const { root } = await render(
      <ki-scroller label="Release notes">
        <h2>March</h2>
        <ul>
          <li>Fixed</li>
        </ul>
      </ki-scroller>,
    );
    const viewport = root.shadowRoot?.querySelector('[part="viewport"]');
    expect(viewport?.getAttribute('aria-label')).toBe('Release notes');
    // Content passes through a plain slot: the scroller adds no role, name
    // or state of its own around it (FR-006).
    expect(root.shadowRoot?.querySelector('slot')).toBeTruthy();
    expect(root.querySelector('h2')?.textContent).toBe('March');
    expect(root.querySelector('ul li')).toBeTruthy();
  });
});
