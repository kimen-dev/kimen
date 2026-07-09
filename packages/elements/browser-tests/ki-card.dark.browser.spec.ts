// @spec:009-ki-card
// Dark-scheme axe pass plus rendered token resolution for ki-card. The
// arithmetic contrast gate checks token pairs; this browser test checks the
// forced-scheme CSS path and rendered tree.
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import onmarsCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-card.js';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
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

function cleanup(): void {
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(): Promise<HTMLElement> {
  document.body.style.backgroundColor = 'var(--ki-surface-s0)';
  document.body.innerHTML = `
    <main>
      <ki-card>
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
      </ki-card>
    </main>
  `;
  await customElements.whenDefined('ki-card');
  await nextFrame();
  await nextFrame();
  const el = document.querySelector<HTMLElement>('ki-card');
  expect(el).toBeInstanceOf(HTMLElement);
  if (!el) {
    throw new Error('ki-card did not mount');
  }
  return el;
}

function cardPart(el: HTMLElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[part="card"]');
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error('ki-card did not render a card part');
  }
  return part;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe('ki-card under the dark scheme', () => {
  it('S7 resolves forced dark appearance from onmars card tokens', async () => {
    cleanup();
    injectStylesheet(onmarsCss, 'ki-card-dark-tokens');
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    let el = await mount();
    const lightBg = getComputedStyle(cardPart(el)).backgroundColor;

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount();
    const darkBg = getComputedStyle(cardPart(el)).backgroundColor;

    expect(darkBg).toBe(readTokenColor('--ki-card-bg'));
    expect(darkBg, 'forced dark must change the resolved card surface').not.toBe(lightBg);
  });

  it('S7 has zero axe violations in onmars dark', async () => {
    cleanup();
    injectStylesheet(onmarsCss, 'ki-card-dark-tokens');
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');

    await mount();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  // Review round 1 (SC-003): material3 × dark was declared in the spec's
  // constitutional surface but never exercised.
  it('S7 resolves material3 dark appearance from tokens with zero axe violations', async () => {
    cleanup();
    injectStylesheet(onmarsCss, 'ki-card-dark-tokens');
    injectStylesheet(material3Css, 'ki-card-dark-material3-tokens');
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    let el = await mount();
    const lightBg = getComputedStyle(cardPart(el)).backgroundColor;

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount();
    const darkBg = getComputedStyle(cardPart(el)).backgroundColor;

    expect(darkBg).toBe(readTokenColor('--ki-card-bg'));
    expect(darkBg, 'material3 forced dark must change the resolved surface').not.toBe(lightBg);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
