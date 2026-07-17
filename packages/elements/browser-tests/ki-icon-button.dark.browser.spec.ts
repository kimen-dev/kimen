// @spec:022-ki-icon-button
// Dark-scheme axe pass (002 precedent: the light-only axe run cannot see
// dark contrast failures; the extended contrast gate is the deterministic
// arithmetic, this is the rendered-tree floor on top).
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import material3Css from '@kimen/tokens/css/material3?raw';
import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-icon-button.js';

const defineKiIconButtonElement: () => void = defineCustomElement;
const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const tones = ['neutral', 'success', 'danger'] as const;
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>';

beforeAll(async () => {
  defineKiIconButtonElement();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(css: string, id: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

async function mountMatrix(): Promise<void> {
  document.body.replaceChildren();
  document.body.style.backgroundColor = 'var(--ki-surface-s0)';
  const main = document.createElement('main');
  document.body.appendChild(main);
  for (const variant of variants) {
    for (const tone of tones) {
      const el = document.createElement('ki-icon-button');
      el.setAttribute('variant', variant);
      el.setAttribute('tone', tone);
      el.setAttribute('label', `${variant} ${tone}`);
      el.innerHTML = CLOSE_ICON;
      main.appendChild(el);
    }
  }
  await customElements.whenDefined('ki-icon-button');
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

describe('ki-icon-button under the dark scheme', () => {
  it('S11 has zero axe violations across the matrix in onmars dark', async () => {
    injectStylesheet(onmarsCss, 'ki-icon-button-dark-tokens');

    await mountMatrix();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S10 has zero axe violations across the matrix in material3 dark', async () => {
    injectStylesheet(onmarsCss, 'ki-icon-button-dark-tokens');
    injectStylesheet(material3Css, 'ki-icon-button-dark-material3-tokens');
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    await mountMatrix();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
    document.documentElement.removeAttribute('data-ki-theme');
  });
});
