// Element identity across renders through the lazy loader
// (`@kimen/elements/loader`): see vdom-keys.ts. The loader registers its own
// definitions, so this file defines nothing else.
import { afterEach, beforeAll, it } from 'vitest';

import { defineCustomElements } from '../loader/index.js';
import { expectButtonLinkSwap, expectDrawerKeepsItsHeader } from './vdom-keys';

beforeAll(async () => {
  await defineCustomElements();
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
