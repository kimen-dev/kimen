import { beforeAll, describe, expect, it } from 'vitest';

// @spec:007-ki-radio-group
// Option-anatomy browser assertions only; S-ID behavior is owned by the
// ki-radio-group composite suite (research D9).
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-radio.js';
import { expectAccessible } from './axe';

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

  it('carries the MarsUI glass surface on the circle and the dark shadow on the dot', async () => {
    document.body.replaceChildren();
    const el = await mount();
    const control = el.shadowRoot?.querySelector('[part="control"]');
    expect(control).toBeInstanceOf(HTMLElement);
    const style = getComputedStyle(control as HTMLElement);

    // Component_effect/primary_default: drop 0/1/1/-0.5 + inner White/12.
    expect(style.boxShadow).not.toBe('none');
    expect(style.boxShadow).toContain('inset');

    // Unselected rest: vertical Surface/Special gradient.
    expect(style.backgroundImage).toContain('linear-gradient');

    // Selected dot: Small_dark_shadow (0/2/3/-1.5 Elevation/shadow_dark).
    const dot = getComputedStyle(control as HTMLElement, '::before');
    expect(dot.boxShadow).toContain('0px 2px 3px -1.5px');
    el.remove();
  });

  it('has zero axe violations (Art. V floor)', async () => {
    document.body.replaceChildren();
    const el = await mount();
    await expectAccessible(document.body);
    el.remove();
  });
});
