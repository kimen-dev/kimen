import { h } from '@stencil/core';
import { render } from '@stencil/vitest';
import { describe, expect, it } from 'vitest';

// @spec:016-ki-list
function region(root: HTMLElement | undefined, part: string): HTMLElement | null {
  return root?.shadowRoot?.querySelector(`[part="${part}"]`) ?? null;
}

async function renderItem(html: string): Promise<HTMLElement> {
  const { root } = await render(<ki-list innerHTML={html} />);
  const item = root.querySelector('ki-list-item');
  if (!item) {
    throw new Error('ki-list-item did not render');
  }
  return item;
}

describe('ki-list-item mock-doc anatomy', () => {
  it('S2 exposes listitem role and start content end parts in reading order', async () => {
    const item = await renderItem(
      '<ki-list-item><span slot="start">A</span>Ana Garcia<span slot="secondary">ana@onmars.dev</span><span slot="end">9:41</span></ki-list-item>',
    );
    const parts = [...(item.shadowRoot?.querySelector('[part="item"]')?.children ?? [])].map(
      (child) => child.getAttribute('part'),
    );

    // Role reflected on the host (real AX-tree ownership verified by S6).
    expect(item.getAttribute('role')).toBe('listitem');
    expect(parts).toEqual(['start', 'content', 'end']);
    expect(region(item, 'content')?.querySelector('.primary slot:not([name])')?.tagName).toBe(
      'SLOT',
    );
    expect(
      region(item, 'content')?.querySelector('.secondary slot[name="secondary"]')?.tagName,
    ).toBe('SLOT');
  });

  it.each([
    ['empty start', '<ki-list-item>Storage</ki-list-item>', false, false, false],
    [
      'filled start',
      '<ki-list-item><span slot="start">S</span>Storage</ki-list-item>',
      true,
      false,
      false,
    ],
    [
      'filled secondary',
      '<ki-list-item>Storage<span slot="secondary">Almost full</span></ki-list-item>',
      false,
      true,
      false,
    ],
    [
      'filled end',
      '<ki-list-item>Storage<span slot="end">92%</span></ki-list-item>',
      false,
      false,
      true,
    ],
    [
      'whitespace secondary is empty',
      '<ki-list-item>Storage<span slot="secondary">   </span></ki-list-item>',
      false,
      false,
      false,
    ],
    [
      'whitespace default is empty',
      '<ki-list-item>   <span slot="secondary">Details</span></ki-list-item>',
      false,
      true,
      false,
    ],
  ])('S3 collapses absent regions: %s', async (_name, html, hasStart, hasSecondary, hasEnd) => {
    const item = await renderItem(html);

    // Only .has-secondary is a host class (drives the multi-line min-height
    // token); region collapse is driven by the `hidden` attribute per region.
    expect(item.classList.contains('has-secondary')).toBe(hasSecondary);
    expect(region(item, 'start')?.hidden).toBe(!hasStart);
    expect(item.shadowRoot?.querySelector<HTMLElement>('.secondary')?.hidden).toBe(!hasSecondary);
    expect(region(item, 'end')?.hidden).toBe(!hasEnd);
  });

  it('S3 switches the min-height state in both directions as secondary content changes', async () => {
    const item = await renderItem(
      '<ki-list-item>Storage<span slot="secondary">Almost full</span></ki-list-item>',
    );
    const secondary = item.querySelector('[slot="secondary"]');

    expect(item.classList.contains('has-secondary')).toBe(true);
    if (!secondary) {
      throw new Error('secondary slot fixture missing');
    }
    secondary.textContent = '   ';
    item.shadowRoot
      ?.querySelector('slot[name="secondary"]')
      ?.dispatchEvent(new Event('slotchange'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(item.classList.contains('has-secondary')).toBe(false);
    secondary.textContent = 'Full again';
    item.shadowRoot
      ?.querySelector('slot[name="secondary"]')
      ?.dispatchEvent(new Event('slotchange'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(item.classList.contains('has-secondary')).toBe(true);
  });

  it('S4 ignores unrecognized variant attributes without changing item anatomy', async () => {
    const item = await renderItem('<ki-list-item variant="two-line">Storage</ki-list-item>');

    expect(item.getAttribute('variant')).toBe('two-line');
    expect(region(item, 'item')?.tagName).toBe('DIV');
    expect(item.textContent).toContain('Storage');
  });
});
