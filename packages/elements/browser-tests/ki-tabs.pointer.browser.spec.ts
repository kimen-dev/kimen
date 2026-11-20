import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineKiTabs();
  defineKiTab();
  defineKiTabPanel();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

it('keeps both variants touch sized with compact density and the smallest tab size', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a touch screen');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    document.body.innerHTML = `<main data-ki-density="compact">
      <ki-tabs label="Mail" size="xs" variant="primary">
        <ki-tab value="mail"><svg slot="icon" viewBox="0 0 20 20"><rect width="20" height="20"/></svg>Mail</ki-tab>
        <ki-tab-panel value="mail">Messages</ki-tab-panel>
      </ki-tabs>
      <ki-tabs label="Content" size="xs" variant="secondary">
        <ki-tab value="info"><svg slot="icon" viewBox="0 0 20 20"><rect width="20" height="20"/></svg>Info</ki-tab>
        <ki-tab-panel value="info">Overview</ki-tab-panel>
      </ki-tabs>
    </main>`;

    const mail = page.getByRole('tab', { name: 'Mail', exact: true }).element();
    const info = page.getByRole('tab', { name: 'Info', exact: true }).element();
    await expect
      .poll(() =>
        Math.min(mail.getBoundingClientRect().height, info.getBoundingClientRect().height),
      )
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(() => Math.min(mail.getBoundingClientRect().width, info.getBoundingClientRect().width))
      .toBeGreaterThanOrEqual(44);
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
