// @spec:157-mcp-apps-live-updates
// A tool result paints through the live surface (spec 035). It carries the
// full spec it describes and may also carry an update computed on a page
// revision: the bridge applies the update only on that revision, only when
// the result declares the surface's own actions and only when the live
// surface accepts the batch; otherwise it paints the full spec. Each action
// call names the page revision and the bound node's id. The real engine
// (focus, a real field) is pinned in browser-tests/live-updates.browser.spec.ts.
import { DEFAULT_RENDER_BUDGETS } from '@kimen/catalog';
import { beforeEach, describe, expect, it } from 'vitest';

import type { BridgeRefusal, SurfaceOutboundMessage } from '../src/index.js';
import {
  createSurfaceBridge,
  declareActionTool,
  KIMEN_ACTION_KEY,
  KIMEN_SURFACE_KEY,
  surfaceToolResult,
} from '../src/index.js';
import {
  addItemBatch,
  expectedActionCall,
  expectedMessageRequest,
  initializeResult,
  resultResponse,
  TEXT_MESSAGE_CAPABILITIES,
  tasksSpec,
  toolResult,
} from './spec-messages.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

/** A bridge whose handshake completed, recording what it sends and refuses. */
const connected = (into: Element = surface) => {
  const sent: SurfaceOutboundMessage[] = [];
  const refusals: BridgeRefusal[] = [];
  const bridge = createSurfaceBridge({
    onRefusal: (refusal) => refusals.push(refusal),
    send: (message) => sent.push(message),
    surface: into,
  });
  bridge.start();
  bridge.receive(initializeResult(1, undefined, {}, TEXT_MESSAGE_CAPABILITIES));
  return { bridge, refusals, sent };
};

type Harness = ReturnType<typeof connected>;

/**
 * Paints `tasksSpec([])` (page revision 1), then applies `revision - 1`
 * updates that each append one item, so the page ends at `revision`.
 */
const atRevision = (h: Harness, revision: number): string[] => {
  const items: string[] = [];
  h.bridge.receive(toolResult(tasksSpec(items)));
  for (let at = 1; at < revision; at += 1) {
    const text = `Item ${String(at)}`;
    const batch = addItemBatch(text, items.length);
    items.push(text);
    h.bridge.receive(toolResult(tasksSpec(items), 'Tasks', { baseRevision: at, batch }));
  }
  return items;
};

/** The person types into the field "title" without sending it. */
const typeTitle = (text: string): Element => {
  const field = titleField();
  Object.assign(field, { value: text });
  field.dispatchEvent(new Event('input', { bubbles: true }));
  return field;
};

const titleField = (): Element => {
  const field = surface.querySelector('ki-input');
  if (field === null) {
    throw new Error('the field "title" is not on the surface');
  }
  return field;
};

const typedValue = (element: Element): unknown => (element as unknown as { value?: unknown }).value;

/** What painting `spec` alone, on a fresh page, produces. */
const paintedAlone = (spec: unknown): string => {
  const mount = document.createElement('div');
  const h = connected(mount);
  h.bridge.receive(toolResult(spec));
  return mount.innerHTML;
};

/** The revision the next action call carries, read from the call itself. */
const revisionOfNextCall = (h: Harness): unknown => {
  h.bridge.dispatch('add');
  const call = h.sent.at(-1) as { params?: { arguments?: Record<string, unknown> } };
  return call.params?.arguments?.['revision'];
};

const itemTexts = (): (string | null)[] =>
  Array.from(surface.querySelectorAll('ki-list-item'), (item) => item.textContent);

describe('an update changes only what it names, or the full spec wins', () => {
  it('S1 applies an update computed on the current revision and keeps the unsent text', () => {
    const h = connected();
    const items = atRevision(h, 2);
    const field = typeTitle('Buy milk');
    const list = surface.querySelector('ki-list');

    const result = h.bridge.receive(
      toolResult(tasksSpec([...items, 'Call Ana']), 'Tasks', {
        baseRevision: 2,
        batch: addItemBatch('Call Ana', items.length),
      }),
    );

    expect(result.ok).toBe(true);
    expect(itemTexts()).toEqual(['Item 1', 'Call Ana']);
    // The elements the batch did not name are the same elements, holding what
    // the person typed.
    expect(titleField()).toBe(field);
    expect(surface.querySelector('ki-list')).toBe(list);
    expect(typedValue(titleField())).toBe('Buy milk');
    expect(h.refusals).toEqual([]);
    expect(revisionOfNextCall(h)).toBe(3);
  });

  it('S1 applies an update carried by the answer to the surface own action call', () => {
    const h = connected();
    const items = atRevision(h, 1);
    const field = typeTitle('Buy milk');
    h.bridge.dispatch('add');
    const callId = (h.sent.at(-1) as { id: number }).id;

    h.bridge.receive(
      resultResponse(callId, {
        ...surfaceToolResult(tasksSpec([...items, 'Call Ana']), 'Tasks', {
          baseRevision: 1,
          batch: addItemBatch('Call Ana', items.length),
        }),
      }),
    );

    expect(itemTexts()).toEqual(['Call Ana']);
    expect(titleField()).toBe(field);
    expect(typedValue(titleField())).toBe('Buy milk');
  });

  it('S1 surfaceToolResult carries the update next to the full spec', () => {
    const spec = tasksSpec(['Call Ana']);
    const update = { baseRevision: 2, batch: addItemBatch('Call Ana', 0) };

    expect(surfaceToolResult(spec, 'One task', update)).toEqual({
      content: [{ text: 'One task', type: 'text' }],
      structuredContent: { [KIMEN_SURFACE_KEY]: { spec, update } },
    });
    // Without an update the result is exactly today's.
    expect(surfaceToolResult(spec, 'One task')).toEqual({
      content: [{ text: 'One task', type: 'text' }],
      structuredContent: { [KIMEN_SURFACE_KEY]: { spec } },
    });
  });

  it('S2 paints the full spec when the update was computed on another revision', () => {
    const h = connected();
    const items = atRevision(h, 3);
    const field = typeTitle('Buy milk');
    const full = tasksSpec([...items, 'Call Ana']);

    const result = h.bridge.receive(
      toolResult(full, 'Tasks', { baseRevision: 2, batch: addItemBatch('Call Ana', 1) }),
    );

    expect(result.ok).toBe(true);
    expect(surface.innerHTML).toBe(paintedAlone(full));
    expect(titleField()).not.toBe(field);
    expect(typedValue(titleField())).toBeUndefined();
    expect(h.refusals).toEqual([
      expect.objectContaining({ reason: 'update-not-applied', value: 'stale-revision' }),
    ]);
  });

  it('S2 paints the full spec when an update arrives before any surface', () => {
    const h = connected();
    const full = tasksSpec(['Call Ana']);

    h.bridge.receive(
      toolResult(full, 'Tasks', { baseRevision: 0, batch: addItemBatch('Call Ana', 0) }),
    );

    expect(surface.innerHTML).toBe(paintedAlone(full));
    expect(h.refusals).toEqual([
      expect.objectContaining({ reason: 'update-not-applied', value: 'stale-revision' }),
    ]);
    expect(revisionOfNextCall(h)).toBe(1);
  });

  it.each([
    {
      defect: 'removes the node "gone", which is not on the surface',
      full: tasksSpec(['Item 1']),
      batch: { ops: [{ id: 'gone', op: 'remove' }] },
      rule: 'unknown-id',
    },
    {
      defect: 'inserts an "iframe" component targeting https://evil.example',
      full: tasksSpec(['Item 1']),
      batch: {
        ops: [
          {
            node: { component: 'iframe', props: { src: 'https://evil.example' } },
            op: 'insert',
            parent: 'page',
          },
        ],
      },
      rule: 'unknown-component',
    },
    {
      defect: 'comes with a full spec that also declares the action "archive"',
      full: tasksSpec(['Item 1', 'Call Ana'], ['add', 'archive']),
      batch: addItemBatch('Call Ana', 1),
      rule: 'declared-actions',
    },
  ])('S3 paints the full spec when the update $defect', ({ batch, full, rule }) => {
    const h = connected();
    atRevision(h, 2);
    typeTitle('Buy milk');

    const result = h.bridge.receive(toolResult(full, 'Tasks', { baseRevision: 2, batch }));

    expect(result.ok).toBe(true);
    expect(surface.innerHTML).toBe(paintedAlone(full));
    expect(surface.querySelector('iframe')).toBeNull();
    expect(h.refusals).toEqual([
      expect.objectContaining({ reason: 'update-not-applied', value: rule }),
    ]);
  });

  it.each([
    { name: 'not an object', update: 'ops' },
    { name: 'without a base revision', update: { batch: addItemBatch('Call Ana', 1) } },
    { name: 'with a fractional base revision', update: { baseRevision: 1.5, batch: {} } },
    { name: 'with a negative base revision', update: { baseRevision: -1, batch: {} } },
    { name: 'without a batch', update: { baseRevision: 2 } },
  ])('S3 paints the full spec when the update is malformed: $name', ({ update }) => {
    const h = connected();
    atRevision(h, 2);
    const full = tasksSpec(['Item 1', 'Call Ana']);

    h.bridge.receive(toolResult(full, 'Tasks', update));

    expect(surface.innerHTML).toBe(paintedAlone(full));
    expect(h.refusals).toEqual([
      expect.objectContaining({ reason: 'update-not-applied', value: 'malformed-update' }),
    ]);
  });

  it('S3 refuses the whole result when its full spec is invalid, even if its update would apply', () => {
    const h = connected();
    const items = atRevision(h, 2);
    const before = surface.innerHTML;
    const field = typeTitle('Buy milk');
    const invalid = {
      ...tasksSpec([...items, 'Call Ana']),
      root: { component: 'iframe', props: { src: 'https://evil.example' } },
    };

    const result = h.bridge.receive(
      toolResult(invalid, 'Tasks', {
        baseRevision: 2,
        batch: addItemBatch('Call Ana', items.length),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.refusals.map((refusal) => refusal.reason)).toContain('unknown-component');
    expect(surface.innerHTML).toBe(before);
    expect(titleField()).toBe(field);
    expect(revisionOfNextCall(h)).toBe(2);
  });

  it('S3 keeps the outbound allowlist equal to the actions of the last full spec', () => {
    const h = connected();
    atRevision(h, 2);

    h.bridge.receive(
      toolResult(tasksSpec(['Item 1', 'Call Ana'], ['add', 'archive']), 'Tasks', {
        baseRevision: 2,
        batch: addItemBatch('Call Ana', 1),
      }),
    );

    expect(h.bridge.dispatch('archive').sent).toBe(true);
  });

  it('S4 repaints from the full spec when a result carries no update', () => {
    const h = connected();
    atRevision(h, 2);
    const field = typeTitle('Buy milk');
    const full = tasksSpec(['Item 1', 'Call Ana']);

    const result = h.bridge.receive(toolResult(full));

    expect(result.ok).toBe(true);
    expect(surface.innerHTML).toBe(paintedAlone(full));
    expect(titleField()).not.toBe(field);
    expect(titleField().getAttribute('value')).toBe('');
    expect(typedValue(titleField())).toBeUndefined();
    expect(h.refusals).toEqual([]);
  });

  it('S4 paints a full spec at the default byte budget, as the guarded renderer accepts it', () => {
    const h = connected();
    const spec = (text: string) => ({
      actions: [],
      root: { component: 'ki-badge', slots: { '': [text] } },
      version: 1,
    });
    const envelope = new TextEncoder().encode(JSON.stringify(spec(''))).length;
    const atBudget = spec('x'.repeat(DEFAULT_RENDER_BUDGETS.maxBytes - envelope));

    expect(h.bridge.receive(toolResult(atBudget)).ok).toBe(true);
    expect(surface.querySelector('ki-badge')?.textContent).toHaveLength(
      DEFAULT_RENDER_BUDGETS.maxBytes - envelope,
    );
    // One byte more is refused by the guarded renderer, as today.
    const over = spec('x'.repeat(DEFAULT_RENDER_BUDGETS.maxBytes - envelope + 1));
    expect(h.bridge.receive(toolResult(over)).refusals.map((r) => r.reason)).toEqual([
      'size-budget',
    ]);
  });
});

describe('an action call tells the server where the person acted', () => {
  it('S5 sends the bound node id and the revision with an activated control', () => {
    const h = connected();
    atRevision(h, 3);

    surface.querySelector('ki-button')?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(h.sent.at(-1)).toEqual(expectedActionCall(2, 'add', {}, { node: 'add', revision: 3 }));
  });

  it('S5 sends no id for a control the spec gave no id', () => {
    const h = connected();
    h.bridge.receive(
      toolResult({
        actions: ['confirm'],
        root: { action: 'confirm', component: 'ki-button', slots: { '': ['Confirm'] } },
        version: 1,
      }),
    );

    surface.querySelector('ki-button')?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(h.sent.at(-1)).toEqual(expectedActionCall(2, 'confirm', {}, { revision: 1 }));
  });

  it('S5 relays only the action and its data, never the id or the revision', () => {
    const h = connected();
    atRevision(h, 3);
    surface.querySelector('ki-button')?.dispatchEvent(new Event('click', { bubbles: true }));

    h.bridge.receive(
      resultResponse(2, {
        structuredContent: { [KIMEN_ACTION_KEY]: { action: 'add', relay: true } },
      }),
    );

    expect(h.sent.at(-1)).toEqual(
      expectedMessageRequest(3, 'kimen-surface-action {"action":"add","data":{}}'),
    );
  });

  it('S6 declares the id and the revision as optional arguments of the action tool', () => {
    const { inputSchema } = declareActionTool();

    expect(inputSchema.required).toEqual(['action']);
    expect(inputSchema.additionalProperties).toBe(false);
    expect(inputSchema.properties.id).toEqual({
      pattern: '^[a-z0-9][a-z0-9_-]{0,63}$',
      type: 'string',
    });
    expect(inputSchema.properties.revision).toEqual({ minimum: 0, type: 'integer' });
  });
});

describe('a revision names one state of the page and is never reused', () => {
  it('S7 carries a higher revision after a full repaint than any reported before', () => {
    const h = connected();
    atRevision(h, 3);
    expect(revisionOfNextCall(h)).toBe(3);

    h.bridge.receive(toolResult(tasksSpec(['Item 1', 'Item 2'])));

    expect(revisionOfNextCall(h)).toBe(4);
  });

  it('S7 does not let an update computed before a full repaint apply after it', () => {
    const h = connected();
    const items = atRevision(h, 1);
    // A full repaint moves the page to revision 2; an update computed on
    // revision 1 described the content before it.
    h.bridge.receive(toolResult(tasksSpec(['Other'])));
    const full = tasksSpec([...items, 'Call Ana']);

    h.bridge.receive(
      toolResult(full, 'Tasks', { baseRevision: 1, batch: addItemBatch('Call Ana', 0) }),
    );

    expect(surface.innerHTML).toBe(paintedAlone(full));
    expect(h.refusals.at(-1)).toMatchObject({
      reason: 'update-not-applied',
      value: 'stale-revision',
    });
  });

  it('S7 leaves the revision where it was after a refused result', () => {
    const h = connected();
    atRevision(h, 2);

    h.bridge.receive(toolResult({ actions: [], root: { component: 'iframe' }, version: 1 }));

    expect(revisionOfNextCall(h)).toBe(2);
  });
});
