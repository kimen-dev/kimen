// @spec:002-ki-button
// Dark-scheme axe pass (clean-context review, round 1: the light-only axe
// run could not see dark contrast failures; the extended contrast gate is
// the deterministic arithmetic, this is the rendered-tree floor on top).
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import material3Css from '@kimen/tokens/css/material3?raw';
import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const tones = ['neutral', 'success', 'danger'] as const;

beforeAll(async () => {
  defineKiButton();
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
  for (const variant of variants) {
    for (const tone of tones) {
      const el = document.createElement('ki-button');
      el.setAttribute('variant', variant);
      el.setAttribute('tone', tone);
      el.textContent = `${variant} ${tone}`;
      document.body.appendChild(el);
    }
  }
  await customElements.whenDefined('ki-button');
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

describe('ki-button under the dark scheme', () => {
  it('S10 has zero axe violations across the matrix in onmars dark', async () => {
    injectStylesheet(onmarsCss, 'ki-button-dark-tokens');

    await mountMatrix();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S9 has zero axe violations across the matrix in material3 dark', async () => {
    injectStylesheet(onmarsCss, 'ki-button-dark-tokens');
    injectStylesheet(material3Css, 'ki-button-dark-material3-tokens');
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    await mountMatrix();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
    document.documentElement.removeAttribute('data-ki-theme');
  });
});
