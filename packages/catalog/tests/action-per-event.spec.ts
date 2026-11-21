// @spec:154-action-per-event
// A node's action may name, per declared event, the declared action that
// event fires (spec 154): validation, dispatch, the live surface, the five
// components whose binding by name alone picks the event from their own
// state, and the text format that keeps `ki-confirmation`'s tool identifier
// out of the URL policy. happy-dom stands in for the DOM: "the component
// reports an event" is that event dispatched on the rendered element, as the
// component itself dispatches it. The claimed, never cancelled click and the
// validity check of collected fields run in Chromium in
// browser-tests/action-per-event.browser.spec.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ActionEvent,
  type Catalog,
  type CatalogPropConstraint,
  catalogData,
  createCatalog,
  createLiveSurface,
  type LiveActionEvent,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

const builtIn: Catalog = catalogData;

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

// A rendered element seen as the property bag its component exposes.
type Rendered = HTMLElement & Record<string, unknown>;

const rendered = (selector: string, index = 0): Rendered => {
  const element = surface.querySelectorAll<Rendered>(selector)[index];
  if (element === undefined) {
    throw new Error(`nothing rendered for ${selector}`);
  }
  return element;
};

/** The component reports `type`, as its own emitter would. */
const report = (target: Element, type: string): void => {
  target.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
};

const render = (spec: unknown, catalog?: Catalog) => {
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const result = renderUiSpec(spec, {
    onAction,
    surface,
    ...(catalog === undefined ? {} : { catalog }),
  });
  return { onAction, result };
};

const actionsOf = (onAction: ReturnType<typeof render>['onAction']): string[] =>
  onAction.mock.calls.map(([event]) => event.action);

const DIALOG_BINDING = { 'ki-close': 'delete.closed', 'ki-confirm': 'delete.confirmed' };
const CONFIRMATION_BINDING = { 'ki-approve': 'tool.approved', 'ki-deny': 'tool.denied' };

const deleteDialog = (): unknown => ({
  actions: ['delete.confirmed', 'delete.closed'],
  root: {
    action: DIALOG_BINDING,
    component: 'ki-dialog',
    props: { 'confirm-label': 'Yes, delete', heading: 'Delete the task?' },
  },
  version: 1,
});

const confirmation = (tool: string, extra: Record<string, unknown> = {}) => ({
  component: 'ki-confirmation',
  props: {
    action: tool,
    'approve-label': 'Delete',
    'deny-label': 'Keep',
    heading: 'Delete these files?',
  },
  ...extra,
});

describe('a binding per event reports each event as its own action', () => {
  it.each([
    ['ki-confirm', 'delete.confirmed'],
    ['ki-close', 'delete.closed'],
  ])('S1 a dialog bound per event reports %s as "%s" and no other action', (gesture, action) => {
    const { onAction, result } = render(deleteDialog());
    expect(result).toMatchObject({ ok: true });

    report(rendered('ki-dialog'), gesture);

    expect(actionsOf(onAction)).toEqual([action]);
  });

  it.each([
    ['ki-approve', 'tool.approved'],
    ['ki-deny', 'tool.denied'],
  ])(
    'S2 a confirmation card bound to approve and deny reports %s as "%s" and no other action',
    (answer, action) => {
      const { onAction, result } = render({
        actions: ['tool.approved', 'tool.denied'],
        root: confirmation('delete_files', { action: CONFIRMATION_BINDING }),
        version: 1,
      });
      expect(result).toMatchObject({ ok: true });

      report(rendered('ki-confirmation'), answer);

      expect(actionsOf(onAction)).toEqual([action]);
    },
  );

  it('S3 a dialog the host closes after a confirmation still reports the close', () => {
    const { onAction } = render(deleteDialog());
    const dialog = rendered('ki-dialog');
    report(dialog, 'ki-confirm');
    expect(actionsOf(onAction)).toEqual(['delete.confirmed']);

    // ki-dialog reports every close after it happens, the host's included.
    report(dialog, 'ki-close');

    expect(actionsOf(onAction)).toEqual(['delete.confirmed', 'delete.closed']);
  });

  it('S4 each bound event carries the fields its node collects', () => {
    const { onAction, result } = render({
      actions: ['tool.approved', 'tool.denied'],
      root: {
        component: 'div',
        slots: {
          '': [
            { component: 'ki-input', id: 'f-note', props: { label: 'Note' } },
            confirmation('delete_files', {
              action: CONFIRMATION_BINDING,
              collect: { note: 'f-note' },
            }),
          ],
        },
      },
      version: 1,
    });
    expect(result).toMatchObject({ ok: true });
    rendered('ki-input')['value'] = 'Too risky';

    report(rendered('ki-confirmation'), 'ki-deny');

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({
      action: 'tool.denied',
      data: { action: 'delete_files', note: 'Too risky' },
    });
  });

  it('S4 the other bound event carries the same collected fields', () => {
    const { onAction } = render({
      actions: ['tool.approved', 'tool.denied'],
      root: {
        component: 'div',
        slots: {
          '': [
            { component: 'ki-input', id: 'f-note', props: { label: 'Note' } },
            confirmation('delete_files', {
              action: CONFIRMATION_BINDING,
              collect: { note: 'f-note' },
            }),
          ],
        },
      },
      version: 1,
    });
    rendered('ki-input')['value'] = 'Fine by me';

    report(rendered('ki-confirmation'), 'ki-approve');

    expect(onAction.mock.calls[0]?.[0]).toMatchObject({
      action: 'tool.approved',
      data: { note: 'Fine by me' },
    });
  });

  /**
   * A value for each prop the component requires, so the node validates:
   * the first value of an enum, the lower bound of a number, a word otherwise.
   */
  const requiredProps = (tag: string): Record<string, boolean | number | string> => {
    const entry = builtIn.components[tag];
    if (entry === undefined) {
      throw new Error(`${tag} is not in the catalog`);
    }
    const sample = (constraint: CatalogPropConstraint): boolean | number | string =>
      constraint.type === 'enum'
        ? (constraint.values?.[0] ?? '')
        : constraint.type === 'boolean'
          ? true
          : constraint.type === 'number'
            ? (constraint.minimum ?? 1)
            : 'Pick one';
    return Object.fromEntries(
      Object.entries(entry.props)
        .filter(([, constraint]) => constraint.required === true)
        .map(([name, constraint]) => [name, sample(constraint)]),
    );
  };

  it.each([
    ['ki-code-input', 'ki-complete'],
    ['ki-confirmation', 'ki-deny'],
    ['ki-file-upload', 'ki-files-add'],
    ['ki-message', 'ki-feedback'],
    ['ki-popover', 'ki-open'],
    ['ki-search', 'ki-search'],
    ['ki-table', 'ki-sort'],
    ['ki-time-input', 'change'],
    ['ki-tree-item', 'ki-expand'],
  ])('S5 a %s bound to "picked" on %s reports it', (component, event) => {
    const spec = {
      actions: ['picked'],
      root: { action: { [event]: 'picked' }, component, props: requiredProps(component) },
      version: 1,
    };
    const { onAction, result } = render(spec);
    expect(result).toMatchObject({ ok: true });
    // A binding by name alone on the same component stays ambiguous (028 S19).
    expect(
      renderUiSpec(
        { ...spec, root: { ...spec.root, action: 'picked' } },
        { surface: document.createElement('div') },
      ),
    ).toMatchObject({ diagnostics: [{ rule: 'ambiguous-activation-event' }], ok: false });

    report(rendered(component), event);

    expect(actionsOf(onAction)).toEqual(['picked']);
  });

  it('S5 an event the binding does not list fires nothing', () => {
    const { onAction } = render({
      actions: ['picked'],
      root: confirmation('delete_files', { action: { 'ki-deny': 'picked' } }),
      version: 1,
    });

    report(rendered('ki-confirmation'), 'ki-approve');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('S5 an event bubbling from a descendant is not the bound element reporting it', () => {
    const { onAction } = render({
      actions: ['picked'],
      root: {
        action: { 'ki-search': 'picked' },
        component: 'ki-search',
        slots: { trailing: [{ component: 'ki-badge', slots: { '': ['3'] } }] },
      },
      version: 1,
    });

    report(rendered('ki-badge'), 'ki-search');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('S6 a live surface binds per event too', () => {
    const onAction = vi.fn<(event: LiveActionEvent) => void>();
    const live = createLiveSurface({
      actions: ['tool.approved', 'tool.denied'],
      onAction,
      surface,
    });
    const inserted = live.apply({
      ops: [
        {
          node: { ...confirmation('delete_files', { action: CONFIRMATION_BINDING }), id: 'c-1' },
          op: 'insert',
        },
      ],
    });
    expect(inserted).toMatchObject({ ok: true });
    const updated = live.apply({ ops: [{ id: 'c-1', op: 'set', props: { tone: 'danger' } }] });
    expect(updated).toMatchObject({ ok: true });

    report(rendered('ki-confirmation'), 'ki-approve');

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({
      action: 'tool.approved',
      id: 'c-1',
      revision: updated.revision,
    });
    expect(updated.revision).toBe(2);
    // The snapshot carries the binding as the spec wrote it.
    expect(live.snapshot().nodes[0]).toMatchObject({ action: CONFIRMATION_BINDING });
  });

  it('S6 a live surface rejects a batch whose binding per event names an undeclared event', () => {
    const live = createLiveSurface({ actions: ['tool.approved'], surface });

    const result = live.apply({
      ops: [
        {
          node: {
            ...confirmation('delete_files', { action: { 'ki-cancel': 'tool.approved' } }),
            id: 'c-1',
          },
          op: 'insert',
        },
      ],
    });

    expect(result).toMatchObject({ diagnostics: [{ rule: 'undeclared-event' }], ok: false });
    expect(surface.childNodes).toHaveLength(0);
  });
});

describe('a binding names only what the catalog and the spec declare', () => {
  it.each([
    [
      'an event the confirmation card does not declare',
      confirmation('delete_files', { action: { 'ki-cancel': 'pick' } }),
      'undeclared-event',
      'root.action.ki-cancel',
      'ki-cancel',
    ],
    [
      'the platform click on a badge, which declares no event',
      { action: { click: 'pick' }, component: 'ki-badge', slots: { '': ['New'] } },
      'undeclared-event',
      'root.action.click',
      'click',
    ],
    [
      'an action the spec does not declare',
      confirmation('delete_files', { action: { 'ki-deny': 'drop' } }),
      'undeclared-action',
      'root.action.ki-deny',
      'drop',
    ],
    [
      'no event at all',
      confirmation('delete_files', { action: {} }),
      'malformed-spec',
      'root.action',
      undefined,
    ],
    [
      'any event of a paragraph, a native element',
      { action: { click: 'pick' }, component: 'p', slots: { '': ['Hello'] } },
      'action-not-allowed',
      'root.action',
      'p',
    ],
  ])('S7 a binding per event naming %s renders nothing', (_, root, rule, path, value) => {
    const { result } = render({ actions: ['pick'], root, version: 1 });

    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ path, rule, value });
  });

  it('S7 the paragraph diagnostic names the element', () => {
    const report = validateUiSpec({
      actions: ['pick'],
      root: { action: { click: 'pick' }, component: 'p', slots: { '': ['Hello'] } },
      version: 1,
    });

    expect(report.issues[0]?.message).toContain('native element p');
  });

  it('S7 an event name inherited from Object.prototype is not a declared event', () => {
    const report = validateUiSpec({
      actions: ['pick'],
      root: confirmation('delete_files', { action: { toString: 'pick' } }),
      version: 1,
    });

    expect(report.issues).toMatchObject([{ code: 'undeclared-event', value: 'toString' }]);
  });

  it('S7 a binding per event that is neither a name nor a map of names is malformed', () => {
    for (const action of [['pick'], { 'ki-deny': 7 }, 3]) {
      const report = validateUiSpec({
        actions: ['pick'],
        root: confirmation('delete_files', { action }),
        version: 1,
      });
      expect(report.issues[0]?.code).toBe('malformed-spec');
    }
  });

  it('S7 a pagination that navigates natively binds no action per event either', () => {
    const { result } = render({
      actions: ['pick'],
      root: {
        action: { 'ki-page-change': 'pick' },
        component: 'ki-pagination',
        props: { 'href-template': '/page/{page}', total: 5 },
      },
      version: 1,
    });

    expect(result).toMatchObject({
      diagnostics: [{ path: 'root.action', rule: 'ambiguous-activation-event' }],
      ok: false,
    });
  });
});

describe('a binding by name alone keeps its meaning', () => {
  it.each([
    ['an assist chip', 'ki-chip', { type: 'assist' }, 'ki-activate'],
    ['a filter chip', 'ki-chip', {}, 'ki-change'],
    ['a removable input chip', 'ki-chip', { removable: true, type: 'input' }, 'ki-remove'],
    [
      'a dialog whose confirm label is "Yes"',
      'ki-dialog',
      { 'confirm-label': 'Yes', heading: 'Go?' },
      'ki-confirm',
    ],
    ['a dialog without a confirm label', 'ki-dialog', { heading: 'Go?' }, 'ki-close'],
    ['an idle prompt input', 'ki-prompt-input', { label: 'Ask' }, 'ki-submit'],
    [
      'a streaming prompt input',
      'ki-prompt-input',
      { label: 'Ask', status: 'streaming' },
      'ki-stop',
    ],
    ['a combobox', 'ki-combobox', { label: 'Fruit' }, 'change'],
    ['a pagination', 'ki-pagination', { total: 5 }, 'ki-page-change'],
  ])('S8 %s bound by name alone acts on %s only', (_, component, props, event) => {
    const { onAction, result } = render({
      actions: ['pick'],
      root: { action: 'pick', component, props },
      version: 1,
    });
    expect(result).toMatchObject({ ok: true });
    const element = rendered(component);
    const declared = Object.keys(builtIn.components[component]?.events ?? {});
    expect(declared).toContain(event);
    for (const other of declared.filter((name) => name !== event)) {
      report(element, other);
    }
    expect(onAction).not.toHaveBeenCalled();

    report(element, event);

    expect(actionsOf(onAction)).toEqual(['pick']);
  });

  it('S8 a spec written for catalog schema 1.7.0 renders and acts as before', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    const result = renderUiSpec(
      {
        actions: ['dismiss'],
        root: { action: 'dismiss', component: 'ki-dialog', props: { heading: 'Saved' } },
        version: 1,
      },
      { catalogSchemaVersion: '1.7.0', onAction, surface },
    );
    expect(result).toMatchObject({ ok: true });

    report(rendered('ki-dialog'), 'ki-close');

    expect(actionsOf(onAction)).toEqual(['dismiss']);
  });

  it('S8 a binding by name alone on another multi-event component points at a binding per event', () => {
    const { result } = render({
      actions: ['pick'],
      root: confirmation('delete_files', { action: 'pick' }),
      version: 1,
    });

    expect(result.ok).toBe(false);
    const [diagnostic] = result.diagnostics;
    expect(diagnostic).toMatchObject({ path: 'root.action', rule: 'ambiguous-activation-event' });
    expect(diagnostic?.message).toContain('ki-approve');
    expect(diagnostic?.message).toContain('ki-deny');
    expect(diagnostic?.message).toContain('per event');
  });
});

describe('a text prop named like a URL attribute is text when the catalog says so', () => {
  it.each([
    [['https://cdn.example.com'], 'delete_files'],
    [undefined, 'github:create_issue'],
  ])(
    'S9 under the URL origins %j a confirmation card for the tool "%s" renders',
    (allowedUrlOrigins, tool) => {
      const result = renderUiSpec(
        { root: confirmation(tool), version: 1 },
        { surface, ...(allowedUrlOrigins === undefined ? {} : { allowedUrlOrigins }) },
      );

      expect(result).toMatchObject({ diagnostics: [], ok: true });
      expect(rendered('ki-confirmation').getAttribute('action')).toBe(tool);
    },
  );

  it('S9 the confirmation card declares its tool identifier as text', () => {
    expect(catalogData.components['ki-confirmation'].props.action.format).toBe('text');
  });

  it('S9 a registered component may declare a prop named like a URL attribute as text', () => {
    const created = createCatalog({
      components: {
        'acme-tool': {
          description: 'Names a tool.',
          events: {},
          props: { src: { description: 'Tool source system.', format: 'text', type: 'string' } },
          slots: {},
          tag: 'acme-tool',
          whenNotToUse: 'Links.',
          whenToUse: 'Show a tool name.',
        },
      },
    });
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) return;

    const result = renderUiSpec(
      { root: { component: 'acme-tool', props: { src: 'jira:issue' } }, version: 1 },
      { allowedUrlOrigins: [], catalog: created.catalog, surface },
    );

    expect(result).toMatchObject({ ok: true });
  });

  it('S10 a registered prop named href that declares no format stays a URL', () => {
    const created = createCatalog({
      components: {
        'acme-link': {
          description: 'A link.',
          events: {},
          props: { href: { description: 'Where it goes.', type: 'string' } },
          slots: { '': 'Link text.' },
          tag: 'acme-link',
          whenNotToUse: 'Actions.',
          whenToUse: 'Navigate.',
        },
      },
    });
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) return;

    const result = renderUiSpec(
      {
        root: {
          component: 'acme-link',
          props: { href: 'javascript:alert(1)' },
          slots: { '': ['Open'] },
        },
        version: 1,
      },
      { catalog: created.catalog, surface },
    );

    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    expect(result.diagnostics).toMatchObject([{ path: 'root.props.href', rule: 'url-scheme' }]);
  });

  it('S10 a prop that declares the URL format stays a URL whatever its name', () => {
    const created = createCatalog({
      components: {
        'acme-embed': {
          description: 'An embed.',
          events: {},
          props: { target: { description: 'What it loads.', format: 'url', type: 'string' } },
          slots: {},
          tag: 'acme-embed',
          whenNotToUse: 'Links.',
          whenToUse: 'Embed a page.',
        },
      },
    });
    if (!created.ok) throw new Error(JSON.stringify(created.issues));

    const report = validateUiSpec(
      { root: { component: 'acme-embed', props: { target: 'data:text/html,x' } }, version: 1 },
      { catalog: created.catalog },
    );

    expect(report.issues).toMatchObject([{ code: 'url-scheme' }]);
  });
});
