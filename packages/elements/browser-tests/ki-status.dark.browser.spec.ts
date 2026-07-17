import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

// @spec:021-ki-status
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-status.js';

const STYLE_ID = 'ki-status-dark-tokens';

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

async function mount(
  attributes: Partial<Record<'tone' | 'label', string>> = {},
): Promise<HTMLElement> {
  const el = document.createElement('ki-status');
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  landmark().appendChild(el);
  await customElements.whenDefined('ki-status');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="dot"]') && Date.now() < deadline) {
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

function requireDot(el: HTMLElement): HTMLElement {
  const dot = el.shadowRoot?.querySelector<HTMLElement>('[part="dot"]') ?? null;
  expect(dot).toBeTruthy();
  if (!dot) {
    throw new Error('ki-status did not render its dot');
  }
  return dot;
}

describe('ki-status under the dark scheme', () => {
  it('S9 resolves the dot appearance from the dark token values', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    // Neutral is the scheme-sensitive fill (Gray/500 light, White/32 dark).
    let el = await mount({ tone: 'neutral', label: 'Inactive' });
    const lightColor = getComputedStyle(requireDot(el)).backgroundColor;
    el.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount({ tone: 'neutral', label: 'Inactive' });
    const darkColor = getComputedStyle(requireDot(el)).backgroundColor;

    expect(darkColor).toBe(readTokenColor('--ki-status-neutral-color'));
    expect(darkColor, 'forced dark must change the neutral fill').not.toBe(lightColor);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
