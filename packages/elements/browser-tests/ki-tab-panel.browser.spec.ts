import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:014-ki-tabs
// Anatomy-only browser coverage; S-ID behavior lives in ki-tabs.browser.spec.ts
// because the group owns selection, visibility and ARIA wiring.
import { defineCustomElement } from '../dist/components/ki-tab-panel.js';

const STYLE_ID = 'ki-tab-panel-browser-token-style';

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
});
