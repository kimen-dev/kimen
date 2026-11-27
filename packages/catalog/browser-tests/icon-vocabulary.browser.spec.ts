// @spec:168-emitter-icon-vocabulary
import { afterEach, expect, it, vi } from 'vitest';

import { renderUiSpec, selectSpecIcons } from '../src/index.js';

const selectionKey = Symbol.for('kimen.spec-icons.v1');

afterEach(() => {
  Reflect.deleteProperty(globalThis, selectionKey);
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it.each([
  ['search', 'offered but unregistered'],
  ['plus', 'registered but not offered'],
])('S4 rejects %s (%s) and leaves Cart mounted', (name) => {
  // Catalog browser tests use the registry seam that elements' per-icon
  // imports populate in a host. No elements dependency is needed here.
  vi.stubGlobal(
    Symbol.for('kimen.icon-registry.v1'),
    new Map([
      ['shopping-bag', '<path />'],
      ['tag', '<path />'],
      ['plus', '<path />'],
    ]),
  );
  selectSpecIcons(['shopping-bag', 'tag', 'search']);
  const surface = document.createElement('div');
  document.body.append(surface);
  const render = (root: unknown) => renderUiSpec({ root, version: 1 }, { surface });

  expect(render({ component: 'p', slots: { '': ['Cart'] } }).ok).toBe(true);
  const cart = surface.firstElementChild;
  expect(cart?.textContent).toBe('Cart');
  expect(render({ component: 'ki-icon', props: { name } })).toMatchObject({
    diagnostics: [{ path: 'root.props.name', rule: 'unavailable-icon', value: name }],
    ok: false,
  });
  expect(surface.firstElementChild).toBe(cart);
  expect(surface.textContent).toBe('Cart');
  expect(render({ component: 'ki-icon', props: { name: 'shopping-bag' } }).ok).toBe(true);
});
