// @spec:152-guardrail-containment
// A rendered spec touches only what it inserted. Reference props resolve to
// nodes of the same spec or surface through ids the renderer allocates, and
// a spec never submits or resets a host form. The real-component outcomes
// (a menu opening, a copy, a form submission) run in the MCP Apps browser
// suite (containment.browser.spec.ts); this suite pins the boundary itself.
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type Catalog,
  catalogData,
  createCatalog,
  createLiveSurface,
  preflightUiSpec,
  renderUiSpec,
  type UiSpecNode,
  validateUiSpec,
} from '../src/index.js';

const HOST_ID = 'checkout';

interface ReferenceCase {
  readonly component: string;
  readonly prop: string;
  /** A spec node of `component` whose `prop` names `reference`. */
  readonly node: (reference: string) => UiSpecNode;
  /** A node of the same spec the reference may legitimately name. */
  readonly target: UiSpecNode;
}

const button = (id: string, label: string): UiSpecNode => ({
  component: 'ki-button',
  id,
  slots: { '': [label] },
});
const field = (id: string): UiSpecNode => ({ component: 'ki-input', id, props: { label: 'Tag' } });

const REFERENCES: readonly ReferenceCase[] = [
  {
    component: 'ki-menu',
    node: (reference) => ({
      component: 'ki-menu',
      props: { anchor: reference },
      slots: {
        '': [
          { component: 'ki-menu-item', props: { value: 'archive' }, slots: { '': ['Archive'] } },
        ],
      },
    }),
    prop: 'anchor',
    target: button('target', 'Actions'),
  },
  {
    component: 'ki-popover',
    node: (reference) => ({
      component: 'ki-popover',
      props: { for: reference },
      slots: { '': ['Filters'] },
    }),
    prop: 'for',
    target: button('target', 'Filters'),
  },
  {
    component: 'ki-tooltip',
    node: (reference) => ({ component: 'ki-tooltip', props: { for: reference, label: 'Share' } }),
    prop: 'for',
    target: button('target', 'Share'),
  },
  {
    component: 'ki-counter',
    node: (reference) => ({ component: 'ki-counter', props: { for: reference, value: 3 } }),
    prop: 'for',
    target: button('target', 'Inbox'),
  },
  {
    component: 'ki-copy-button',
    node: (reference) => ({ component: 'ki-copy-button', props: { from: reference } }),
    prop: 'from',
    target: field('target'),
  },
  {
    component: 'ki-chip-group',
    node: (reference) => ({
      component: 'ki-chip-group',
      props: { 'focus-target': reference },
      slots: { '': [{ component: 'ki-chip', slots: { '': ['Paris'] } }] },
    }),
    prop: 'focus-target',
    target: field('target'),
  },
];

function reference(component: string): ReferenceCase {
  const found = REFERENCES.find((candidate) => candidate.component === component);
  if (found === undefined) {
    throw new Error(`no reference case for ${component}`);
  }
  return found;
}

function one(selector: string): Element {
  const element = surface.querySelector(selector);
  if (element === null) {
    throw new Error(`${selector} did not render`);
  }
  return element;
}

const specOf = (...children: UiSpecNode[]) => ({
  root: { component: 'ki-stack', slots: { '': children } },
  version: 1,
});

let surface: HTMLElement;
let hostElement: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  hostElement = document.createElement('button');
  hostElement.id = HOST_ID;
  hostElement.textContent = 'Pay';
  surface = document.createElement('div');
  document.body.append(hostElement, surface);
});

const hostSnapshot = () => hostElement.outerHTML;

describe('a reference resolves only to a node of the same surface', () => {
  it.each(REFERENCES)(
    'accepts a $component $prop that names a node of its own spec',
    ({ node, target }) => {
      expect(validateUiSpec(specOf(target, node('target'))).issues).toEqual([]);
    },
  );

  it.each(REFERENCES)(
    'S2 rejects a $component $prop that names an id no node of the spec carries',
    ({ node, prop, target }) => {
      const spec = specOf(target, node(HOST_ID));
      const before = hostSnapshot();

      const report = validateUiSpec(spec);
      expect(report.ok).toBe(false);
      expect(report.issues).toContainEqual(
        expect.objectContaining({
          code: 'invalid-reference',
          path: `root.slots.[1].props.${prop}`,
          value: HOST_ID,
        }),
      );

      const rendered = renderUiSpec(spec, { surface });
      expect(rendered.ok).toBe(false);
      expect(rendered.diagnostics).toContainEqual(
        expect.objectContaining({ rule: 'invalid-reference', value: HOST_ID }),
      );
      expect(surface.childNodes).toHaveLength(0);
      expect(hostSnapshot()).toBe(before);
    },
  );

  it('rejects a reference that is not a node id at all', () => {
    const report = validateUiSpec(specOf(reference('ki-menu').node('#checkout')));
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-reference', value: '#checkout' }),
    );
  });

  it('S1 writes a reference as the id the renderer allocated for its own spec node', () => {
    // The host page already uses the spec's logical id for its own element.
    hostElement.id = 'actions';
    const before = hostSnapshot();
    const spec = specOf(button('actions', 'Actions'), reference('ki-menu').node('actions'));

    expect(renderUiSpec(spec, { surface }).ok).toBe(true);

    const specButton = one('ki-button');
    const menu = one('ki-menu');
    expect(specButton.id).not.toBe('');
    expect(specButton.id).not.toBe('actions');
    expect(menu.getAttribute('anchor')).toBe(specButton.id);
    expect(document.querySelectorAll(`[id="${specButton.id}"]`)).toHaveLength(1);
    expect(hostSnapshot()).toBe(before);
  });

  it('S3 points a copy button at its own spec field, never at the host field sharing its id', () => {
    const hostField = document.createElement('input');
    hostField.type = 'password';
    hostField.id = 'secret';
    hostField.value = 'hunter2';
    document.body.prepend(hostField);
    const spec = specOf(field('secret'), reference('ki-copy-button').node('secret'));

    expect(renderUiSpec(spec, { surface }).ok).toBe(true);

    const specField = one('ki-input');
    const copy = one('ki-copy-button');
    expect(copy.getAttribute('from')).toBe(specField.id);
    expect(specField.id).not.toBe('secret');
    expect(hostField.id).toBe('secret');
    expect(hostField.value).toBe('hunter2');
  });

  it('never writes an id on a spec node that nothing references', () => {
    expect(renderUiSpec(specOf(button('lonely', 'Alone')), { surface }).ok).toBe(true);
    expect(one('ki-button').hasAttribute('id')).toBe(false);
  });

  it('rejects the same references at the DOM-less boundary', () => {
    const result = preflightUiSpec(specOf(reference('ki-popover').node(HOST_ID)));
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'invalid-reference', value: HOST_ID }),
    );
  });
});

describe('a live surface keeps its references inside', () => {
  const tooltip = (reference: string): UiSpecNode => ({
    component: 'ki-tooltip',
    id: 'hint',
    props: { for: reference, label: 'Share this page' },
  });

  it('S4 rejects a batch that references no node of the surface, whole', () => {
    const live = createLiveSurface({ actions: [], surface });
    expect(live.apply({ ops: [{ node: button('share', 'Share'), op: 'insert' }] }).ok).toBe(true);
    const shown = surface.innerHTML;

    const result = live.apply({
      ops: [
        { node: { component: 'ki-badge', slots: { '': ['New'] } }, op: 'insert' },
        { node: tooltip(HOST_ID), op: 'insert' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'invalid-reference', value: HOST_ID }),
    );
    expect(surface.innerHTML).toBe(shown);
  });

  it('gives a node already on the surface an allocated id when a later batch references it', () => {
    const live = createLiveSurface({ actions: [], surface });
    expect(live.apply({ ops: [{ node: button('share', 'Share'), op: 'insert' }] }).ok).toBe(true);

    expect(live.apply({ ops: [{ node: tooltip('share'), op: 'insert' }] }).ok).toBe(true);

    const shareButton = one('ki-button');
    expect(shareButton.id).not.toBe('');
    expect(shareButton.id).not.toBe('share');
    expect(one('ki-tooltip').getAttribute('for')).toBe(shareButton.id);
  });

  it('rejects a batch that removes a node another node still references', () => {
    const live = createLiveSurface({ actions: [], surface });
    expect(
      live.apply({
        ops: [
          { node: button('share', 'Share'), op: 'insert' },
          { node: tooltip('share'), op: 'insert' },
        ],
      }).ok,
    ).toBe(true);
    const shown = surface.innerHTML;

    const result = live.apply({ ops: [{ id: 'share', op: 'remove' }] });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'invalid-reference', value: 'share' }),
    );
    expect(surface.innerHTML).toBe(shown);
  });
});

describe('a spec never submits or resets a host form', () => {
  let form: HTMLFormElement;

  beforeEach(() => {
    form = document.createElement('form');
    form.name = 'payment';
    form.append(surface);
    document.body.append(form);
  });

  it.each(['submit', 'reset'])('S6 rejects a spec that asks for a %s button', (type) => {
    const spec = specOf({ component: 'ki-button', props: { type }, slots: { '': ['Continue'] } });

    const report = validateUiSpec(spec);
    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: 'invalid-prop-type',
        path: 'root.slots.[0].props.type',
        value: type,
      }),
    );
    expect(renderUiSpec(spec, { surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('offers agents only the button type for the catalog button', () => {
    const type = catalogData.components['ki-button'].props.type;
    expect(type.values).toEqual(['button']);
    expect(type.default).toBe('button');
  });

  it('S5 pins type="button" on a spec button bound to no action', () => {
    const spec = specOf({ component: 'ki-button', slots: { '': ['Continue'] } });
    expect(renderUiSpec(spec, { surface }).ok).toBe(true);
    expect(one('ki-button').getAttribute('type')).toBe('button');
  });

  it('S5 pins type="button" on an unbound button a live batch inserts', () => {
    const live = createLiveSurface({ actions: [], surface });
    expect(live.apply({ ops: [{ node: button('go', 'Continue'), op: 'insert' }] }).ok).toBe(true);
    expect(one('ki-button').getAttribute('type')).toBe('button');
  });

  it('S7 pins type="button" on a spec button bound to a declared action', () => {
    const spec = {
      ...specOf({ action: 'confirm', component: 'ki-button', slots: { '': ['Confirm'] } }),
      actions: ['confirm'],
    };
    expect(renderUiSpec(spec, { surface }).ok).toBe(true);
    expect(one('ki-button').getAttribute('type')).toBe('button');
  });
});

describe('consumer catalogs follow the same rules', () => {
  let catalog: Catalog;

  beforeEach(() => {
    const created = createCatalog(
      {
        components: {
          'acme-hint': {
            description: 'A hint attached to another element.',
            events: {},
            props: {
              for: { description: 'The described element.', format: 'idref', type: 'string' },
            },
            slots: { '': 'Hint text.' },
            tag: 'acme-hint',
            whenNotToUse: 'Essential information.',
            whenToUse: 'A short supplementary hint.',
          },
          'acme-action': {
            description: 'An action control.',
            events: {},
            props: {
              type: { description: 'Form behavior.', type: 'enum', values: ['button', 'submit'] },
            },
            slots: { '': 'Label.' },
            tag: 'acme-action',
            whenNotToUse: 'Navigation.',
            whenToUse: 'Trigger an action.',
          },
        },
      },
      { extend: catalogData },
    );
    if (!created.ok) {
      throw new Error(JSON.stringify(created.issues));
    }
    catalog = created.catalog;
  });

  it('holds a declared reference prop to the nodes of the same spec', () => {
    const hint = (reference: string): UiSpecNode => ({
      component: 'acme-hint',
      props: { for: reference },
      slots: { '': ['Saved automatically'] },
    });
    expect(validateUiSpec(specOf(button('save', 'Save'), hint('save')), { catalog }).ok).toBe(true);
    expect(validateUiSpec(specOf(hint(HOST_ID)), { catalog }).issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-reference', value: HOST_ID }),
    );
  });

  it('rejects a form-action type value a consumer catalog declares', () => {
    const spec = specOf({
      component: 'acme-action',
      props: { type: 'submit' },
      slots: { '': ['Go'] },
    });
    expect(validateUiSpec(spec, { catalog }).issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-prop-type', value: 'submit' }),
    );
  });
});
