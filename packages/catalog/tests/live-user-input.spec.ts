// @spec:159-live-surface-unsent-input
// What the person typed, ticked or selected and has not sent stays theirs: a
// `set` that agrees with it does not hand it to the agent, and no rejection
// repeats it. happy-dom proves the decisions; the Chromium suite proves the
// field on screen keeps the text.
import { beforeEach, describe, expect, it } from 'vitest';

import { createLiveSurface, type LiveSurfaceOptions, type UiSpecNode } from '../src/index.js';

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

const card = (): UiSpecNode => ({
  component: 'ki-card',
  id: 'card',
  slots: { '': [{ component: 'ki-input', id: 'note', props: { label: 'Note' } }] },
});

/** The card holding "note", which the person typed "Buy milk" into. */
const typed = (options: Partial<LiveSurfaceOptions> = {}) => {
  const live = createLiveSurface({ surface, ...options });
  expect(live.apply({ ops: [{ node: card(), op: 'insert' }] }).ok).toBe(true);
  const field = one('ki-input');
  field['value'] = 'Buy milk';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  return { field, live };
};

/** The same, after an earlier batch agreed with the person, without force. */
const agreed = (options: Partial<LiveSurfaceOptions> = {}) => {
  const mounted = typed(options);
  expect(
    mounted.live.apply({ ops: [{ id: 'note', op: 'set', props: { value: 'Buy milk' } }] }).ok,
  ).toBe(true);
  return mounted;
};

interface Row {
  readonly control: string;
  readonly node: UiSpecNode;
  /** The person's change, then the event the control emits. */
  readonly enter: (control: Control) => void;
  readonly prop: string;
  readonly entry: boolean | string;
  readonly other: boolean | string;
}

const rows: readonly Row[] = [
  {
    control: 'the field "note"',
    enter: (control) => {
      control['value'] = 'Buy milk';
      control.dispatchEvent(new Event('input', { bubbles: true }));
    },
    entry: 'Buy milk',
    node: { component: 'ki-input', id: 'note', props: { label: 'Note' } },
    other: 'Buy bread',
    prop: 'value',
  },
  {
    control: 'the checkbox "agree"',
    enter: (control) => {
      control['checked'] = true;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    },
    entry: true,
    node: { component: 'ki-checkbox', id: 'agree', props: { name: 'agree' } },
    other: false,
    prop: 'checked',
  },
  {
    control: 'the toggle button "bold"',
    enter: (control) => {
      control['selected'] = true;
      control.dispatchEvent(new CustomEvent('ki-change', { bubbles: true }));
    },
    entry: true,
    node: {
      component: 'ki-button',
      id: 'bold',
      props: { toggle: true },
      slots: { '': ['Bold'] },
    },
    other: false,
    prop: 'selected',
  },
];

describe('159 — agreeing with the person leaves their input theirs', () => {
  for (const row of rows) {
    it(`S1 after a set agreed with ${row.control}, setting other input is still rejected`, () => {
      const live = createLiveSurface({ surface });
      expect(live.apply({ ops: [{ node: row.node, op: 'insert' }] }).ok).toBe(true);
      const control = one(row.node.component);
      row.enter(control);
      const id = String(row.node.id);
      const set = (value: boolean | string) =>
        live.apply({ ops: [{ id, op: 'set', props: { [row.prop]: value } }] });
      expect(set(row.entry).ok).toBe(true);
      const html = surface.innerHTML;

      const result = set(row.other);

      expect(result).toMatchObject({
        diagnostics: [{ path: `ops[0].props.${row.prop}`, rule: 'user-state-conflict' }],
        ok: false,
        revision: 2,
      });
      expect(control[row.prop]).toBe(row.entry);
      expect(surface.innerHTML).toBe(html);
    });
  }

  const holders: Record<string, unknown> = {
    'removes "card"': { id: 'card', op: 'remove' },
    'replaces "note"': {
      id: 'note',
      node: { component: 'ki-input', id: 'note', props: { label: 'Note' } },
      op: 'replace',
    },
  };
  for (const [op, batchOp] of Object.entries(holders)) {
    it(`S2 after a set agreed with the person, a batch that ${op} is still rejected`, () => {
      const { field, live } = agreed();

      const result = live.apply({ ops: [batchOp] });

      expect(result).toMatchObject({
        diagnostics: [{ path: 'ops[0].id', rule: 'user-state-conflict' }],
        ok: false,
      });
      expect(one('ki-input')).toBe(field);
      expect(field['value']).toBe('Buy milk');
    });
  }

  it('S3 a forced override the host allows still replaces input a set agreed with', () => {
    const { field, live } = agreed({ allowUserStateOverride: true });

    const result = live.apply({
      ops: [{ force: true, id: 'note', op: 'set', props: { value: 'Buy bread' } }],
    });

    expect(result.ok).toBe(true);
    expect(field['value']).toBe('Buy bread');
    // The override hands the field back: an ordinary set may follow.
    expect(live.apply({ ops: [{ id: 'note', op: 'set', props: { value: 'Eggs' } }] }).ok).toBe(
      true,
    );
  });
});

describe('159 — a disclosure the person closed can still be reopened', () => {
  it('S4 after a set agreed that the person closed a dialog, a later set reopens it', () => {
    const live = createLiveSurface({ surface });
    expect(
      live.apply({
        ops: [
          {
            node: {
              component: 'ki-dialog',
              id: 'confirm-delete',
              props: { heading: 'Delete "Buy milk"?', open: true },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const dialog = one('ki-dialog');
    dialog['open'] = false;
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new CustomEvent('ki-close', { detail: { reason: 'escape' } }));
    expect(
      live.apply({ ops: [{ id: 'confirm-delete', op: 'set', props: { open: false } }] }).ok,
    ).toBe(true);

    const result = live.apply({
      ops: [{ id: 'confirm-delete', op: 'set', props: { open: true } }],
    });

    expect(result.ok).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
  });
});

describe("159 — a rejection never repeats the person's input", () => {
  const cases: Record<string, { op: unknown; rule: string }> = {
    'forces "note" to "Buy bread"': {
      op: { force: true, id: 'note', op: 'set', props: { value: 'Buy bread' } },
      rule: 'user-state-override-denied',
    },
    'removes "card"': { op: { id: 'card', op: 'remove' }, rule: 'user-state-conflict' },
    'replaces "card" with force': {
      op: { force: true, id: 'card', node: card(), op: 'replace' },
      rule: 'user-state-override-denied',
    },
    'sets "note" to "Buy bread"': {
      op: { id: 'note', op: 'set', props: { value: 'Buy bread' } },
      rule: 'user-state-conflict',
    },
  };
  for (const [name, { op, rule }] of Object.entries(cases)) {
    it(`S5 a batch that ${name} is rejected as ${rule} without repeating the typed text`, () => {
      const { field, live } = typed();

      const result = live.apply({ ops: [op] });

      expect(result.ok).toBe(false);
      expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual([rule]);
      expect(JSON.stringify(result.diagnostics)).not.toContain('Buy milk');
      expect(field['value']).toBe('Buy milk');
    });
  }
});
