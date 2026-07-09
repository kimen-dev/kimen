import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:014-ki-tabs
// Anatomy-only browser coverage; S-ID behavior lives in ki-tabs.browser.spec.ts
// because the group owns selection, keyboarding and ARIA wiring.
import { defineCustomElement } from '../dist/components/ki-tab.js';

const STYLE_ID = 'ki-tab-browser-token-style';

beforeAll(() => {
  defineCustomElement();
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
});
