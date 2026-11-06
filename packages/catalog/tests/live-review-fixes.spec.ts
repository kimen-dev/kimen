// @spec:035-live-surface
// Regressions of the adversarial review of the live surface:
// S20 names inherited from Object.prototype never resolve as declared slots,
//     props or components, so nothing hides from the state validation;
// S21 replace and remove never discard what the user changed in the node or
//     any descendant without force and the host's permission;
// S22 a batch submitted while another is being applied is rejected.
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type Catalog,
  createLiveSurface,
  type LiveSurface,
  type LiveSurfaceOptions,
  renderUiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const INHERITED = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf'] as const;

const rules = (result: { diagnostics: readonly { rule: string }[] }) =>
  result.diagnostics.map((diagnostic) => diagnostic.rule);

/** Every snapshot root renders cleanly (FR-007). */
const snapshotRenders = (live: LiveSurface): boolean =>
  live
    .snapshot()
    .nodes.every(
      (root) =>
        renderUiSpec(
          { actions: [...live.snapshot().actions], root, version: 1 },
          { surface: document.createElement('div') },
        ).ok,
    );

const countElements = () => surface.querySelectorAll('*').length;

describe('035 S20 — inherited names are never declared ones', () => {
  it.each(INHERITED)(
    'S20 an insert into the undeclared slot "%s" is rejected and renders nothing',
    (slot) => {
      const live = createLiveSurface({ surface });
      expect(
        live.apply({ ops: [{ node: { component: 'ki-card', id: 'c' }, op: 'insert' }] }).ok,
      ).toBe(true);
      const html = surface.innerHTML;
      const result = live.apply({
        ops: [{ node: { component: 'ki-badge', id: 'b' }, op: 'insert', parent: 'c', slot }],
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({
        path: 'ops[0].slot',
        rule: ['__proto__', 'constructor'].includes(slot) ? 'forbidden-key' : 'unknown-slot',
        value: slot,
      });
      expect(result.revision).toBe(1);
      expect(surface.innerHTML).toBe(html);
      expect(snapshotRenders(live)).toBe(true);
    },
  );

  it.each(INHERITED)('S20 a text op on the undeclared slot "%s" is rejected', (slot) => {
    const live = createLiveSurface({ surface });
    live.apply({ ops: [{ node: { component: 'ki-card', id: 'c' }, op: 'insert' }] });
    const result = live.apply({ ops: [{ id: 'c', op: 'text', slot, text: 'hello' }] });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.path).toBe('ops[0].slot');
    expect(surface.textContent).toBe('');
  });

  it('S20 a set can never reach a node through an inherited slot: no on*, style or javascript: lands', () => {
    const live = createLiveSurface({ surface });
    const hide = live.apply({
      ops: [
        { node: { component: 'ki-list', id: 'p' }, op: 'insert' },
        { node: { component: 'ki-badge', id: 'h' }, op: 'insert', parent: 'p', slot: '__proto__' },
      ],
    });
    expect(hide.ok).toBe(false);
    const set = live.apply({
      ops: [
        {
          id: 'h',
          op: 'set',
          props: { href: 'javascript:alert(1)', onclick: 'window.__pwned = 1', style: 'inset:0' },
        },
      ],
    });
    expect(set.ok).toBe(false);
    expect(rules(set)).toEqual(['unknown-id']);
    expect(surface.querySelector('[onclick], [style], [href]')).toBeNull();
  });

  it.each(['toString', 'valueOf', 'hasOwnProperty'])(
    'S20 a set of the inherited prop name "%s" is rejected as unknown-prop',
    (name) => {
      const live = createLiveSurface({ surface });
      live.apply({ ops: [{ node: { component: 'ki-badge', id: 'b' }, op: 'insert' }] });
      const result = live.apply({ ops: [{ id: 'b', op: 'set', props: { [name]: 'x' } }] });
      expect(result.ok).toBe(false);
      expect(rules(result)).toEqual(['unknown-prop']);
      expect(surface.innerHTML).toBe('<ki-badge></ki-badge>');
    },
  );

  it('S20 a hand-built catalog that owns a "__proto__" slot still cannot receive nodes there', () => {
    const catalog = {
      catalogSchemaVersion: '1.1.0',
      components: {
        'acme-box': {
          description: '',
          events: {},
          props: {},
          slots: JSON.parse('{"": "", "__proto__": ""}') as Record<string, string>,
        },
      },
    } as unknown as Catalog;
    const live = createLiveSurface({ budgets: { maxNodes: 2 }, catalog, surface });
    live.apply({ ops: [{ node: { component: 'acme-box', id: 'p' }, op: 'insert' }] });
    for (let batch = 0; batch < 4; batch += 1) {
      const result = live.apply({
        ops: [{ node: { component: 'acme-box' }, op: 'insert', parent: 'p', slot: '__proto__' }],
      });
      expect(rules(result)).toEqual(['forbidden-key']);
    }
    expect(countElements()).toBe(1);
  });

  it('S20 the node budget binds every live node: inserts into an inherited slot cannot grow the DOM', () => {
    const live = createLiveSurface({ budgets: { maxNodes: 3 }, surface });
    live.apply({ ops: [{ node: { component: 'ki-card', id: 'c' }, op: 'insert' }] });
    for (let batch = 0; batch < 10; batch += 1) {
      live.apply({
        ops: [
          { node: { component: 'ki-badge' }, op: 'insert', parent: 'c', slot: '__proto__' },
          { node: { component: 'ki-badge' }, op: 'insert', parent: 'c', slot: '__proto__' },
        ],
      });
    }
    expect(countElements()).toBeLessThanOrEqual(3);
    // The budget itself counts the live state: a third node in a declared slot
    // fills it, a fourth is rejected.
    expect(
      live.apply({
        ops: [
          { node: { component: 'ki-badge' }, op: 'insert', parent: 'c' },
          { node: { component: 'ki-badge' }, op: 'insert', parent: 'c' },
        ],
      }).ok,
    ).toBe(true);
    expect(
      rules(live.apply({ ops: [{ node: { component: 'ki-badge' }, op: 'insert', parent: 'c' }] })),
    ).toEqual(['node-count-budget']);
    expect(countElements()).toBe(3);
  });
});

describe('035 S21 — replace and remove keep what the user changed', () => {
  const touched = (options: Partial<LiveSurfaceOptions> = {}) => {
    const live = createLiveSurface({ ...options, surface });
    expect(
      live.apply({
        ops: [
          {
            node: {
              component: 'ki-card',
              id: 'card',
              slots: {
                '': [{ component: 'ki-input', id: 'note', props: { label: 'Note', value: '' } }],
                header: ['H'],
              },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const input = surface.querySelector<HTMLElement & { value?: string }>('ki-input');
    if (input === null) {
      throw new Error('field missing');
    }
    input.value = 'typed by the user';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { input, live };
  };

  const newCard = {
    component: 'ki-card',
    id: 'card',
    slots: {
      '': [{ component: 'ki-input', id: 'note', props: { label: 'Note' } }],
      header: ['H2'],
    },
  };

  const cases: Record<string, unknown[]> = {
    'remove of the ancestor': [{ id: 'card', op: 'remove' }],
    'remove of the node': [{ id: 'note', op: 'remove' }],
    'remove then insert of the same id': [
      { id: 'note', op: 'remove' },
      { node: { component: 'ki-input', id: 'note' }, op: 'insert', parent: 'card' },
    ],
    'replace of the ancestor': [{ id: 'card', node: newCard, op: 'replace' }],
    'replace of the node': [
      {
        id: 'note',
        node: { component: 'ki-input', id: 'note', props: { label: 'N' } },
        op: 'replace',
      },
    ],
  };

  for (const [name, ops] of Object.entries(cases)) {
    it(`S21 a ${name} is rejected as user-state-conflict and nothing changes`, () => {
      const { input, live } = touched();
      const html = surface.innerHTML;
      const result = live.apply({ ops });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({
        path: 'ops[0].id',
        rule: 'user-state-conflict',
        value: 'typed by the user',
      });
      expect(result.revision).toBe(1);
      expect(surface.innerHTML).toBe(html);
      expect(surface.querySelector('ki-input')).toBe(input);
      expect(input.value).toBe('typed by the user');
    });
  }

  it('S21 a forced replace is rejected when the host does not allow overrides', () => {
    const { input, live } = touched();
    const result = live.apply({ ops: [{ force: true, id: 'card', node: newCard, op: 'replace' }] });
    expect(rules(result)).toEqual(['user-state-override-denied']);
    expect(surface.querySelector('ki-input')).toBe(input);
  });

  it('S21 a forced replace or remove applies when the host allows overrides', () => {
    const { input, live } = touched({ allowUserStateOverride: true });
    expect(
      live.apply({ ops: [{ force: true, id: 'card', node: newCard, op: 'replace' }] }).ok,
    ).toBe(true);
    expect(surface.querySelector('ki-input')).not.toBe(input);
    expect(surface.querySelector('ki-card')?.textContent).toBe('H2');
    surface.replaceChildren();
    const again = touched({ allowUserStateOverride: true });
    expect(again.live.apply({ ops: [{ force: true, id: 'note', op: 'remove' }] }).ok).toBe(true);
  });

  it('S21 a subtree the user never changed, or changed back, is replaced and removed freely', () => {
    const live = createLiveSurface({ surface });
    live.apply({ ops: [{ node: newCard, op: 'insert' }] });
    expect(live.apply({ ops: [{ id: 'card', node: newCard, op: 'replace' }] }).ok).toBe(true);
    surface.replaceChildren();
    const { input, live: other } = touched();
    input.value = '';
    expect(other.apply({ ops: [{ id: 'card', op: 'remove' }] }).ok).toBe(true);
  });
});

describe('035 S22 — one batch at a time', () => {
  class AcmeEcho extends HTMLElement {
    connectedCallback(): void {
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  const catalog = {
    catalogSchemaVersion: '1.1.0',
    components: {
      'acme-echo': {
        description: '',
        events: { change: '' },
        props: { value: { type: 'string' } },
        slots: { '': '' },
      },
      'ki-badge': { description: '', events: {}, props: {}, slots: { '': '' } },
    },
  } as unknown as Catalog;

  it('S22 a batch applied from onAction during a commit is rejected as reentrant-batch', () => {
    if (customElements.get('acme-echo') === undefined) {
      customElements.define('acme-echo', AcmeEcho);
    }
    const inner: string[][] = [];
    const holder: { live?: LiveSurface } = {};
    const live = createLiveSurface({
      actions: ['go'],
      budgets: { maxNodes: 2 },
      catalog,
      onAction: () => {
        const result = holder.live?.apply({
          ops: [{ node: { component: 'ki-badge', id: 'after' }, op: 'insert' }],
        });
        inner.push(result === undefined ? [] : rules(result));
      },
      surface,
    });
    holder.live = live;
    let outer: ReturnType<LiveSurface['apply']> | undefined;
    expect(() => {
      outer = live.apply({
        ops: [
          { node: { action: 'go', component: 'acme-echo', id: 'e' }, op: 'insert' },
          { node: { component: 'ki-badge', id: 'after' }, op: 'insert' },
        ],
      });
    }).not.toThrow();
    expect(outer?.ok).toBe(true);
    expect(inner).toEqual([['reentrant-batch']]);
    expect(live.revision).toBe(1);
    expect([...surface.children].map((element) => element.localName)).toEqual([
      'acme-echo',
      'ki-badge',
    ]);
    expect(live.snapshot().nodes.map((node) => node.id)).toEqual(['e', 'after']);
    // After the outer batch returned, the surface accepts batches again.
    expect(live.apply({ ops: [{ id: 'after', op: 'text', text: 'x' }] }).ok).toBe(true);
  });
});
