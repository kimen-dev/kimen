// @spec:023-ki-scroller
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-scroller.js';

const STYLE_ID = 'ki-scroller-dark-tokens';

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

async function mount(): Promise<HTMLElement> {
  const el = document.createElement('ki-scroller');
  el.setAttribute('label', 'Release notes');
  el.style.blockSize = '120px';
  const content = document.createElement('div');
  content.style.blockSize = '600px';
  content.textContent = 'body';
  el.appendChild(content);
  landmark().appendChild(el);
  await customElements.whenDefined('ki-scroller');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="viewport"][tabindex]') && Date.now() < deadline) {
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

function requireViewport(el: HTMLElement): HTMLElement {
  const viewport = el.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]') ?? null;
  expect(viewport).toBeTruthy();
  if (!viewport) {
    throw new Error('ki-scroller did not render its viewport');
  }
  return viewport;
}

describe('ki-scroller under the dark scheme', () => {
  it('S11 resolves the indicator from the dark token values', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    let el = await mount();
    expect(requireViewport(el).hasAttribute('tabindex')).toBe(true);
    const lightThumbColor = readTokenColor('--ki-scroller-thumb-color');
    el.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount();
    const viewport = requireViewport(el);
    expect(viewport.hasAttribute('tabindex')).toBe(true);
    const darkThumbColor = readTokenColor('--ki-scroller-thumb-color');

    // Inverse_white/alpha_6 flips Black/5 → White/5 with the scheme: the
    // indicator's paint source resolves from the dark token values (S11).
    expect(darkThumbColor).not.toBe(lightThumbColor);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
