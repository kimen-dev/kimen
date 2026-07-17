// @spec:024-ki-indicator
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-indicator.js';

const STYLE_ID = 'ki-indicator-dark-tokens';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.appendChild(style);
}

function landmark(): HTMLElement {
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  return main;
}

async function mount(attributes: Record<string, string> = {}): Promise<HTMLElement> {
  const el = document.createElement('ki-indicator');
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  landmark().appendChild(el);
  await customElements.whenDefined('ki-indicator');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part~="dot"]') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function requireDot(el: HTMLElement, index: number): HTMLElement {
  const dots = Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('[part~="dot"]') ?? []);
  const dot = dots[index];
  expect(dot).toBeTruthy();
  if (!dot) {
    throw new Error(`ki-indicator has no dot at index ${String(index)}`);
  }
  return dot;
}

describe('ki-indicator under the dark scheme', () => {
  it('S10 resolves the dot appearances from the dark token values', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    // Inverse_white/alpha_18 is the scheme-sensitive paint of both the
    // resting fill and the current ring (Black/18 light, White/18 dark).
    let el = await mount({ label: 'Slide position', count: '5', current: '2' });
    const lightResting = getComputedStyle(requireDot(el, 0)).backgroundColor;
    const lightRing = getComputedStyle(requireDot(el, 1)).borderTopColor;
    el.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount({ label: 'Slide position', count: '5', current: '2' });
    const darkResting = getComputedStyle(requireDot(el, 0)).backgroundColor;
    const darkRing = getComputedStyle(requireDot(el, 1)).borderTopColor;

    expect(darkResting).toBe(readTokenColor('--ki-indicator-dot-color'));
    expect(darkRing).toBe(readTokenColor('--ki-indicator-dot-current-color'));
    expect(darkResting, 'forced dark must change the resting fill').not.toBe(lightResting);
    expect(darkRing, 'forced dark must change the current ring').not.toBe(lightRing);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
