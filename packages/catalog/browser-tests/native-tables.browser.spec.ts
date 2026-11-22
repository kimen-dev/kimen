// @spec:158-native-tables
// S2 in a real engine: the accessibility tree of a table rendered from a
// spec, which happy-dom does not compute. Plain native elements only, so the
// suite stays free of @kimen/elements (module boundaries: scope:catalog);
// ki-table's own styling is proven in the MCP Apps surface document.
import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { renderUiSpec, type UiSpecNode } from '../src/index.js';

type Child = UiSpecNode | string;
const node = (component: string, children: readonly Child[] = [], props?: UiSpecNode['props']) => ({
  component,
  ...(props === undefined ? {} : { props }),
  ...(children.length === 0 ? {} : { slots: { '': children } }),
});
const header = (label: string, scope: 'col' | 'row'): UiSpecNode => node('th', [label], { scope });

beforeEach(() => {
  document.body.replaceChildren();
});

describe('158 — a native table in a real engine', () => {
  it('S2 a table exposes its caption as its name and its scoped th cells as column and row headers', async () => {
    const surface = document.createElement('section');
    document.body.append(surface);
    const table = node('table', [
      node('caption', ['Pedidos']),
      node('thead', [node('tr', [header('Pedido', 'col'), header('Estado', 'col')])]),
      node('tbody', [
        node('tr', [header('A-17', 'row'), node('td', ['Pendiente'])]),
        node('tr', [header('A-18', 'row'), node('td', ['Enviado'])]),
      ]),
    ]);
    expect(renderUiSpec({ root: table, version: 1 }, { surface }).ok).toBe(true);

    const named = page.getByRole('table', { exact: true, name: 'Pedidos' });
    await expect.element(named).toBeInTheDocument();
    const names = (role: 'columnheader' | 'rowheader') =>
      named
        .getByRole(role)
        .elements()
        .map((element) => element.textContent);
    expect(names('columnheader')).toEqual(['Pedido', 'Estado']);
    expect(names('rowheader')).toEqual(['A-17', 'A-18']);
    for (const label of ['A-17', 'A-18']) {
      await expect
        .element(named.getByRole('rowheader', { exact: true, name: label }))
        .toBeInTheDocument();
    }
    expect(
      named
        .getByRole('cell')
        .elements()
        .map((element) => element.textContent),
    ).toEqual(['Pendiente', 'Enviado']);
  });
});
