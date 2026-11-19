// @spec:016-ki-list
// Anatomy-only assertions for the sub-component. All S-ID behavior scenarios
// are carried by ki-list.browser.spec.ts per research D6 and the 007 composite
// convention. The axe scan runs here with items mounted inside their list,
// because a lone listitem has no valid accessibility contract outside a list.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement } from '../dist/components/ki-list-item.js';
import { expectAccessible } from './axe';
import { moveToNewParent } from './reconnect';

const STYLE_ID = 'ki-list-item-browser-token-style';

beforeAll(() => {
  defineCustomElement();
  defineKiList();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

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

  it('shows secondary text that arrives after the item moved to another parent', async () => {
    document.body.replaceChildren();
    const item = document.createElement('ki-list-item');
    item.innerHTML = 'Ana Garcia<span slot="secondary"></span>';
    document.body.append(item);
    await customElements.whenDefined('ki-list-item');
    const secondary = (): HTMLElement | null | undefined =>
      item.shadowRoot?.querySelector<HTMLElement>('.secondary');
    await expect.poll(() => secondary()?.hidden).toBe(true);

    // A reordered row keeps its slotted nodes, so no slotchange announces the
    // text an async load writes into them afterwards.
    moveToNewParent(item);
    const text = item.querySelector('[slot="secondary"]');
    if (text === null) {
      throw new Error('missing secondary text');
    }
    text.textContent = 'ana@onmars.dev';

    await expect.poll(() => secondary()?.hidden).toBe(false);
    expect(text.checkVisibility()).toBe(true);
  });

  it('shows secondary text written while the item was out of the document', async () => {
    document.body.replaceChildren();
    const item = document.createElement('ki-list-item');
    item.innerHTML = 'Ana Garcia<span slot="secondary"></span>';
    document.body.append(item);
    await customElements.whenDefined('ki-list-item');
    const secondary = (): HTMLElement | null | undefined =>
      item.shadowRoot?.querySelector<HTMLElement>('.secondary');
    await expect.poll(() => secondary()?.hidden).toBe(true);

    item.remove();
    const text = item.querySelector('[slot="secondary"]');
    if (text === null) {
      throw new Error('missing secondary text');
    }
    text.textContent = 'ana@onmars.dev';
    document.body.append(item);

    await expect.poll(() => secondary()?.hidden).toBe(false);
  });

  it('S6 has zero axe violations for items composed inside a mounted list', async () => {
    ensureTokens();
    document.body.replaceChildren();
    const main = document.createElement('main');
    main.innerHTML = `
      <ki-list>
        <ki-list-item><span slot="start">A</span>Ana Garcia<span slot="secondary">ana@onmars.dev</span><span slot="end">9:41</span></ki-list-item>
        <ki-list-item>Notifications</ki-list-item>
        <ki-list-item>Storage<span slot="end">92%</span></ki-list-item>
      </ki-list>
    `;
    document.body.append(main);
    await customElements.whenDefined('ki-list');
    await customElements.whenDefined('ki-list-item');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // The gated mount-entrance stagger runs in this non-reduced instance:
    // wait it out so axe reads end-state opacity for its contrast checks.
    await Promise.all(
      document.body
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );

    await expectAccessible(main);
    main.remove();
  });
});
