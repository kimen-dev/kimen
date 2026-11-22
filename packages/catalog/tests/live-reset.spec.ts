// @spec:155-live-surface-reset-focus
// A `reset` empties a control only when what it holds already left in an
// action: nothing the person typed and did not send is lost, and the host's
// override permission is never needed. happy-dom proves the decisions; the
// Chromium suites prove the fields on screen.
import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLiveSurface,
  type LiveActionEvent,
  type LiveBatch,
  type LiveSurface,
  type UiSpecNode,
} from '../src/index.js';

type Control = HTMLElement & Record<string, unknown>;

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const one = (selector: string): Control => {
  const found = surface.querySelector<Control>(selector);
  if (found === null) {
    throw new Error(`${selector} is not on the surface`);
  }
  return found;
};

const field = (id: string, props: Record<string, string> = {}): UiSpecNode => ({
  component: 'ki-input',
  id,
  props: { label: id, ...props },
});

const button = (id: string, action: string, collect: Record<string, string>): UiSpecNode => ({
  action,
  collect,
  component: 'ki-button',
  id,
  slots: { '': [id] },
});

/** What the person does: types into a field, or presses a button. */
const type = (control: Control, text: string): void => {
  control['value'] = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
};

const press = (control: Control): void => {
  control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const reset = (live: LiveSurface, ...ids: string[]) =>
  live.apply({ ops: ids.map((id) => ({ id, op: 'reset' })) } satisfies LiveBatch);

/** The field "title" and the button "add" that collects it; no override permission. */
const form = (props: Record<string, string> = {}) => {
  const onAction = vi.fn<(event: LiveActionEvent) => void>();
  const live = createLiveSurface({ actions: ['add'], onAction, surface });
  expect(
    live.apply({
      ops: [
        { node: field('title', props), op: 'insert' },
        { node: button('add', 'add', { title: 'title' }), op: 'insert' },
      ],
    }).ok,
  ).toBe(true);
  return { add: one('ki-button'), live, onAction, title: one('ki-input') };
};

/** The same, after the person typed "Buy milk" and "add" delivered it. */
const delivered = () => {
  const mounted = form();
  type(mounted.title, 'Buy milk');
  press(mounted.add);
  expect(mounted.onAction).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'add', data: { title: 'Buy milk' } }),
  );
  return mounted;
};

describe('155 — a reset clears only what an action already delivered', () => {
  it('S9 after an action delivered a field’s text, a reset empties it without host permission', () => {
    const { live, title } = delivered();

    const result = reset(live, 'title');

    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(title['value']).toBe('');
    expect(title.hasAttribute('value')).toBe(false);
  });

  it('S10 a reset after the person typed again is rejected and keeps the new text', () => {
    const { live, title } = delivered();
    type(title, 'Buy bread');
    const html = surface.innerHTML;

    const result = reset(live, 'title');

    expect(result).toMatchObject({
      diagnostics: [{ path: 'ops[0].id', rule: 'unsent-user-input' }],
      ok: false,
      revision: 1,
    });
    expect(title['value']).toBe('Buy bread');
    expect(surface.innerHTML).toBe(html);
    expect(JSON.stringify(result)).not.toContain('Buy bread');
    expect(JSON.stringify(result)).not.toContain('Buy milk');
  });

  it('S11 a reset of a field the person never touched succeeds and changes nothing', () => {
    const { live, title } = form();

    const result = reset(live, 'title');

    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(title['value'] ?? '').toBe('');
  });

  it('S13 a reset restores the value the spec gave the field', () => {
    const { add, live, onAction, title } = form({ value: 'Draft' });
    type(title, 'Ready');
    press(add);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ data: { title: 'Ready' } }));

    expect(reset(live, 'title').ok).toBe(true);

    expect(title['value']).toBe('Draft');
    expect(title.getAttribute('value')).toBe('Draft');
  });

  it('S14 a reset of an id no node of the surface carries is rejected whole', () => {
    const { live, title } = delivered();

    const result = reset(live, 'title', 't9');

    expect(result).toMatchObject({
      diagnostics: [{ path: 'ops[1].id', rule: 'unknown-id', value: 't9' }],
      ok: false,
      revision: 1,
    });
    expect(title['value']).toBe('Buy milk');
    // The rejected batch emptied nothing: "title" still resets once delivered.
    expect(reset(live, 'title').ok).toBe(true);
  });
});

describe('155 — what counts as delivered', () => {
  it('a field that sends its own value with its action can be reset', () => {
    const onAction = vi.fn<(event: LiveActionEvent) => void>();
    const live = createLiveSurface({ actions: ['rename'], onAction, surface });
    const node = { ...field('title'), action: 'rename' };
    expect(live.apply({ ops: [{ node, op: 'insert' }] }).ok).toBe(true);
    const title = one('ki-input');
    type(title, 'Buy milk');
    title.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onAction.mock.calls.map(([event]) => [event.action, event.data['value']])).toEqual([
      ['rename', 'Buy milk'],
    ]);

    expect(reset(live, 'title').ok).toBe(true);
    expect(title['value']).toBe('');
  });

  it('an action its collected fields block delivers nothing', () => {
    const { add, live, onAction, title } = form();
    type(title, 'Buy milk');
    title['reportValidity'] = () => false;
    press(add);
    expect(onAction).not.toHaveBeenCalled();

    expect(reset(live, 'title').diagnostics[0]?.rule).toBe('unsent-user-input');
    expect(title['value']).toBe('Buy milk');
  });

  it('a surface without an action channel delivers nothing', () => {
    const live = createLiveSurface({ actions: ['add'], surface });
    live.apply({
      ops: [
        { node: field('title'), op: 'insert' },
        { node: button('add', 'add', { title: 'title' }), op: 'insert' },
      ],
    });
    type(one('ki-input'), 'Buy milk');
    press(one('ki-button'));

    expect(reset(live, 'title').diagnostics[0]?.rule).toBe('unsent-user-input');
  });

  it('a set that agreed with the person does not make their unsent text resettable (spec 159)', () => {
    const { add, live, title } = form();
    type(title, 'Buy bread');
    expect(
      live.apply({ ops: [{ id: 'title', op: 'set', props: { value: 'Buy bread' } }] }).ok,
    ).toBe(true);

    expect(reset(live, 'title').diagnostics[0]?.rule).toBe('unsent-user-input');
    // Nor can a later set take it: the text stays the person's.
    expect(live.apply({ ops: [{ id: 'title', op: 'set', props: { value: 'Buy milk' } }] }).ok).toBe(
      false,
    );
    expect(title['value']).toBe('Buy bread');

    press(add);
    expect(reset(live, 'title').ok).toBe(true);
  });

  it('after a forced override of one prop, a reset still keeps the person’s other input (spec 160)', () => {
    const live = createLiveSurface({ allowUserStateOverride: true, surface });
    const node = { component: 'ki-search', id: 'find', props: { label: 'Find' } };
    expect(live.apply({ ops: [{ node, op: 'insert' }] }).ok).toBe(true);
    const find = one('ki-search');
    find['value'] = 'secret';
    find['open'] = true;
    find.dispatchEvent(new Event('input', { bubbles: true }));
    expect(
      live.apply({ ops: [{ force: true, id: 'find', op: 'set', props: { open: false } }] }).ok,
    ).toBe(true);

    const result = reset(live, 'find');

    expect(result).toMatchObject({
      diagnostics: [{ path: 'ops[0].id', rule: 'unsent-user-input' }],
      ok: false,
    });
    expect(result.diagnostics[0]?.message).toContain('"value"');
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(find['value']).toBe('secret');
  });

  it('after a reset the field is the agent’s again, until the person types', () => {
    const { live, title } = delivered();
    expect(reset(live, 'title').ok).toBe(true);
    const set = (value: string) =>
      live.apply({ ops: [{ id: 'title', op: 'set', props: { value } }] });

    expect(set('Buy eggs').ok).toBe(true);
    type(title, 'Buy flour');

    expect(set('Buy rice').diagnostics[0]?.rule).toBe('user-state-conflict');
    expect(reset(live, 'title').diagnostics[0]?.rule).toBe('unsent-user-input');
    expect(title['value']).toBe('Buy flour');
  });

  it('a reset is checked against the state before its batch: a new value goes in a later batch', () => {
    const { live, title } = delivered();
    const set = { id: 'title', op: 'set', props: { value: 'Buy eggs' } } as const;

    const together = live.apply({ ops: [{ id: 'title', op: 'reset' }, set] });

    expect(together).toMatchObject({
      diagnostics: [{ path: 'ops[1].props.value', rule: 'user-state-conflict' }],
      ok: false,
    });
    expect(title['value']).toBe('Buy milk');
    expect(reset(live, 'title').ok).toBe(true);
    expect(live.apply({ ops: [set] }).ok).toBe(true);
  });

  it('a reset of a node that declares no user-state prop is rejected as unknown-prop', () => {
    const live = createLiveSurface({ surface });
    live.apply({ ops: [{ node: { component: 'ki-card', id: 'card' }, op: 'insert' }] });

    expect(reset(live, 'card')).toMatchObject({
      diagnostics: [{ path: 'ops[0].id', rule: 'unknown-prop' }],
      ok: false,
    });
  });

  it('a reset of a node the same batch inserts is accepted', () => {
    const live = createLiveSurface({ surface });

    const result = live.apply({
      ops: [
        { node: field('title'), op: 'insert' },
        { id: 'title', op: 'reset' },
      ],
    });

    expect(result.ok).toBe(true);
  });
});

describe('155 — SC-003: no reset loses text typed after the last delivery', () => {
  type Step =
    | { readonly kind: 'type'; readonly text: string }
    | { readonly kind: 'deliver' | 'reset' };
  const step: fc.Arbitrary<Step> = fc.oneof(
    fc.record({
      kind: fc.constant('type' as const),
      text: fc.constantFrom('', 'Buy milk', 'Buy bread'),
    }),
    fc.record({ kind: fc.constantFrom('deliver' as const, 'reset' as const) }),
  );

  it('a reset applies only when the field shows nothing or what was last delivered', () => {
    fc.assert(
      fc.property(fc.array(step, { maxLength: 12 }), (steps) => {
        document.body.replaceChildren();
        surface = document.createElement('div');
        document.body.appendChild(surface);
        const { add, live, title } = form();
        let sent: unknown;
        for (const next of steps) {
          if (next.kind === 'type') {
            type(title, next.text);
          } else if (next.kind === 'deliver') {
            press(add);
            sent = title['value'];
          } else {
            const shown = title['value'] ?? '';
            const result = reset(live, 'title');
            if (shown === '' || shown === sent) {
              expect(result.ok).toBe(true);
              expect(title['value']).toBe('');
              sent = undefined;
            } else {
              expect(result.diagnostics[0]?.rule).toBe('unsent-user-input');
              expect(title['value']).toBe(shown);
            }
          }
        }
      }),
    );
  });
});
