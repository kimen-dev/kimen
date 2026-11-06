// @spec:035-live-surface
// The live surface as a security boundary and as a minimal-change renderer:
// batches addressed by stable ids are validated against the resulting state
// before any DOM write, change only what they name, never overwrite the
// user's own state implicitly, and a rejected batch leaves the surface live.
import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type Catalog,
  catalogData,
  createCatalog,
  createLiveSurface,
  type LiveActionEvent,
  type LiveSurface,
  type LiveSurfaceOptions,
  renderUiSpec,
  type UiSpecNode,
  validateUiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const ACTIONS = ['submit', 'pick'];

const boardNode = (): UiSpecNode => ({
  component: 'ki-card',
  id: 'board',
  slots: {
    '': [
      { component: 'ki-input', id: 'note', props: { label: 'Note', name: 'note' } },
      {
        component: 'ki-list',
        id: 'list',
        slots: {
          '': [
            { component: 'ki-list-item', id: 'q-1', slots: { '': ['one'] } },
            { component: 'ki-list-item', id: 'q-2', slots: { '': ['two'] } },
          ],
        },
      },
    ],
    footer: [
      {
        action: 'submit',
        component: 'ki-button',
        id: 'pay',
        props: { variant: 'primary' },
        slots: { '': ['Pay'] },
      },
    ],
    header: ['Draft'],
  },
});

interface Mounted {
  readonly live: LiveSurface;
  readonly events: LiveActionEvent[];
}

const mount = (options: Partial<LiveSurfaceOptions> = {}, withBoard = true): Mounted => {
  const events: LiveActionEvent[] = [];
  const live = createLiveSurface({
    actions: ACTIONS,
    onAction: (event) => events.push(event),
    surface,
    ...options,
  });
  if (withBoard) {
    expect(live.apply({ ops: [{ node: boardNode(), op: 'insert' }] })).toEqual({
      diagnostics: [],
      ok: true,
      revision: 1,
    });
  }
  return { events, live };
};

const one = (selector: string): HTMLElement => {
  const found = surface.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`${selector} is not on the surface`);
  }
  return found;
};

const items = (): HTMLElement[] => [...surface.querySelectorAll<HTMLElement>('ki-list-item')];

/**
 * A canonical form of a subtree: tag, sorted attributes, then children
 * grouped by their slot assignment (order kept within a slot, slots sorted).
 * Light-DOM order ACROSS different slots carries no meaning for slotted
 * content, and the purity wall clones object keys (slot names) in reverse
 * order, so a fresh render of the snapshot may interleave slots differently.
 */
const canon = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return JSON.stringify(node.textContent);
  }
  const element = node as Element;
  // `tabindex` is set by these tests to focus host elements; no catalog
  // entry here declares it, so it never comes from spec data.
  const attributes = [...element.attributes]
    .filter((attribute) => attribute.name !== 'tabindex')
    .map((attribute) => `${attribute.name}=${JSON.stringify(attribute.value)}`)
    .sort();
  const groups = new Map<string, string[]>();
  for (const child of element.childNodes) {
    const slot = child instanceof Element ? (child.getAttribute('slot') ?? '') : '';
    groups.set(slot, [...(groups.get(slot) ?? []), canon(child)]);
  }
  const children = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, list]) => `${slot}{${list.join(',')}}`);
  return `<${element.tagName.toLowerCase()} ${attributes.join(' ')}>${children.join('')}`;
};

const canonical = (container: Element): string => [...container.childNodes].map(canon).join('|');

/** The canonical DOM a fresh guarded render of the snapshot produces (SC-003). */
const freshHtml = (live: LiveSurface, catalog?: Catalog): string =>
  live
    .snapshot()
    .nodes.map((root) => {
      const holder = document.createElement('div');
      const rendered = renderUiSpec(
        { actions: [...live.snapshot().actions], root, version: 1 },
        { surface: holder, onAction: () => undefined, ...(catalog ? { catalog } : {}) },
      );
      expect(rendered.ok).toBe(true);
      return canonical(holder);
    })
    .join('|');

const observe = (): (() => MutationRecord[]) => {
  const observer = new MutationObserver(() => undefined);
  observer.observe(surface, {
    attributeOldValue: true,
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  return () => {
    const records = observer.takeRecords();
    observer.disconnect();
    return records;
  };
};

describe('035 — a batch changes only what it names', () => {
  it('S4 set writes only the changed attributes and keeps identity, focus and typed value', () => {
    const { live } = mount();
    const card = one('ki-card');
    const input = one('ki-input') as HTMLElement & { value?: string };
    input.setAttribute('tabindex', '0');
    input.focus();
    input.value = 'hola';
    const before = [...surface.querySelectorAll('*')];
    const records = observe();
    const result = live.apply({
      ops: [
        { id: 'note', op: 'set', props: { label: 'Your note' } },
        { id: 'pay', op: 'set', props: { variant: 'primary' } },
        { id: 'pay', op: 'set', props: { disabled: true } },
      ],
    });
    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(
      records().map((record) => [
        (record.target as Element).tagName.toLowerCase(),
        record.type,
        record.attributeName,
      ]),
    ).toEqual([
      ['ki-input', 'attributes', 'label'],
      ['ki-button', 'attributes', 'disabled'],
    ]);
    expect([...surface.querySelectorAll('*')]).toEqual(before);
    expect(one('ki-card')).toBe(card);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('hola');
    expect(input.getAttribute('label')).toBe('Your note');
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S4 null unsets a prop and a boolean false removes its attribute', () => {
    const { live } = mount();
    live.apply({ ops: [{ id: 'pay', op: 'set', props: { disabled: true } }] });
    expect(one('ki-button').hasAttribute('disabled')).toBe(true);
    live.apply({ ops: [{ id: 'pay', op: 'set', props: { disabled: false, variant: null } }] });
    expect(one('ki-button').hasAttribute('disabled')).toBe(false);
    expect(one('ki-button').hasAttribute('variant')).toBe(false);
    expect(live.snapshot().nodes[0]?.slots?.['footer']?.[0]).toMatchObject({
      props: { disabled: false },
    });
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S5 inserting a sibling before a focused node adds one node and moves nothing', () => {
    const { live } = mount();
    const [first, second] = items();
    second?.setAttribute('tabindex', '0');
    second?.focus();
    const records = observe();
    const result = live.apply({
      ops: [
        {
          before: 'q-1',
          node: { component: 'ki-list-item', id: 'q-0', slots: { '': ['zero'] } },
          op: 'insert',
          parent: 'list',
        },
      ],
    });
    expect(result.ok).toBe(true);
    const mutations = records();
    expect(mutations).toHaveLength(1);
    expect(mutations[0]?.type).toBe('childList');
    expect(mutations[0]?.addedNodes).toHaveLength(1);
    expect(mutations[0]?.removedNodes).toHaveLength(0);
    expect(items().map((item) => item.textContent)).toEqual(['zero', 'one', 'two']);
    expect(items()[1]).toBe(first);
    expect(items()[2]).toBe(second);
    expect(document.activeElement).toBe(second);
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S5 insert without before appends; a top-level insert lands after the existing roots', () => {
    const { live } = mount();
    live.apply({
      ops: [
        {
          node: { component: 'ki-list-item', id: 'q-3', slots: { '': ['three'] } },
          op: 'insert',
          parent: 'list',
        },
        { node: { component: 'ki-badge', id: 'tail', slots: { '': ['tail'] } }, op: 'insert' },
        {
          before: 'board',
          node: { component: 'ki-badge', id: 'head', slots: { '': ['head'] } },
          op: 'insert',
        },
        {
          node: { component: 'ki-badge', id: 'media', slots: { '': ['m'] } },
          op: 'insert',
          parent: 'board',
          slot: 'media',
        },
      ],
    });
    expect(items().map((item) => item.textContent)).toEqual(['one', 'two', 'three']);
    expect([...surface.children].map((child) => child.textContent.slice(0, 4))).toEqual([
      'head',
      expect.any(String),
      'tail',
    ]);
    expect(one('ki-badge[slot="media"]').textContent).toBe('m');
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S6 a text op updates the slot text node in place and nothing else', () => {
    const { live } = mount();
    const input = one('ki-input');
    input.setAttribute('tabindex', '0');
    input.focus();
    const before = [...surface.querySelectorAll('*')];
    const records = observe();
    expect(
      live.apply({ ops: [{ id: 'board', op: 'text', slot: 'header', text: 'Decided' }] }).ok,
    ).toBe(true);
    expect(records().map((record) => record.type)).toEqual(['characterData']);
    expect(one('span[slot="header"]').textContent).toBe('Decided');
    expect([...surface.querySelectorAll('*')]).toEqual(before);
    expect(document.activeElement).toBe(input);
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S6 a text op on an empty or new slot adds the text; an empty text clears it', () => {
    const { live } = mount();
    expect(live.apply({ ops: [{ id: 'pay', op: 'text', slot: 'end', text: '→' }] }).ok).toBe(true);
    expect(one('ki-button span[slot="end"]').textContent).toBe('→');
    expect(canonical(surface)).toBe(freshHtml(live));
    expect(live.apply({ ops: [{ id: 'pay', op: 'text', slot: 'end', text: '' }] }).ok).toBe(true);
    expect(surface.querySelector('ki-button span[slot="end"]')).toBeNull();
    expect(live.apply({ ops: [{ id: 'q-1', op: 'text', text: 'uno' }] }).ok).toBe(true);
    expect(items()[0]?.textContent).toBe('uno');
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S7 remove detaches only the subtree and frees its ids and its node budget', () => {
    // board, note, list, q-1, q-2, pay = 6 nodes: the surface is at its budget.
    const { live } = mount({ budgets: { maxNodes: 6 } });
    const [, second] = items();
    const extra = {
      node: { component: 'ki-list-item', id: 'q-9', slots: { '': ['nine'] } },
      op: 'insert',
      parent: 'list',
    };
    expect(live.apply({ ops: [extra] }).diagnostics[0]?.rule).toBe('node-count-budget');
    expect(live.apply({ ops: [{ id: 'q-1', op: 'remove' }] }).ok).toBe(true);
    expect(items()).toEqual([second]);
    expect(live.apply({ ops: [extra] }).ok).toBe(true);
    expect(
      live.apply({
        ops: [
          { id: 'q-9', op: 'remove' },
          {
            before: 'q-2',
            node: { component: 'ki-list-item', id: 'q-1', slots: { '': ['again'] } },
            op: 'insert',
            parent: 'list',
          },
        ],
      }).ok,
    ).toBe(true);
    expect(items().map((item) => item.textContent)).toEqual(['again', 'two']);
    expect(items()[1]).toBe(second);
    expect(canonical(surface)).toBe(freshHtml(live));
  });

  it('S8 replace swaps exactly the named node in place and may reuse its id', () => {
    const { live } = mount();
    live.apply({
      ops: [
        {
          node: { component: 'ki-list-item', id: 'q-3', slots: { '': ['three'] } },
          op: 'insert',
          parent: 'list',
        },
      ],
    });
    const [first, , third] = items();
    expect(
      live.apply({
        ops: [
          {
            id: 'q-2',
            node: { component: 'ki-list-item', id: 'q-2', slots: { '': ['TWO'] } },
            op: 'replace',
          },
        ],
      }).ok,
    ).toBe(true);
    expect(items().map((item) => item.textContent)).toEqual(['one', 'TWO', 'three']);
    expect(items()[0]).toBe(first);
    expect(items()[2]).toBe(third);
    expect(live.apply({ ops: [{ id: 'q-2', op: 'text', text: 'two' }] }).ok).toBe(true);
    expect(canonical(surface)).toBe(freshHtml(live));
  });
});

const linkCatalog = (): Catalog => {
  const created = createCatalog(
    {
      components: {
        'acme-link': {
          description: 'A link.',
          events: {},
          props: { href: { description: 'Target.', type: 'string' } },
          slots: { '': 'Label.' },
          tag: 'acme-link',
          whenNotToUse: 'Actions.',
          whenToUse: 'Navigation.',
        },
      },
    },
    { extend: catalogData },
  );
  if (!created.ok) {
    throw new Error(JSON.stringify(created.issues));
  }
  return created.catalog;
};

describe('035 — a batch is atomic and a rejection never kills the surface', () => {
  it('S9 one invalid op among ten discards the whole batch; the next valid batch applies', () => {
    const { live } = mount();
    for (const label of ['a', 'b', 'c']) {
      expect(live.apply({ ops: [{ id: 'note', op: 'set', props: { label } }] }).ok).toBe(true);
    }
    expect(live.revision).toBe(4);
    const html = surface.innerHTML;
    const elements = [...surface.querySelectorAll('*')];
    const snapshot = live.snapshot();
    const ops: unknown[] = Array.from({ length: 10 }, (_, index) => ({
      node: { component: 'ki-list-item', id: `n-${String(index)}`, slots: { '': ['x'] } },
      op: 'insert',
      parent: 'list',
    }));
    ops[6] = { node: { component: 'script', slots: { '': ['window.pwned = 1'] } }, op: 'insert' };
    const result = live.apply({ ops });
    expect(result.ok).toBe(false);
    expect(result.revision).toBe(4);
    expect(result.diagnostics[0]).toMatchObject({
      path: 'ops[6].node.component',
      rule: 'unknown-component',
      value: 'script',
    });
    expect(surface.innerHTML).toBe(html);
    expect([...surface.querySelectorAll('*')]).toEqual(elements);
    expect(live.snapshot()).toBe(snapshot);
    expect(surface.querySelector('script')).toBeNull();
    expect(live.apply({ ops: [{ id: 'note', op: 'set', props: { label: 'd' } }] })).toEqual({
      diagnostics: [],
      ok: true,
      revision: 5,
    });
  });

  it('S9 a failure in a later op undoes nothing because nothing was applied', () => {
    const { live } = mount();
    const html = surface.innerHTML;
    const result = live.apply({
      ops: [
        { id: 'q-1', op: 'remove' },
        { id: 'board', op: 'text', slot: 'header', text: 'Gone' },
        { id: 'missing', op: 'set', props: { label: 'x' } },
      ],
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ path: 'ops[2].id', rule: 'unknown-id', value: 'missing' }),
    ]);
    expect(surface.innerHTML).toBe(html);
  });

  const violations: readonly (readonly [string, unknown, string])[] = [
    [
      'inserts a component outside the catalog',
      { node: { component: 'ki-not-in-catalog' }, op: 'insert' },
      'unknown-component',
    ],
    [
      'sets an undeclared prop',
      { id: 'dec-3', op: 'set', props: { tone: 'danger' } },
      'unknown-prop',
    ],
    [
      'sets the event-handler prop onclick',
      { id: 'pay', op: 'set', props: { onclick: 'alert(1)' } },
      'unknown-prop',
    ],
    [
      'inserts a link whose URL prop is javascript:',
      { node: { component: 'acme-link', props: { href: 'javascript:alert(1)' } }, op: 'insert' },
      'url-scheme',
    ],
    [
      'sets a URL prop to javascript: through a set op',
      { id: 'link', op: 'set', props: { href: ' java\tscript:alert(1)' } },
      'url-scheme',
    ],
    [
      'carries __proto__ inside props',
      JSON.parse('{"op":"set","id":"pay","props":{"__proto__":{"polluted":true}}}'),
      'forbidden-key',
    ],
    [
      'inserts a node whose id is already live',
      { node: { component: 'ki-badge', id: 'pay' }, op: 'insert' },
      'duplicate-id',
    ],
    [
      'inserts a node whose subtree repeats an id',
      {
        node: {
          component: 'ki-card',
          id: 'twin',
          slots: { '': [{ component: 'ki-badge', id: 'twin' }] },
        },
        op: 'insert',
      },
      'duplicate-id',
    ],
    ['targets an id that is not live', { id: 'ghost', op: 'remove' }, 'unknown-id'],
    [
      'inserts into a slot the parent does not declare',
      { node: { component: 'ki-badge' }, op: 'insert', parent: 'dec-3', slot: 'aside' },
      'unknown-slot',
    ],
    [
      'binds an action the surface does not declare',
      { node: { action: 'pwn', component: 'ki-button' }, op: 'insert' },
      'undeclared-action',
    ],
    [
      'inserts before a node that sits in another parent',
      { before: 'pay', node: { component: 'ki-badge' }, op: 'insert', parent: 'dec-3' },
      'invalid-position',
    ],
    [
      'sets text on a slot that holds nodes',
      { id: 'dec-3', op: 'text', slot: 'footer', text: 'x' },
      'slot-has-nodes',
    ],
    [
      'carries an id outside the grammar',
      { node: { component: 'ki-badge', id: 'Bad Id' }, op: 'insert' },
      'invalid-id',
    ],
    ['is not a batch', { op: 'explode', id: 'pay' }, 'malformed-batch'],
  ];

  it.each(violations)('S10 a batch that %s is rejected whole', (_, op, rule) => {
    const catalog = linkCatalog();
    const live = createLiveSurface({ actions: ACTIONS, catalog, surface });
    expect(
      live.apply({
        ops: [
          {
            node: {
              component: 'ki-card',
              id: 'dec-3',
              slots: {
                '': [{ component: 'acme-link', id: 'link', props: { href: 'https://kimen.dev' } }],
                footer: [{ action: 'submit', component: 'ki-button', id: 'pay' }],
              },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const html = surface.innerHTML;
    const result = live.apply({
      ops: [{ id: 'dec-3', op: 'text', slot: 'header', text: 'ok' }, op],
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toContain(rule);
    expect(result.revision).toBe(1);
    expect(surface.innerHTML).toBe(html);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('S10 a hand-built catalog cannot smuggle a native tag or an on* prop through a batch', () => {
    const handBuilt: Catalog = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: {
        'acme-box': {
          description: 'x',
          events: {},
          props: { onclick: { description: 'x', type: 'string' } },
          slots: { '': 'x' },
          tag: 'acme-box',
          whenNotToUse: 'x',
          whenToUse: 'x',
        },
        script: {
          description: 'x',
          events: {},
          props: {},
          slots: { '': 'x' },
          tag: 'script',
          whenNotToUse: 'x',
          whenToUse: 'x',
        },
      },
    };
    const live = createLiveSurface({ catalog: handBuilt, surface });
    const script = live.apply({ ops: [{ node: { component: 'script' }, op: 'insert' }] });
    expect(script.diagnostics[0]?.rule).toBe('invalid-tag');
    expect(
      live.apply({ ops: [{ node: { component: 'acme-box', id: 'b' }, op: 'insert' }] }).ok,
    ).toBe(true);
    const handler = live.apply({ ops: [{ id: 'b', op: 'set', props: { onclick: 'alert(1)' } }] });
    expect(handler.diagnostics[0]?.rule).toBe('forbidden-prop-name');
    expect(surface.querySelector('[onclick]')).toBeNull();
    expect(surface.querySelector('script')).toBeNull();
  });

  it('S11 state budgets pass exactly at the node budget and reject one node beyond it', () => {
    const atBudget = createLiveSurface({ budgets: { maxNodes: 6 }, surface, actions: ACTIONS });
    expect(atBudget.apply({ ops: [{ node: boardNode(), op: 'insert' }] }).ok).toBe(true);
    surface.replaceChildren();
    const beyond = createLiveSurface({ budgets: { maxNodes: 5 }, surface, actions: ACTIONS });
    const result = beyond.apply({ ops: [{ node: boardNode(), op: 'insert' }] });
    expect(result.diagnostics[0]?.rule).toBe('node-count-budget');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S11 the node budget counts every top-level node of the resulting state', () => {
    const live = createLiveSurface({ budgets: { maxNodes: 2 }, surface });
    const badge = (id: string) => ({ node: { component: 'ki-badge', id }, op: 'insert' });
    expect(live.apply({ ops: [badge('a'), badge('b')] }).ok).toBe(true);
    expect(live.apply({ ops: [badge('c')] }).diagnostics[0]).toMatchObject({
      path: 'surface[2]',
      rule: 'node-count-budget',
    });
    expect(live.apply({ ops: [{ id: 'a', op: 'remove' }, badge('c')] }).ok).toBe(true);
  });

  it('S11 one level beyond the depth budget is rejected', () => {
    const live = createLiveSurface({ budgets: { maxDepth: 2 }, surface });
    expect(
      live.apply({
        ops: [
          {
            node: {
              component: 'ki-card',
              id: 'c',
              slots: { '': [{ component: 'ki-card', id: 'd' }] },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const deeper = live.apply({
      ops: [{ node: { component: 'ki-badge' }, op: 'insert', parent: 'd' }],
    });
    expect(deeper.diagnostics[0]?.rule).toBe('depth-budget');
  });

  it('S11 the payload budget binds the serialized resulting state on both sides', () => {
    const batch = { ops: [{ node: boardNode(), op: 'insert' }] };
    const probe = createLiveSurface({ actions: ACTIONS, surface: document.createElement('div') });
    probe.apply(batch);
    const bytes = new TextEncoder().encode(JSON.stringify(probe.snapshot().nodes)).length;
    const exact = createLiveSurface({ actions: ACTIONS, budgets: { maxBytes: bytes }, surface });
    expect(exact.apply(batch).ok).toBe(true);
    surface.replaceChildren();
    const short = createLiveSurface({
      actions: ACTIONS,
      budgets: { maxBytes: bytes - 1 },
      surface,
    });
    expect(short.apply(batch).diagnostics[0]).toMatchObject({
      rule: 'size-budget',
      value: String(bytes),
    });
  });

  it('S12 a batch beyond the op budget is rejected and the surface keeps accepting', () => {
    const live = createLiveSurface({ batchBudgets: { maxOps: 2 }, surface });
    const badge = (id: string) => ({ node: { component: 'ki-badge', id }, op: 'insert' });
    expect(live.apply({ ops: [badge('a'), badge('b'), badge('c')] }).diagnostics[0]?.rule).toBe(
      'batch-op-budget',
    );
    expect(live.apply({ ops: [badge('a'), badge('b')] }).ok).toBe(true);
  });

  it('S12 a batch beyond the byte budget is rejected and the surface keeps accepting', () => {
    const live = createLiveSurface({ batchBudgets: { maxBytes: 200 }, surface });
    const text = (length: number) => ({
      ops: [{ node: { component: 'ki-badge', slots: { '': ['x'.repeat(length)] } }, op: 'insert' }],
    });
    const base = new TextEncoder().encode(JSON.stringify(text(0))).length;
    expect(live.apply(text(201 - base)).diagnostics[0]).toMatchObject({
      rule: 'batch-size-budget',
      value: '201',
    });
    expect(live.apply(text(200 - base)).ok).toBe(true);
  });

  it('S9 an unsupported catalog schema version rejects every batch', () => {
    const live = createLiveSurface({ catalogSchemaVersion: '2.0.0', surface });
    const result = live.apply({ ops: [{ node: { component: 'ki-badge' }, op: 'insert' }] });
    expect(result.diagnostics[0]?.rule).toBe('unsupported-version');
    expect(surface.childNodes).toHaveLength(0);
  });
});

describe("035 — the user's own state is never overwritten implicitly", () => {
  const tickedBox = (options: Partial<LiveSurfaceOptions> = {}) => {
    const live = createLiveSurface({ surface, ...options });
    expect(
      live.apply({
        ops: [
          {
            node: { component: 'ki-checkbox', id: 'agree', props: { name: 'agree' } },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const box = one('ki-checkbox') as HTMLElement & { checked?: boolean };
    // The user ticks the box: the control changes its own property and emits change.
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    return { box, live };
  };

  it('S13 setting a value the user changed is rejected without an explicit override', () => {
    const { box, live } = tickedBox();
    const html = surface.innerHTML;
    const result = live.apply({ ops: [{ id: 'agree', op: 'set', props: { checked: false } }] });
    expect(result.diagnostics[0]).toMatchObject({
      path: 'ops[0].props.checked',
      rule: 'user-state-conflict',
      value: 'true',
    });
    expect(box.checked).toBe(true);
    expect(surface.innerHTML).toBe(html);
    // Agreeing with the user is not a conflict, nor is another prop.
    expect(live.apply({ ops: [{ id: 'agree', op: 'set', props: { checked: true } }] }).ok).toBe(
      true,
    );
    expect(live.apply({ ops: [{ id: 'agree', op: 'set', props: { disabled: true } }] }).ok).toBe(
      true,
    );
  });

  it('S13 an agent may set user-state props the user never touched', () => {
    const live = createLiveSurface({ surface });
    live.apply({ ops: [{ node: { component: 'ki-checkbox', id: 'agree' }, op: 'insert' }] });
    expect(live.apply({ ops: [{ id: 'agree', op: 'set', props: { checked: true } }] }).ok).toBe(
      true,
    );
    expect(one('ki-checkbox').hasAttribute('checked')).toBe(true);
  });

  it('S14 a forced override applies when the host allows it', () => {
    const { box, live } = tickedBox({ allowUserStateOverride: true });
    const result = live.apply({
      ops: [{ force: true, id: 'agree', op: 'set', props: { checked: false } }],
    });
    expect(result.ok).toBe(true);
    expect(box.checked).toBe(false);
  });

  it('S14 a forced override is rejected when the host does not allow it', () => {
    const { box, live } = tickedBox();
    const result = live.apply({
      ops: [{ force: true, id: 'agree', op: 'set', props: { checked: false } }],
    });
    expect(result.diagnostics[0]?.rule).toBe('user-state-override-denied');
    expect(box.checked).toBe(true);
  });
});

describe('035 — revision, optimistic concurrency and snapshot', () => {
  it('S15 the revision advances once per applied batch and never on a rejection', () => {
    const live = createLiveSurface({ surface });
    expect(live.revision).toBe(0);
    expect(
      live.apply({ ops: [{ node: { component: 'ki-badge', id: 'a' }, op: 'insert' }] }).revision,
    ).toBe(1);
    expect(live.apply({ ops: [{ id: 'zz', op: 'remove' }] }).revision).toBe(1);
    expect(live.apply({ ops: [] })).toEqual({ diagnostics: [], ok: true, revision: 1 });
    expect(live.apply({ ops: [{ id: 'a', op: 'remove' }] }).revision).toBe(2);
    expect(live.revision).toBe(2);
  });

  it('S16 a batch computed against a stale revision is rejected', () => {
    const { live } = mount();
    live.apply({ ops: [{ id: 'note', op: 'set', props: { label: 'b' } }] });
    live.apply({ ops: [{ id: 'note', op: 'set', props: { label: 'c' } }] });
    expect(live.revision).toBe(3);
    const html = surface.innerHTML;
    const stale = live.apply({
      ifRevision: 2,
      ops: [{ id: 'note', op: 'set', props: { label: 'd' } }],
    });
    expect(stale.diagnostics[0]).toMatchObject({ rule: 'stale-revision', value: '3' });
    expect(surface.innerHTML).toBe(html);
    expect(
      live.apply({ ifRevision: 3, ops: [{ id: 'note', op: 'set', props: { label: 'd' } }] }).ok,
    ).toBe(true);
  });

  it('S17 the snapshot is the current content as deep-frozen plain data that revalidates', () => {
    const { live } = mount();
    live.apply({
      ops: [
        { id: 'board', op: 'text', slot: 'header', text: 'Decided' },
        { id: 'q-1', op: 'remove' },
        { id: 'pay', op: 'set', props: { variant: 'secondary' } },
      ],
    });
    const snapshot = live.snapshot();
    expect(snapshot).toEqual({
      actions: ACTIONS,
      nodes: [
        {
          component: 'ki-card',
          id: 'board',
          slots: {
            '': [
              { component: 'ki-input', id: 'note', props: { label: 'Note', name: 'note' } },
              {
                component: 'ki-list',
                id: 'list',
                slots: { '': [{ component: 'ki-list-item', id: 'q-2', slots: { '': ['two'] } }] },
              },
            ],
            footer: [
              {
                action: 'submit',
                component: 'ki-button',
                id: 'pay',
                props: { variant: 'secondary' },
                slots: { '': ['Pay'] },
              },
            ],
            header: ['Decided'],
          },
        },
      ],
      revision: 2,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.nodes[0]?.slots?.['footer']?.[0])).toBe(true);
    expect(() => {
      (snapshot.nodes as UiSpecNode[]).push({ component: 'script' });
    }).toThrow(TypeError);
    for (const root of snapshot.nodes) {
      expect(validateUiSpec({ actions: [...snapshot.actions], root, version: 1 }).ok).toBe(true);
    }
    expect(canonical(surface)).toBe(freshHtml(live));
  });
});

describe('035 — actions identify their node', () => {
  it('S18 an action event names the id, the current path, the revision and the latest props', () => {
    const { events, live } = mount();
    live.apply({
      ops: [
        {
          before: 'pay',
          node: { component: 'ki-badge', id: 'hint', slots: { '': ['hint'] } },
          op: 'insert',
          parent: 'board',
          slot: 'footer',
        },
      ],
    });
    live.apply({ ops: [{ id: 'pay', op: 'set', props: { variant: 'secondary' } }] });
    one('ki-button').click();
    expect(events).toEqual([
      {
        action: 'submit',
        data: { variant: 'secondary' },
        id: 'pay',
        path: 'surface[0].slots.footer[1]',
        revision: 3,
      },
    ]);
  });

  it('S18 a node without an id reports no id; a declared-event control reports its live value', () => {
    const live = createLiveSurface({
      actions: ['pick'],
      onAction: (event) => events.push(event),
      surface,
    });
    const events: LiveActionEvent[] = [];
    live.apply({
      ops: [
        { node: { action: 'pick', component: 'ki-button' }, op: 'insert' },
        {
          node: { action: 'pick', component: 'ki-checkbox', id: 'agree', props: { name: 'a' } },
          op: 'insert',
        },
      ],
    });
    one('ki-button').click();
    const box = one('ki-checkbox') as HTMLElement & { checked?: boolean };
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    expect(events).toEqual([
      { action: 'pick', data: {}, path: 'surface[0]', revision: 1 },
      {
        action: 'pick',
        data: { checked: true, name: 'a' },
        id: 'agree',
        path: 'surface[1]',
        revision: 1,
      },
    ]);
  });
});

describe('035 — no code path exists from batch data', () => {
  it('S19 markup in a text op renders as inert text', () => {
    const { live } = mount();
    const markup = '<img src=x onerror=alert(1)>';
    expect(
      live.apply({ ops: [{ id: 'board', op: 'text', slot: 'header', text: markup }] }).ok,
    ).toBe(true);
    expect(one('span[slot="header"]').textContent).toBe(markup);
    expect(surface.querySelector('img')).toBeNull();
    expect(live.apply({ ops: [{ id: 'q-1', op: 'text', text: markup }] }).ok).toBe(true);
    expect(surface.querySelector('img')).toBeNull();
    expect(items()[0]?.textContent).toBe(markup);
  });
});

describe('035 — property: random batches keep the DOM equal to the snapshot (SC-003)', () => {
  it('S9 S10 never leave an element outside the catalog and never diverge from the snapshot', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const component = fc.constantFrom(
      'ki-card',
      'ki-badge',
      'ki-list',
      'ki-list-item',
      'script',
      'ki-nope',
    );
    const node = fc.record({
      component,
      id: fc.option(fc.constantFrom(...ids, 'Bad'), { nil: undefined }),
    });
    const op = fc.oneof(
      fc.record({
        before: fc.option(fc.constantFrom(...ids), { nil: undefined }),
        node,
        op: fc.constant('insert'),
        parent: fc.option(fc.constantFrom(...ids), { nil: undefined }),
      }),
      fc.record({
        id: fc.constantFrom(...ids),
        op: fc.constant('set'),
        props: fc.dictionary(
          fc.constantFrom('tone', 'size', 'bogus'),
          fc.constantFrom('info', 'sm', 'danger', null),
        ),
      }),
      fc.record({
        id: fc.constantFrom(...ids),
        op: fc.constant('text'),
        text: fc.string({ maxLength: 8 }),
      }),
      fc.record({ id: fc.constantFrom(...ids), op: fc.constant('remove') }),
      fc.record({ id: fc.constantFrom(...ids), node, op: fc.constant('replace') }),
    );
    const strip = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
    let applied = 0;
    let rejected = 0;
    fc.assert(
      fc.property(fc.array(fc.array(op, { maxLength: 4 }), { maxLength: 8 }), (batches) => {
        surface.replaceChildren();
        const live = createLiveSurface({ surface });
        for (const ops of batches) {
          const before = surface.innerHTML;
          const revision = live.revision;
          const result = live.apply({ ops: strip(ops) });
          if (result.ok) {
            applied += 1;
          } else {
            rejected += 1;
            expect(surface.innerHTML).toBe(before);
            expect(live.revision).toBe(revision);
          }
          for (const element of surface.querySelectorAll('*')) {
            const tag = element.tagName.toLowerCase();
            expect(tag === 'span' || tag in catalogData.components).toBe(true);
          }
          expect(canonical(surface)).toBe(freshHtml(live));
        }
      }),
      { numRuns: 300, seed: 35 },
    );
    // The generator exercises both paths, not only rejections.
    expect(applied).toBeGreaterThan(100);
    expect(rejected).toBeGreaterThan(100);
  });
});
