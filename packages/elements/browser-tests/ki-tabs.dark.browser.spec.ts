// @spec:014-ki-tabs
import { commands } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineKiTabs();
  defineKiTab();
  defineKiTabPanel();
  await browserCommands.emulateColorScheme('dark');
});

function injectTokens(): void {
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
}

async function mount(): Promise<HTMLElement> {
  injectTokens();
  document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
  document.body.innerHTML = `
    <main>
      <ki-tabs value="email">
        <ki-tab value="email">Email</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
      </ki-tabs>
    </main>
  `;
  await customElements.whenDefined('ki-tabs');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const tab = document.querySelector('ki-tab');
  if (!(tab instanceof HTMLElement)) {
    throw new Error('Missing tab');
  }
  return tab;
}

describe('ki-tabs dark scheme in a real browser', () => {
  it('S10 resolves onmars dark token values', async () => {
    const tab = await mount();
    const style = getComputedStyle(tab);

    expect(style.color).not.toBe('');
    expect(style.getPropertyValue('--ki-tab-selected-rest-fg').trim()).not.toBe('');
    expect(style.getPropertyValue('--ki-tab-selected-rest-bg').trim()).not.toBe('');
  });
});
