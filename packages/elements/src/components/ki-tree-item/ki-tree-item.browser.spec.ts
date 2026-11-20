// @spec:122-ki-tree
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineTreeItem } from '../../../dist/components/ki-tree-item.js';
import { defineCustomElement as defineTree } from '../../../dist/components/ki-tree.js';

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
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S5 displays loaded children on later expansions without requesting them again', async () => {
  fixture.innerHTML = '<ki-tree label="Files"><ki-tree-item lazy>Tokens</ki-tree-item></ki-tree>';
  const branch = fixture.querySelector('ki-tree-item');
  if (!branch) throw new Error('Missing lazy branch');
  const requests: Event[] = [];
  branch.addEventListener('ki-load', (event) => {
    requests.push(event);
    const child = document.createElement('ki-tree-item');
    child.textContent = 'Palette';
    branch.append(child);
  });
  const disclosure = () => branch.shadowRoot?.querySelector<HTMLElement>('[part="disclosure"]');
  await expect.poll(disclosure).toBeInstanceOf(HTMLElement);
  const control = disclosure();
  if (!control) throw new Error('Missing disclosure');

  await userEvent.click(control);
  const palette = branch.querySelector('ki-tree-item');
  if (!palette) throw new Error('Missing loaded child');
  await expect.poll(() => palette.getClientRects().length).toBeGreaterThan(0);
  await userEvent.click(control);
  await expect.element(branch).not.toHaveAttribute('expanded');
  // The child stays mounted. A role locator on WebKit misses the hidden
  // group across the slot, so check whether the same child has a layout box.
  await expect.poll(() => palette.getClientRects().length).toBe(0);

  await userEvent.click(control);

  await expect.element(branch).toHaveAttribute('expanded');
  await expect.poll(() => palette.getClientRects().length).toBeGreaterThan(0);
  expect(branch.querySelector('ki-tree-item')).toBe(palette);
  expect(requests).toHaveLength(1);
  await expect.poll(() => branch.shadowRoot?.querySelector('ki-spinner')).toBeNull();
});
