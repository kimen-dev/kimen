// @spec:016-ki-list
// Anatomy-only assertions for the sub-component. All S-ID behavior scenarios
// are carried by ki-list.browser.spec.ts per research D6 and the 007 composite
// convention.
import { beforeAll, describe, expect, it } from 'vitest';

import { defineCustomElement } from '../dist/components/ki-list-item.js';

beforeAll(() => {
  defineCustomElement();
});

async function mountItem(): Promise<HTMLElement> {
  document.body.replaceChildren();
  const item = document.createElement('ki-list-item');
  item.innerHTML =
    '<span slot="start">S</span>Primary<span slot="secondary">Secondary</span><span slot="end">E</span>';
  document.body.append(item);
  await customElements.whenDefined('ki-list-item');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return item;
}

describe('ki-list-item anatomy in a real browser', () => {
  it('exposes item, start, content and end parts', async () => {
    const item = await mountItem();
    const parts = [...(item.shadowRoot?.querySelector('[part="item"]')?.children ?? [])].map(
      (child) => child.getAttribute('part'),
    );

    expect(parts).toEqual(['start', 'content', 'end']);
    expect(
      item.shadowRoot?.querySelector('[part="content"] slot[name="secondary"]'),
    ).toBeInstanceOf(HTMLSlotElement);
  });
});
