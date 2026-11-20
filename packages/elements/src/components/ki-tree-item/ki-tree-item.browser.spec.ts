// @spec:122-ki-tree
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

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
  await expect.element(page.getByRole('treeitem', { name: 'Palette' })).toBeVisible();
  await userEvent.click(control);
  await expect.element(page.getByRole('treeitem', { name: 'Palette' })).not.toBeInTheDocument();

  await userEvent.click(control);

  await expect.element(page.getByRole('treeitem', { name: 'Palette' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(branch.shadowRoot?.querySelector('ki-spinner')).toBeNull();
});
