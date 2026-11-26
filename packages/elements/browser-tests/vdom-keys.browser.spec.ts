// Element identity across renders through the per-component modules
// (`@kimen/elements/ki-*`): see vdom-keys.ts.
import { afterEach, beforeAll, it } from 'vitest';

import { defineCustomElement as defineButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineDrawer } from '../dist/components/ki-drawer.js';
import { expectButtonLinkSwap, expectDrawerKeepsItsHeader } from './vdom-keys';

beforeAll(() => {
  defineButton();
  defineDrawer();
});

afterEach(() => {
  document.body.replaceChildren();
});

it('ki-button swaps its button and its link, and keeps its status region', async () => {
  await expectButtonLinkSwap();
});

it('ki-drawer adds and removes its handle without rebuilding its header', async () => {
  await expectDrawerKeepsItsHeader();
});
