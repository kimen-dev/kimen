import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:007-ki-radio-group
// Option-anatomy browser assertions only; S-ID behavior is owned by the
// ki-radio-group composite suite (research D9).
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-radio.js';

type KiRadioElement = HTMLElement & { disabled: boolean; value: string };

const STYLE_ID = 'ki-radio-browser-token-style';

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

async function mount(label = 'Email'): Promise<KiRadioElement> {
  ensureTokens();
  let parent = document.querySelector('main');
  if (!parent) {
    parent = document.createElement('main');
    document.body.append(parent);
  }
  const el = document.createElement('ki-radio') as unknown as KiRadioElement;
  el.textContent = label;
  parent.appendChild(el);
  await customElements.whenDefined('ki-radio');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

describe('ki-radio in a real browser', () => {
  it('renders parts and a pointer target of at least 24 by 24 CSS pixels', async () => {
    document.body.replaceChildren();
    const el = await mount();
    const input = el.shadowRoot?.querySelector('input');
    const control = el.shadowRoot?.querySelector('[part="control"]');
    const label = el.shadowRoot?.querySelector('[part="label"]');

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input?.hasAttribute('name')).toBe(false);
    expect(control).toBeInstanceOf(HTMLElement);
    expect(label).toBeInstanceOf(HTMLElement);
    const rect = input?.getBoundingClientRect();
    expect(rect?.width).toBeGreaterThanOrEqual(24);
    expect(rect?.height).toBeGreaterThanOrEqual(24);
    el.remove();
  });

  it('has zero axe violations (Art. V floor)', async () => {
    document.body.replaceChildren();
    const el = await mount();
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
    el.remove();
  });
});
