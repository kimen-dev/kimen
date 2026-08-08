import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:014-ki-tabs
// Anatomy-only browser coverage; S-ID behavior lives in ki-tabs.browser.spec.ts
// because the group owns selection, keyboarding and ARIA wiring. The axe scan
// runs here with the tab mounted inside its group, because a lone ki-tab has
// no valid accessibility contract outside a tablist.
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { expectAccessible } from './axe';

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

async function mount(selected = false): Promise<HTMLElement> {
  ensureTokens();
  const el = document.createElement('ki-tab');
  el.textContent = 'Email';
  el.toggleAttribute('selected', selected);
  document.body.append(el);
  await customElements.whenDefined('ki-tab');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function requirePart(el: HTMLElement, part: string): HTMLElement {
  const node = el.shadowRoot?.querySelector(`[part="${part}"]`);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`Missing ${part} part`);
  }
  return node;
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
    // MarsUI Tab_nav_item geometry: the 13/24 label plus the 8px block-end
    // inset that keeps the underline clear of the text (24 + 8 = 32).
    expect(box.height).toBeGreaterThanOrEqual(32);
  });

  it('S7 keeps the 2px underline clear of the label with an 8px block-end inset', async () => {
    const el = await mount(true);
    const tabPart = requirePart(el, 'tab');
    const indicator = requirePart(el, 'indicator');
    const tabStyle = getComputedStyle(tabPart);

    // MarsUI Tab_nav_item (10048:1266): padding-top 0, padding-bottom 8.
    expect(tabStyle.paddingBlockStart).toBe('0px');
    expect(tabStyle.paddingBlockEnd).toBe('8px');

    // Square-ended 2px underline anchored to the very bottom of the item.
    expect(getComputedStyle(indicator).display).toBe('block');
    const indicatorBox = indicator.getBoundingClientRect();
    const hostBox = el.getBoundingClientRect();
    expect(indicatorBox.height).toBeCloseTo(2, 0);
    expect(indicatorBox.bottom).toBeCloseTo(hostBox.bottom, 0);
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

    await expectAccessible(main);
    main.remove();
  });
});
