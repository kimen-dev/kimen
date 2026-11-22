// @spec:158-native-tables
// Read-only native tables at the guarded boundary (Art. VIII): seven more
// native tags keep the guarantees of spec 037 — closed attributes (a th's
// scope only), inert text, no actions — under a strict content model that
// keeps the table valid HTML, in validation, in rendering and on every live
// batch's resulting state. The accessibility tree lives in
// browser-tests/native-tables.browser.spec.ts; ki-table's real styling in the
// MCP Apps surface document (adapter-mcp-apps browser-tests).
import { beforeEach, describe, expect, it } from 'vitest';

import {
  catalogData,
  createLiveSurface,
  createStreamingRenderer,
  NATIVE_PRIMITIVE_TAGS,
  renderUiSpec,
  type UiSpec,
  type UiSpecNode,
  validateUiSpec,
} from '../src/index.js';

type Child = UiSpecNode | string;
type Props = Readonly<Record<string, boolean | number | string>>;
type Patch = Readonly<Partial<Record<string, Partial<UiSpecNode>>>>;

const TABLE_TAGS = ['table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td'] as const;

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

/** The element a rendered spec must contain (fails the test loudly otherwise). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected element is missing');
  }
  return value;
}

const spec = (root: UiSpecNode, actions?: readonly string[]): UiSpec => ({
  version: 1,
  ...(actions === undefined ? {} : { actions }),
  root,
});

/** A node builder that merges `patch[component]` into every node of that component. */
const builder =
  (patch: Patch = {}) =>
  (component: string, children: readonly Child[] = [], props?: Props): UiSpecNode => {
    // A spec is a data tree: every node gets its own copy of the patch.
    const extra = structuredClone(patch[component]);
    const merged = { ...props, ...extra?.props };
    return {
      ...extra,
      component,
      ...(Object.keys(merged).length === 0 ? {} : { props: merged }),
      ...(children.length === 0 ? {} : { slots: { '': children } }),
    };
  };

const node = builder();

/** The "Pedidos" table: a caption, a header row and two body rows with badges. */
function pedidos(patch: Patch = {}): UiSpecNode {
  const el = builder(patch);
  return el('table', [
    el('caption', ['Pedidos']),
    el('thead', [
      el('tr', [el('th', ['Pedido'], { scope: 'col' }), el('th', ['Estado'], { scope: 'col' })]),
    ]),
    el('tbody', [
      el('tr', [el('th', ['A-17'], { scope: 'row' }), el('td', [el('ki-badge', ['Pendiente'])])]),
      el('tr', [el('th', ['A-18'], { scope: 'row' }), el('td', [el('ki-badge', ['Enviado'])])]),
    ]),
  ]);
}

/** A valid table whose only cell holds `children`. */
const cell = (...children: Child[]): UiSpecNode =>
  node('table', [node('tbody', [node('tr', [node('td', children)])])]);
/** A valid table whose only row is `row`. */
const tableOf = (row: UiSpecNode): UiSpecNode => node('table', [node('tbody', [row])]);
const bodyRow = (): UiSpecNode => node('tbody', [node('tr', [node('td', ['x'])])]);
/** The `index`-th child of a node's default slot, when it is a node. */
const childNode = (parent: UiSpecNode | undefined, index: number): UiSpecNode | undefined => {
  const child = parent?.slots?.['']?.[index];
  return typeof child === 'object' ? child : undefined;
};

describe('158 — a table renders as native elements', () => {
  it('S1 renders a ki-table holding a captioned table with a header row and two body rows', () => {
    const input = spec(node('ki-table', [pedidos()]));
    expect(validateUiSpec(input)).toEqual({ issues: [], ok: true });
    expect(renderUiSpec(input, { surface })).toEqual({ diagnostics: [], ok: true });
    const host = must(surface.querySelector('ki-table'));
    expect(host.querySelectorAll('table')).toHaveLength(1);
    const table = must(host.querySelector(':scope > table'));
    expect([...table.children].map((child) => child.localName)).toEqual([
      'caption',
      'thead',
      'tbody',
    ]);
    expect(table.querySelector(':scope > caption')?.textContent).toBe('Pedidos');
    const headRows = table.querySelectorAll(':scope > thead > tr');
    expect(headRows).toHaveLength(1);
    expect([...must(headRows[0]).children].map((child) => child.localName)).toEqual(['th', 'th']);
    const bodyRows = [...table.querySelectorAll(':scope > tbody > tr')];
    expect(bodyRows).toHaveLength(2);
    for (const row of bodyRows) {
      expect(row.lastElementChild?.localName).toBe('td');
      expect(row.lastElementChild?.firstElementChild?.localName).toBe('ki-badge');
    }
  });

  it('S1 the built-in catalog carries the seven table elements at catalog schema 1.9.0', () => {
    expect(catalogData.catalogSchemaVersion).toBe('1.9.0');
    for (const tag of TABLE_TAGS) {
      expect(NATIVE_PRIMITIVE_TAGS).toContain(tag);
      const entry = catalogData.components[tag];
      expect(entry.tag).toBe(tag);
      expect(entry.events).toEqual({});
      expect(Object.keys(entry.slots)).toEqual(['']);
      for (const text of [entry.description, entry.whenToUse, entry.whenNotToUse]) {
        expect(text.trim()).not.toBe('');
      }
      expect(entry.slots[''].trim()).not.toBe('');
    }
    expect(Object.keys(catalogData.components.th.props)).toEqual(['scope']);
    expect(catalogData.components.th.props.scope).toMatchObject({
      type: 'enum',
      values: ['col', 'row'],
    });
    expect(catalogData.components.th.props.scope).not.toHaveProperty('default');
    expect(catalogData.components.th.props.scope).not.toHaveProperty('required');
    for (const tag of TABLE_TAGS.filter((name) => name !== 'th')) {
      expect(catalogData.components[tag].props).toEqual({});
    }
  });

  it('S2 the renderer writes a th scope as its only attribute and nothing else on a table element', () => {
    expect(renderUiSpec(spec(pedidos()), { surface }).ok).toBe(true);
    const elements = [...surface.querySelectorAll(TABLE_TAGS.join(', '))];
    // table, caption, thead, tbody, three tr, four th and two td.
    expect(elements).toHaveLength(13);
    for (const element of elements) {
      const expected = element.localName === 'th' ? ['scope'] : [];
      expect(element.getAttributeNames()).toEqual(expected);
    }
    expect(
      [...surface.querySelectorAll('th')].map((header) => header.getAttribute('scope')),
    ).toEqual(['col', 'col', 'row', 'row']);
  });
});

describe('158 — a table keeps its content model', () => {
  const accepted: readonly (readonly [string, UiSpecNode])[] = [
    [
      'a table holding a caption, a thead and a tbody, in order',
      node('table', [
        node('caption', ['Pedidos']),
        node('thead', [node('tr', [node('th', ['Pedido'])])]),
        bodyRow(),
      ]),
    ],
    ['a table holding two tbody elements', node('table', [bodyRow(), bodyRow()])],
    ['a td holding a ki-badge and the text "activo"', cell(node('ki-badge', ['Sí']), 'activo')],
    [
      'a caption holding the text "Pedidos" and an em',
      node('table', [node('caption', ['Pedidos ', node('em', ['urgentes'])]), bodyRow()]),
    ],
    ['a layout div holding a table', node('div', [cell('x')])],
    ['the default slot of ki-table holding a table', node('ki-table', [cell('x')])],
  ];

  it.each(accepted)('S4 accepts %s', (_, root) => {
    expect(validateUiSpec(spec(root))).toEqual({ issues: [], ok: true });
    expect(renderUiSpec(spec(root), { surface }).ok).toBe(true);
  });

  const rejected: readonly (readonly [string, UiSpecNode, string])[] = [
    ['a table holding a td', node('table', [node('td', ['x'])]), 'root.slots.[0]'],
    [
      'a table holding a tbody followed by a caption',
      node('table', [bodyRow(), node('caption', ['Pedidos'])]),
      'root.slots.[1]',
    ],
    [
      'a table holding two thead elements',
      node('table', [
        node('thead', [node('tr', [node('th', ['A'])])]),
        node('thead', [node('tr', [node('th', ['B'])])]),
      ]),
      'root.slots.[1]',
    ],
    ['a table holding the text "Pedidos"', node('table', ['Pedidos']), 'root.slots.[0]'],
    [
      'a tbody holding a td',
      node('table', [node('tbody', [node('td', ['x'])])]),
      'root.slots.[0].slots.[0]',
    ],
    [
      'a tr holding a layout div',
      tableOf(node('tr', [node('div')])),
      'root.slots.[0].slots.[0].slots.[0]',
    ],
    [
      'a tr holding the text "A-17"',
      tableOf(node('tr', ['A-17'])),
      'root.slots.[0].slots.[0].slots.[0]',
    ],
    ['a td holding a table', cell(cell('x')), 'root.slots.[0].slots.[0].slots.[0].slots.[0]'],
    [
      'a caption holding a layout div',
      node('table', [node('caption', [node('div')])]),
      'root.slots.[0].slots.[0]',
    ],
    ['a layout div holding a tr', node('div', [node('tr', [node('td', ['x'])])]), 'root.slots.[0]'],
    [
      'the default slot of ki-card holding a td',
      node('ki-card', [node('td', ['x'])]),
      'root.slots.[0]',
    ],
    ['the spec with a tr as its root', node('tr', [node('td', ['x'])]), 'root'],
  ];

  it.each(rejected)('S4 rejects %s as invalid-child', (_, root, path) => {
    const report = validateUiSpec(spec(root));
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({ code: 'invalid-child', path });
    expect(report.issues[0]?.message.trim()).not.toBe('');
    const rendered = renderUiSpec(spec(root), { surface });
    expect(rendered.ok).toBe(false);
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual(['invalid-child']);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S4 a misplaced part names where it belongs, and a parent names what it accepts', () => {
    const messageOf = (root: UiSpecNode): string =>
      validateUiSpec(spec(root)).issues[0]?.message ?? '';
    expect(messageOf(node('div', [node('tr')]))).toMatch(/\btr\b.*\bthead\b.*\btbody\b/u);
    expect(messageOf(node('ki-card', [node('td')]))).toMatch(/\btd\b.*\btr\b/u);
    expect(messageOf(tableOf(node('tr', [node('div')])))).toMatch(/\bth\b.*\btd\b/u);
    expect(messageOf(node('table', [bodyRow(), node('caption')]))).toMatch(/\bcaption\b/u);
    expect(messageOf(cell(cell('x')))).toMatch(/\btable\b/u);
  });

  it('S4 empty table elements are valid, as an empty paragraph is', () => {
    for (const root of [
      node('table'),
      node('table', [node('thead'), node('tbody')]),
      tableOf(node('tr')),
      cell(),
    ]) {
      expect(validateUiSpec(spec(root))).toEqual({ issues: [], ok: true });
    }
  });

  it('S4 a streamed chunk is a root: a table is accepted and a table part halts the stream', () => {
    const stream = createStreamingRenderer({ surface });
    expect(stream.push(cell('x')).ok).toBe(true);
    expect(surface.querySelector('table td')?.textContent).toBe('x');
    const part = stream.push(node('tr', [node('td', ['y'])]));
    expect(part.ok).toBe(false);
    expect(part.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual(['invalid-child']);
    expect(surface.querySelectorAll('tr')).toHaveLength(1);
  });
});

describe('158 — a table is for reading', () => {
  it.each([
    ['table', 'background'],
    ['table', 'class'],
    ['th', 'data-sort'],
    ['tr', 'data-key'],
    ['tr', 'aria-selected'],
    ['tr', 'onclick'],
    ['td', 'colspan'],
    ['td', 'scope'],
    ['td', 'style'],
  ])('S5 a %s rejects the attribute "%s" it does not declare', (element, attribute) => {
    const input = spec(pedidos({ [element]: { props: { [attribute]: 'x' } } }));
    const report = validateUiSpec(input);
    expect(report.ok).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    for (const issue of report.issues) {
      expect(issue).toMatchObject({ code: 'unknown-prop', value: attribute });
    }
    expect(renderUiSpec(input, { surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });

  it.each([
    ['col', true],
    ['row', true],
    [undefined, true],
    ['colgroup', false],
    ['rowgroup', false],
    ['COL', false],
  ])('S6 a th declaring the scope %s is accepted: %s', (scope, ok) => {
    const header = scope === undefined ? node('th', ['Pedido']) : node('th', ['Pedido'], { scope });
    const report = validateUiSpec(spec(tableOf(node('tr', [header]))));
    if (ok) {
      expect(report).toEqual({ issues: [], ok: true });
    } else {
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]?.code).toBe('invalid-prop-type');
      expect(report.issues[0]?.path).toMatch(/\.props\.scope$/u);
    }
  });

  it.each(TABLE_TAGS)('S7 a %s never binds an action', (element) => {
    for (const action of ['abrir', { click: 'abrir' }] as const) {
      const input = spec(pedidos({ [element]: { action } }), ['abrir']);
      const report = validateUiSpec(input);
      expect(report.ok).toBe(false);
      expect(new Set(report.issues.map((issue) => issue.code))).toEqual(
        new Set(['action-not-allowed']),
      );
      expect(renderUiSpec(input, { surface }).ok).toBe(false);
      expect(surface.childNodes).toHaveLength(0);
    }
  });

  it('S7 a cell may hold a catalog component that binds an action', () => {
    const button: UiSpecNode = {
      action: 'abrir',
      component: 'ki-button',
      slots: { '': ['Abrir'] },
    };
    expect(validateUiSpec(spec(cell(button, 'A-17'), ['abrir']))).toEqual({ issues: [], ok: true });
  });
});

describe('158 — live surfaces keep the table content model', () => {
  const row = (id: string, ...cells: string[]): UiSpecNode => ({
    component: 'tr',
    id,
    slots: { '': cells.map((text) => node('td', [text])) },
  });
  const board = (): UiSpecNode => ({
    component: 'div',
    id: 'fila',
    slots: {
      '': [
        {
          component: 'table',
          slots: {
            '': [
              { component: 'tbody', id: 'cuerpo', slots: { '': [row('r1', 'A-17', 'Pendiente')] } },
            ],
          },
        },
      ],
    },
  });
  const mount = () => {
    const live = createLiveSurface({ surface });
    expect(live.apply({ ops: [{ node: board(), op: 'insert' }] }).ok).toBe(true);
    return live;
  };

  it('S8 a live batch adds a row to a rendered table in place', () => {
    const live = mount();
    const tbody = must(surface.querySelector('tbody'));
    const first = must(tbody.querySelector('tr'));
    const result = live.apply({
      ops: [{ node: row('r2', 'A-18', 'Enviado'), op: 'insert', parent: 'cuerpo' }],
    });
    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(surface.querySelector('tbody')).toBe(tbody);
    const rows = [...tbody.children];
    expect(rows.map((element) => element.localName)).toEqual(['tr', 'tr']);
    expect(rows[0]).toBe(first);
    expect([...must(rows[1]).children].map((cellElement) => cellElement.textContent)).toEqual([
      'A-18',
      'Enviado',
    ]);
    const body = childNode(childNode(live.snapshot().nodes[0], 0), 0);
    expect(
      body?.slots?.['']?.map((child) => (typeof child === 'string' ? child : child.id)),
    ).toEqual(['r1', 'r2']);
  });

  it('S8 a live batch replaces a row where the old one stood', () => {
    const live = mount();
    const result = live.apply({
      ops: [{ id: 'r1', node: row('r3', 'A-17', 'Enviado'), op: 'replace' }],
    });
    expect(result.ok).toBe(true);
    const rows = [...must(surface.querySelector('tbody')).children];
    expect(rows).toHaveLength(1);
    expect([...must(rows[0]).children].map((element) => element.textContent)).toEqual([
      'A-17',
      'Enviado',
    ]);
  });

  it.each([
    ['inserts into "fila" a td', { node: node('td', ['x']), op: 'insert', parent: 'fila' }],
    ['inserts into "cuerpo" a layout div', { node: node('div'), op: 'insert', parent: 'cuerpo' }],
    ['inserts a tr as a top-level node', { node: row('r9', 'x'), op: 'insert' }],
    ['replaces a row with a layout div', { id: 'r1', node: node('div'), op: 'replace' }],
  ])('S9 a live batch that %s changes nothing', (_, op) => {
    const live = mount();
    const html = surface.innerHTML;
    const elements = [...surface.querySelectorAll('*')];
    const snapshot = live.snapshot();
    const result = live.apply({ ops: [op] });
    expect(result.ok).toBe(false);
    expect(result.revision).toBe(1);
    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toContain('invalid-child');
    expect(surface.innerHTML).toBe(html);
    expect([...surface.querySelectorAll('*')]).toEqual(elements);
    expect(live.snapshot()).toBe(snapshot);
  });

  it('S9 a text op cannot write text into a row', () => {
    const live = mount();
    const empty: UiSpecNode = { component: 'tr', id: 'r2' };
    expect(live.apply({ ops: [{ node: empty, op: 'insert', parent: 'cuerpo' }] }).ok).toBe(true);
    const html = surface.innerHTML;
    const snapshot = live.snapshot();
    const result = live.apply({ ops: [{ id: 'r2', op: 'text', text: 'A-18' }] });
    expect(result.ok).toBe(false);
    expect(result.revision).toBe(2);
    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual(['invalid-child']);
    expect(surface.innerHTML).toBe(html);
    expect(live.snapshot()).toBe(snapshot);
  });
});
