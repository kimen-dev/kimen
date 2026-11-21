// @spec:155-live-surface-reset-focus
// What a live batch may say and what a rejection tells the agent: a batch's
// focus must name a node of the resulting surface, a dialog the person closed
// is reopened in two batches and the rejection says so, the host may raise
// every budget, and a rejected batch is a return value that leaves earlier
// batches applied. Focus landing itself needs a real engine: see
// browser-tests/live-focus.browser.spec.ts.
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createLiveSurface,
  type LiveBatch,
  type LiveBatchResult,
  type LiveSurfaceOptions,
  type UiSpecNode,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const task = (id: string, text: string): UiSpecNode => ({
  component: 'ki-list-item',
  id,
  slots: { '': [text] },
});

const tasks = (): UiSpecNode => ({
  component: 'ki-list',
  id: 'tasks',
  slots: { '': [task('t1', 'Buy milk'), task('t2', 'Call mum')] },
});

const mountTasks = () => {
  const live = createLiveSurface({ surface });
  expect(live.apply({ ops: [{ node: tasks(), op: 'insert' }] }).ok).toBe(true);
  return live;
};

const listed = (): string[] =>
  Array.from(surface.querySelectorAll('ki-list-item'), (item) => item.textContent);

describe('155 — a batch repairs lost focus and never takes it', () => {
  it.each(['t9', 't2'])(
    'S3 a batch whose focus names "%s", no node of the resulting surface, is rejected whole',
    (focus) => {
      const live = mountTasks();
      const html = surface.innerHTML;
      const result = live.apply({ focus, ops: [{ id: 't2', op: 'remove' }] });
      expect(result.ok).toBe(false);
      expect(result.revision).toBe(1);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]).toMatchObject({
        path: 'batch.focus',
        rule: 'unknown-id',
        value: focus,
      });
      expect(result.diagnostics[0]?.message).toContain(`"${focus}"`);
      expect(surface.innerHTML).toBe(html);
      expect(listed()).toEqual(['Buy milk', 'Call mum']);
    },
  );

  it('S3 a focus may name a node the same batch inserts', () => {
    const live = mountTasks();
    const result = live.apply({
      focus: 't3',
      ops: [{ node: task('t3', 'Water the plants'), op: 'insert', parent: 'tasks' }],
    });
    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
  });

  it('S3 an empty batch checks its focus against the current surface and keeps the revision', () => {
    const live = mountTasks();
    expect(live.apply({ focus: 't9', ops: [] }).diagnostics[0]).toMatchObject({
      path: 'batch.focus',
      rule: 'unknown-id',
    });
    expect(live.apply({ focus: 't1', ops: [] })).toEqual({
      diagnostics: [],
      ok: true,
      revision: 1,
    });
  });
});

describe('155 — a rejection says how to proceed', () => {
  const dialogOf = (): HTMLElement & { open?: boolean } => {
    const dialog = surface.querySelector<HTMLElement>('ki-dialog');
    if (dialog === null) {
      throw new Error('dialog missing');
    }
    return dialog;
  };

  /** The agent opens the dialog; the person closes it with Escape, as ki-dialog does. */
  const closedByPerson = () => {
    const live = createLiveSurface({ surface });
    expect(
      live.apply({
        ops: [
          {
            node: {
              component: 'ki-dialog',
              id: 'confirm-delete',
              props: { 'confirm-label': 'Yes, delete', heading: 'Delete "Buy milk"?', open: true },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const dialog = dialogOf();
    expect(dialog.hasAttribute('open')).toBe(true);
    dialog.open = false;
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new CustomEvent('ki-close', { detail: { reason: 'escape' } }));
    return { dialog, live };
  };

  it('S6 reopening a dialog the person closed is rejected with the way to reopen it', () => {
    const { dialog, live } = closedByPerson();
    const result = live.apply({
      ops: [{ id: 'confirm-delete', op: 'set', props: { open: true } }],
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      path: 'ops[0].props.open',
      rule: 'user-state-conflict',
    });
    // Spec 159 FR-004: the state is in the remedy, never in `value`.
    expect(result.diagnostics[0]).not.toHaveProperty('value');
    expect(result.diagnostics[0]?.message).toMatch(
      /closed "confirm-delete"; set open to false in a batch of its own first/u,
    );
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(dialog.open).toBe(false);
  });

  it('S6 the remedy the rejection names reopens the dialog without force', () => {
    const { dialog, live } = closedByPerson();
    expect(
      live.apply({ ops: [{ id: 'confirm-delete', op: 'set', props: { open: false } }] }).ok,
    ).toBe(true);
    expect(
      live.apply({ ops: [{ id: 'confirm-delete', op: 'set', props: { open: true } }] }).ok,
    ).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('S6 a conflict on a value still points to force, never to the two batches', () => {
    const live = createLiveSurface({ surface });
    live.apply({
      ops: [
        { node: { component: 'ki-input', id: 'title', props: { label: 'Title' } }, op: 'insert' },
      ],
    });
    const field = surface.querySelector<HTMLElement & { value?: string }>('ki-input');
    if (field === null) {
      throw new Error('field missing');
    }
    field.value = 'Buy milk';
    field.dispatchEvent(new Event('input'));
    const result = live.apply({ ops: [{ id: 'title', op: 'set', props: { value: '' } }] });
    expect(result.diagnostics[0]?.rule).toBe('user-state-conflict');
    expect(result.diagnostics[0]?.message).toMatch(/with force/u);
    expect(result.diagnostics[0]?.message).not.toMatch(/batch of its own/u);
  });
});

interface Overrun {
  readonly limit: string;
  readonly rule: string;
  readonly batch: () => unknown;
  /** Options a surface with the default value of this limit is created with. */
  readonly defaults: Partial<LiveSurfaceOptions>;
  /** The same options with only this limit raised. */
  readonly raised: Partial<LiveSurfaceOptions>;
}

const bytesOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

const badgeBatch = (text: string) => ({
  ops: [{ node: { component: 'ki-badge', slots: { '': [text] } }, op: 'insert' }],
});

/** One badge whose resulting state serializes to exactly `bytes`. */
const surfaceOf = (bytes: number) => {
  const probe = createLiveSurface({
    batchBudgets: { maxBytes: 1_000_000 },
    surface: document.createElement('div'),
  });
  probe.apply(badgeBatch(''));
  return badgeBatch('x'.repeat(bytes - bytesOf(probe.snapshot().nodes)));
};

const nested = (levels: number): UiSpecNode =>
  levels === 1
    ? { component: 'ki-card' }
    : { component: 'ki-card', slots: { '': [nested(levels - 1)] } };

const OVERRUNS: readonly Overrun[] = [
  {
    batch: () => ({
      ops: Array.from({ length: 65 }, (_, index) => ({
        node: { component: 'ki-badge', id: `b${String(index)}` },
        op: 'insert',
      })),
    }),
    defaults: {},
    limit: '64 ops per batch',
    raised: { batchBudgets: { maxOps: 65 } },
    rule: 'batch-op-budget',
  },
  {
    batch: () => {
      const base = bytesOf(badgeBatch(''));
      return badgeBatch('x'.repeat(65_537 - base));
    },
    defaults: {},
    limit: '65,536 bytes per batch',
    raised: { batchBudgets: { maxBytes: 65_537 } },
    rule: 'batch-size-budget',
  },
  {
    batch: () => ({
      ops: [
        {
          node: {
            component: 'ki-list',
            slots: { '': Array.from({ length: 512 }, () => ({ component: 'ki-list-item' })) },
          },
          op: 'insert',
        },
      ],
    }),
    defaults: {},
    limit: '512 nodes on the surface',
    raised: { budgets: { maxNodes: 513 } },
    rule: 'node-count-budget',
  },
  {
    batch: () => ({ ops: [{ node: nested(33), op: 'insert' }] }),
    defaults: {},
    limit: '32 levels of nesting',
    raised: { budgets: { maxDepth: 33 } },
    rule: 'depth-budget',
  },
  {
    batch: () => surfaceOf(262_145),
    // The batch itself is larger than the per-batch default, which is not the
    // limit under test here.
    defaults: { batchBudgets: { maxBytes: 300_000 } },
    limit: '262,144 bytes on the surface',
    raised: { batchBudgets: { maxBytes: 300_000 }, budgets: { maxBytes: 262_145 } },
    rule: 'size-budget',
  },
];

describe('155 — the host may raise every budget', () => {
  it.each(OVERRUNS)(
    'S7 a host may raise the $limit budget above its default',
    ({ batch, defaults, raised, rule }) => {
      const strict = createLiveSurface({ ...defaults, surface: document.createElement('div') });
      expect(strict.apply(batch()).diagnostics[0]?.rule).toBe(rule);

      const live = createLiveSurface({ ...raised, surface });
      expect(live.apply(batch())).toEqual({ diagnostics: [], ok: true, revision: 1 });
      expect(surface.childElementCount).toBeGreaterThan(0);
    },
  );
});

describe('155 — a rejected batch is a return value and changes nothing', () => {
  it('S8 a rejected batch is returned, not thrown, and leaves earlier batches applied', () => {
    const live = mountTasks();
    expect(live.apply({ ops: [{ id: 't2', op: 'remove' }] }).ok).toBe(true);
    expect(
      live.apply({ ops: [{ node: task('t2', 'Call mum'), op: 'insert', parent: 'tasks' }] }).ok,
    ).toBe(true);
    expect(live.apply({ ops: [{ id: 't1', op: 'text', text: 'Buy milk' }] }).ok).toBe(true);
    expect(live.revision).toBe(4);
    const html = surface.innerHTML;
    const snapshot = live.snapshot();

    let result: LiveBatchResult | undefined;
    expect(() => {
      result = live.apply({
        ops: [
          { id: 't1', op: 'remove' },
          { id: 't9', op: 'set', props: { label: 'Later' } },
        ],
      });
    }).not.toThrow();
    expect(result?.ok).toBe(false);
    expect(result?.revision).toBe(4);
    expect(result?.diagnostics).toHaveLength(1);
    expect(result?.diagnostics[0]).toMatchObject({
      path: 'ops[1].id',
      rule: 'unknown-id',
      value: 't9',
    });
    expect(surface.innerHTML).toBe(html);
    expect(listed()[0]).toBe('Buy milk');
    expect(live.revision).toBe(4);
    expect(live.snapshot()).toEqual(snapshot);
  });

  it('S8 a malformed batch is a return value too', () => {
    const live = mountTasks();
    expect(() => live.apply('{"ops": [')).not.toThrow();
    expect(live.apply({ ops: [{ id: 't1', op: 'move' }] }).diagnostics[0]?.rule).toBe(
      'malformed-batch',
    );
    expect(live.revision).toBe(1);
  });
});

describe('155 — the exported batch types', () => {
  it('describe a batch that apply accepts, also as a JSON string', () => {
    const batch = {
      focus: 't3',
      ifRevision: 1,
      ops: [
        { node: task('t3', 'Water the plants'), op: 'insert', parent: 'tasks' },
        { id: 't1', op: 'text', text: 'Buy oat milk' },
        { id: 't2', op: 'remove' },
      ],
    } satisfies LiveBatch;
    const live = mountTasks();
    expect(live.apply(JSON.stringify(batch))).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(listed()).toEqual(['Buy oat milk', 'Water the plants']);
  });

  it('accept no reset op until it lands with Task 4', () => {
    const live = mountTasks();
    expect(live.apply({ ops: [{ id: 't1', op: 'reset' }] }).diagnostics[0]?.rule).toBe(
      'malformed-batch',
    );
  });
});
