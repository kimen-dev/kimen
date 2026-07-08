import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:009-ki-card
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-card', () => {
  async function renderCard(children: unknown) {
    const { root } = await render(<ki-card>{children}</ki-card>);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return root;
  }

  function parts(root: HTMLElement): string[] {
    return [...(root.shadowRoot?.querySelectorAll('[part]') ?? [])].map(
      (element) => element.getAttribute('part') ?? '',
    );
  }

  it('S1 renders card media header body footer parts in reading order', async () => {
    const root = await renderCard([
      <img slot="media" alt="" src="about:blank" />,
      <h2 slot="header">Monthly report</h2>,
      'Revenue increased.',
      <button slot="footer" type="button">
        Download
      </button>,
    ]);

    expect(parts(root)).toEqual(['card', 'media', 'header', 'body', 'footer']);
    expect(root.shadowRoot?.querySelector('[part="media"] slot')?.getAttribute('name')).toBe(
      'media',
    );
    expect(root.shadowRoot?.querySelector('[part="header"] slot')?.getAttribute('name')).toBe(
      'header',
    );
    expect(root.shadowRoot?.querySelector('[part="body"] slot')?.hasAttribute('name')).toBe(false);
    expect(root.shadowRoot?.querySelector('[part="footer"] slot')?.getAttribute('name')).toBe(
      'footer',
    );
  });

  it('S2 marks only regions with assigned element or non-whitespace text content as present', async () => {
    const root = await renderCard([
      '\n  ',
      <span slot="header">Storage</span>,
      'Storage is almost full',
    ]);

    expect(root.shadowRoot?.querySelector('[part="media"]')).toHaveAttribute('data-empty');
    expect(root.shadowRoot?.querySelector('[part="header"]')).not.toHaveAttribute('data-empty');
    expect(root.shadowRoot?.querySelector('[part="body"]')).not.toHaveAttribute('data-empty');
    expect(root.shadowRoot?.querySelector('[part="footer"]')).toHaveAttribute('data-empty');
  });

  it('S2 treats whitespace-only default slot content as empty', async () => {
    const root = await renderCard('\n\t  ');

    expect(root.shadowRoot?.querySelector('[part="body"]')).toHaveAttribute('data-empty');
  });

  it('S2 recognizes every named region independently', async () => {
    const root = await renderCard([
      <span slot="media">media</span>,
      <span slot="header">header</span>,
      <span slot="footer">footer</span>,
    ]);

    expect(root.shadowRoot?.querySelector('[part="media"]')).not.toHaveAttribute('data-empty');
    expect(root.shadowRoot?.querySelector('[part="header"]')).not.toHaveAttribute('data-empty');
    expect(root.shadowRoot?.querySelector('[part="body"]')).toHaveAttribute('data-empty');
    expect(root.shadowRoot?.querySelector('[part="footer"]')).not.toHaveAttribute('data-empty');
  });

  it('S3 ignores an unrecognized variant attribute while rendering default card anatomy', async () => {
    const { root } = await render(
      // @ts-expect-error S3 intentionally passes an unknown appearance attribute.
      <ki-card variant="elevated">
        <h2 slot="header">Monthly report</h2>
        Revenue increased.
      </ki-card>,
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(root.getAttribute('variant')).toBe('elevated');
    expect(parts(root)).toEqual(['card', 'media', 'header', 'body', 'footer']);
    expect(root).toHaveTextContent('Monthly report');
    expect(root).toHaveTextContent('Revenue increased.');
  });
});
