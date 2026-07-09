// @spec:016-ki-list
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineKiList();
  defineKiListItem();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(): void {
  if (document.getElementById('ki-list-dark-tokens')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'ki-list-dark-tokens';
  style.textContent = onmarsCss;
  document.head.append(style);
}

async function mountDarkList(): Promise<HTMLElement> {
  injectStylesheet();
  document.body.replaceChildren();
  document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
  const main = document.createElement('main');
  main.innerHTML = `
    <ki-list>
      <ki-list-item>
        Email
        <span slot="secondary">ana@onmars.dev</span>
      </ki-list-item>
    </ki-list>
  `;
  document.body.append(main);
  await customElements.whenDefined('ki-list');
  await customElements.whenDefined('ki-list-item');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const list = main.querySelector('ki-list');
  if (!list) {
    throw new Error('ki-list fixture missing');
  }
  return list;
}

describe('ki-list under the dark scheme', () => {
  it('S8 resolves onmars dark values and has zero axe violations', async () => {
    const list = await mountDarkList();
    const listPart = list.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
    if (!listPart) {
      throw new Error('list part missing');
    }

    expect(getComputedStyle(listPart).backgroundColor).toBe('rgb(10, 10, 10)');
    const results = await axe.run(document.querySelector('main') ?? document.body);
    expect(results.violations).toEqual([]);
  });
});
