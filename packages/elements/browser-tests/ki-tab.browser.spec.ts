import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:014-ki-tabs
// Anatomy-only browser coverage; S-ID behavior lives in ki-tabs.browser.spec.ts
// because the group owns selection, keyboarding and ARIA wiring. The axe scan
// runs here with the tab mounted inside its group, because a lone ki-tab has
// no valid accessibility contract outside a tablist.
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';

const STYLE_ID = 'ki-tab-browser-token-style';

beforeAll(() => {
  defineCustomElement();
  defineKiTabs();
  defineKiTabPanel();
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

async function mount(): Promise<HTMLElement> {
  ensureTokens();
  const el = document.createElement('ki-tab');
  el.textContent = 'Email';
  document.body.append(el);
  await customElements.whenDefined('ki-tab');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

describe('ki-tab anatomy in a real browser', () => {
  it('S7 exposes tab and indicator parts without a nested focusable control', async () => {
    const el = await mount();

    expect(el.shadowRoot?.querySelector('[part="tab"]')).toBeInstanceOf(HTMLElement);
    expect(el.shadowRoot?.querySelector('[part="indicator"]')).toBeInstanceOf(HTMLElement);
    expect(el.shadowRoot?.querySelector('button,a,input,select,textarea,[tabindex]')).toBeNull();
  });

  it('S7 renders at least a 24 by 24 pointer target', async () => {
    const el = await mount();
    const box = el.getBoundingClientRect();

    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  });

  it('S7 has zero axe violations for a tab mounted inside its labeled group', async () => {
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
