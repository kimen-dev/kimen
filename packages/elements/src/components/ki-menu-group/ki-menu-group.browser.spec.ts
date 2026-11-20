import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-menu-group.js';

beforeAll(() => {
  defineCustomElement();
});
afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

it('exposes the group label without adding a tab stop', async () => {
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const group = document.createElement('ki-menu-group');
  group.setAttribute('label', 'Edit');
  group.textContent = 'Rename';
  document.body.append(style, group);

  await expect.element(page.getByRole('group', { name: 'Edit' })).toBeVisible();
  await expect.element(page.getByText('Edit')).toBeVisible();
  expect(group.tabIndex).toBe(-1);
});
