// @spec:122-ki-tree
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineTreeItem } from '../../../dist/components/ki-tree-item.js';
import { defineCustomElement as defineTree } from '../../../dist/components/ki-tree.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineTreeItem();
  defineTree();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browser.emulateHoverCapability(null);
  fixture.replaceChildren();
  fixture.removeAttribute('data-ki-density');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S19 provides touch-sized rows and controls on a coarse pointer', async ({ skip }) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !matchMedia('(pointer: coarse)').matches) {
    expect(navigator.userAgent).not.toContain('Chrome/');
    skip('This engine cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML = `
    <ki-tree label="Files" selection="multiple">
      <ki-tree-item id="source">Source<ki-tree-item>Dialog</ki-tree-item></ki-tree-item>
    </ki-tree>
  `;

  const size = (name: string) =>
    fixture
      .querySelector('#source')
      ?.shadowRoot?.querySelector(`[part~="${name}"]`)
      ?.getBoundingClientRect();

  await expect.poll(() => size('row')?.height ?? 0).toBeGreaterThanOrEqual(44);
  fixture.dataset.kiDensity = 'touch';

  await expect.poll(() => size('row')?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(size('disclosure')?.height).toBeGreaterThanOrEqual(24);
  expect(size('checkbox')?.height).toBeGreaterThanOrEqual(24);
});
