import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:014-ki-tabs
// Anatomy-only browser coverage; S-ID behavior lives in ki-tabs.browser.spec.ts
// because the group owns selection, visibility and ARIA wiring. The axe scan
// runs here with the panel mounted inside its group, because a lone panel has
// no valid accessibility contract outside a tablist.
import { defineCustomElement } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';

const STYLE_ID = 'ki-tab-panel-browser-token-style';

beforeAll(() => {
  defineCustomElement();
  defineKiTabs();
  defineKiTab();
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

async function mount(hidden = false): Promise<HTMLElement> {
  ensureTokens();
  const el = document.createElement('ki-tab-panel');
  el.textContent = 'Email panel';
  el.toggleAttribute('hidden', hidden);
  document.body.append(el);
  await customElements.whenDefined('ki-tab-panel');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

describe('ki-tab-panel anatomy in a real browser', () => {
  it('S8 exposes the panel part around slotted content', async () => {
    const el = await mount();

    expect(el.shadowRoot?.querySelector('[part="panel"]')).toBeInstanceOf(HTMLElement);
  });

  it('S18 renders no box while hidden', async () => {
    const el = await mount(true);
    const boxes = el.getClientRects();

    expect(boxes.length).toBe(0);
  });

  it('S8 has zero axe violations for the visible panel inside its mounted group', async () => {
    ensureTokens();
    const main = document.createElement('main');
    main.innerHTML = `
      <ki-tabs label="Settings" value="email">
        <ki-tab value="email">Email</ki-tab>
        <ki-tab value="notifications">Notifications</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
      </ki-tabs>
    `;
    document.body.append(main);
    await customElements.whenDefined('ki-tabs');
    await customElements.whenDefined('ki-tab');
    await customElements.whenDefined('ki-tab-panel');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect((await axe.run(main)).violations).toEqual([]);
    main.remove();
  });
});
