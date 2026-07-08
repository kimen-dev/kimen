import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

// @spec:010-ki-badge
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-badge.js';

const STYLE_ID = 'ki-badge-dark-tokens';

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

async function mount(tone: string): Promise<HTMLElement> {
  const el = document.createElement('ki-badge');
  el.setAttribute('tone', tone);
  el.textContent = tone;
  document.body.appendChild(el);
  await customElements.whenDefined('ki-badge');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="badge"]') && Date.now() < deadline) {
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

function requirePill(el: HTMLElement): HTMLElement {
  const pill = el.shadowRoot?.querySelector<HTMLElement>('[part="badge"]') ?? null;
  expect(pill).toBeTruthy();
  if (!pill) {
    throw new Error('ki-badge did not render its pill');
  }
  return pill;
}

describe('ki-badge under the dark scheme', () => {
  it('S7 resolves the forced dark appearance from the dark token values', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    let el = await mount('success');
    const lightBg = getComputedStyle(requirePill(el)).backgroundColor;
    el.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount('success');
    const darkBg = getComputedStyle(requirePill(el)).backgroundColor;

    expect(darkBg).toBe(readTokenColor('--ki-badge-success-bg'));
    expect(darkBg, 'forced dark must change the pill surface').not.toBe(lightBg);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
