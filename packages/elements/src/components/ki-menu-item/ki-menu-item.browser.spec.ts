import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-menu-item.js';

beforeAll(() => { defineCustomElement(); });
afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

it('renders the start slot and a display-only shortcut without changing the action name', async () => {
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const item = document.createElement('ki-menu-item');
  item.setAttribute('value', 'rename');
  item.setAttribute('shortcut', 'F2');
  item.innerHTML = '<span slot="start">✎</span>Rename';
  document.body.append(style, item);

  await expect.element(page.getByRole('menuitem', { name: 'Rename', exact: true })).toBeVisible();
  await expect.element(page.getByText('✎')).toBeVisible();
  await expect.element(page.getByText('F2')).toBeVisible();
});
