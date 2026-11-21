// @spec:153-action-collect
// A bound node collects the live values of other fields (spec 153): the
// action data, the validation codes, the live surface and the event id.
// happy-dom stands in for the DOM and evaluates no constraint validation, so
// here every collected field is valid; the validity gate (S4, S5, S6, S11)
// runs in Chromium in browser-tests/collect.browser.spec.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ActionEvent,
  CATALOG_SCHEMA_VERSION,
  createLiveSurface,
  createStreamingRenderer,
  type LiveActionEvent,
  renderUiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

// A rendered element seen as the property bag its component exposes; the
// tests write a property to stand for what the person typed or chose.
type Rendered = HTMLElement & Record<string, unknown>;

const rendered = (selector: string, index = 0): Rendered => {
  const element = surface.querySelectorAll<Rendered>(selector)[index];
  if (element === undefined) {
    throw new Error(`nothing rendered for ${selector}`);
  }
  return element;
};

const click = (target: Element): void => {
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
  );
};

/** A spec whose root lays out `children` and declares the action "add". */
const form = (children: readonly unknown[]): unknown => ({
  actions: ['add'],
  root: { component: 'div', slots: { '': children } },
  version: 1,
});

const addButton = (collect?: Record<string, string>): Record<string, unknown> => ({
  action: 'add',
  component: 'ki-button',
  props: { variant: 'primary' },
  slots: { '': ['Add'] },
  ...(collect === undefined ? {} : { collect }),
});

const render = (spec: unknown) => {
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const result = renderUiSpec(spec, { onAction, surface });
  return { onAction, result };
};

describe('a bound node delivers the live values of the fields it names', () => {
  it('S1 a button that collects two fields delivers both values with its own props', () => {
    const { onAction, result } = render(
      form([
        { component: 'ki-input', id: 'f-title', props: { label: 'Title' } },
        { component: 'ki-number-input', id: 'f-qty', props: { label: 'Quantity' } },
        addButton({ quantity: 'f-qty', title: 'f-title' }),
      ]),
    );
    expect(result).toEqual({ diagnostics: [], ok: true });
    rendered('ki-input')['value'] = 'Buy milk';
    rendered('ki-number-input')['value'] = 2;

    click(rendered('ki-button'));

    expect(onAction).toHaveBeenCalledOnce();
    const event = onAction.mock.calls[0]?.[0];
    expect(event?.action).toBe('add');
    expect(event?.data).toEqual({ quantity: 2, title: 'Buy milk', variant: 'primary' });
  });

  it('S2 a collected number arrives as a number and a collected checkbox as true or false', () => {
    const { onAction } = render(
      form([
        { component: 'ki-number-input', id: 'f-qty', props: { label: 'Quantity' } },
        { component: 'ki-checkbox', id: 'f-urgent', slots: { '': ['Urgent'] } },
        { component: 'ki-checkbox', id: 'f-gift', slots: { '': ['Gift'] } },
        addButton({ gift: 'f-gift', quantity: 'f-qty', urgent: 'f-urgent' }),
      ]),
    );
    rendered('ki-number-input')['value'] = 2;
    rendered('ki-checkbox', 0)['checked'] = true;
    rendered('ki-checkbox', 1)['checked'] = false;

    click(rendered('ki-button'));

    const data = onAction.mock.calls[0]?.[0]?.data;
    expect(data?.['quantity']).toBe(2);
    expect(data?.['urgent']).toBe(true);
    expect(data?.['gift']).toBe(false);
  });

  it('S3 an empty number field contributes no entry and an empty text field contributes empty text', () => {
    const { onAction } = render(
      form([
        { component: 'ki-input', id: 'f-notes', props: { label: 'Notes' } },
        { component: 'ki-number-input', id: 'f-qty', props: { label: 'Quantity' } },
        addButton({ notes: 'f-notes', quantity: 'f-qty' }),
      ]),
    );
    // Empty controls: a text field holds "", a number field holds no number.
    rendered('ki-input')['value'] = '';
    rendered('ki-number-input')['value'] = undefined;

    click(rendered('ki-button'));

    const data = onAction.mock.calls[0]?.[0]?.data;
    expect(data?.['notes']).toBe('');
    expect(data !== undefined && Object.hasOwn(data, 'quantity')).toBe(false);
  });

  it('S12 on a live surface the button collects from the field the surface holds now', () => {
    const onAction = vi.fn<(event: LiveActionEvent) => void>();
    const live = createLiveSurface({ actions: ['add'], onAction, surface });
    expect(
      live.apply({
        ops: [
          {
            node: { component: 'ki-input', id: 'f-title', props: { label: 'Title' } },
            op: 'insert',
          },
          { node: { ...addButton({ title: 'f-title' }), id: 'add' }, op: 'insert' },
        ],
      }),
    ).toMatchObject({ ok: true });
    const before = rendered('ki-input');
    before['value'] = 'stale';
    expect(
      live.apply({
        ops: [
          {
            id: 'f-title',
            node: { component: 'ki-input', id: 'f-title', props: { label: 'Title' } },
            op: 'replace',
          },
        ],
      }),
    ).toMatchObject({ ok: true });
    const after = rendered('ki-input');
    expect(after).not.toBe(before);
    after['value'] = 'Buy milk';

    click(rendered('ki-button'));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({
      action: 'add',
      data: { title: 'Buy milk', variant: 'primary' },
      id: 'add',
    });
  });
});

describe('a collect that cannot work is rejected whole', () => {
  const fields = [
    { component: 'ki-input', id: 'f-title', props: { label: 'Title' } },
    { component: 'ki-checkbox-group', id: 'f-topics', props: { label: 'Topics' } },
  ];
  const thirtyThree = Object.fromEntries(
    Array.from({ length: 33 }, (_, index) => [`v${String(index)}`, 'f-title']),
  );
  const unbound = {
    component: 'ki-button',
    props: { variant: 'primary' },
    collect: { title: 'f-title' },
  };

  it.each([
    ['collects "f-title" while bound to no action', unbound, 'collect-without-action'],
    [
      'is bound to "add" and collects "f-missing", an id no node carries',
      addButton({ title: 'f-missing' }),
      'collect-unknown-node',
    ],
    [
      'is bound to "add" and collects the checkbox group "f-topics"',
      addButton({ topics: 'f-topics' }),
      'collect-no-value',
    ],
    [
      'is bound to "add" and collects "f-title" under the name "variant"',
      addButton({ variant: 'f-title' }),
      'collect-key-conflict',
    ],
    ['is bound to "add" and collects 33 values', addButton(thirtyThree), 'collect-budget'],
  ])('S7 a button that %s renders nothing and names the rule', (_, button, rule) => {
    const { onAction, result } = render(form([...fields, button]));

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual([rule]);
    expect(surface.childNodes).toHaveLength(0);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('S8 a live batch that removes a collected field is rejected whole', () => {
    const live = createLiveSurface({ actions: ['add'], surface });
    expect(
      live.apply({
        ops: [
          {
            node: { component: 'ki-input', id: 'f-title', props: { label: 'Title' } },
            op: 'insert',
          },
          { node: { ...addButton({ title: 'f-title' }), id: 'add' }, op: 'insert' },
        ],
      }),
    ).toMatchObject({ ok: true });
    const snapshot = live.snapshot();
    const field = rendered('ki-input');

    const removal = live.apply({ ops: [{ id: 'f-title', op: 'remove' }] });

    expect(removal.ok).toBe(false);
    expect(removal.diagnostics).toEqual([
      expect.objectContaining({ rule: 'collect-unknown-node', value: 'f-title' }),
    ]);
    expect(removal.revision).toBe(1);
    expect(live.snapshot()).toBe(snapshot);
    expect(rendered('ki-input')).toBe(field);
    expect(field.isConnected).toBe(true);
  });
});

describe('an action event names its node, and older specs keep their meaning', () => {
  const button = { ...addButton(), id: 'add-task' };

  it.each([
    [
      'a rendered spec',
      (onAction: (event: ActionEvent) => void) =>
        renderUiSpec({ actions: ['add'], root: button, version: 1 }, { onAction, surface }),
    ],
    [
      'a streamed node',
      (onAction: (event: ActionEvent) => void) =>
        createStreamingRenderer({ actions: ['add'], onAction, surface }).push(button),
    ],
  ])('S9 %s names the id of its node in the action event', (_, mount) => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    expect(mount(onAction).ok).toBe(true);

    click(rendered('ki-button'));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({ action: 'add', id: 'add-task' });
  });

  it('S10 a spec written for catalog schema 1.6.0 renders and acts as before', () => {
    expect(CATALOG_SCHEMA_VERSION).toBe('1.7.0');
    const { onAction, result } = render({
      actions: ['add'],
      catalogSchemaVersion: '1.6.0',
      root: addButton(),
      version: 1,
    });
    expect(result).toEqual({ diagnostics: [], ok: true });

    click(rendered('ki-button'));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction.mock.calls[0]?.[0]).toEqual({
      action: 'add',
      data: { variant: 'primary' },
      path: 'root',
    });
  });
});
