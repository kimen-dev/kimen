/**
 * The live surface (spec 035): a long-lived surface an agent keeps changing
 * through atomic batches of operations addressed by stable node ids.
 *
 * Every batch crosses the guarded renderer's boundary (spec 028) against the
 * state it would PRODUCE: the purity wall over the whole batch, the batch
 * shape and per-batch budgets, then every op applied to a copy of the state
 * (each new node validated as a spec root), then the resulting state
 * validated as a whole (catalog membership, props, actions, slots, unique
 * ids, tag grammar, prop-name guards, URL allowlist, state budgets). Only a
 * batch that passes every layer touches the DOM, and it touches only what it
 * names: existing elements keep their identity, focus, typed values and
 * scroll. A rejected batch changes nothing and the surface stays live.
 *
 * `renderUiSpec` and `createStreamingRenderer` keep their semantics (D1).
 * Nothing here names a protocol or a domain (Art. VIII).
 */
import { z } from 'zod';

import { catalogData } from './generated/catalog.js';
import {
  ABSOLUTE_MAX_BYTES,
  type ActionEvent,
  attachText,
  DEFAULT_RENDER_BUDGETS,
  declaredEvents,
  type GuardState,
  guardNode,
  matchesConstraint,
  payloadBytes,
  pinButtonType,
  type RenderBudgets,
  type RenderDiagnostic,
  type RenderResult,
  toDiagnostic,
  versionDiagnostic,
  wireActivation,
  writeProp,
} from './render.js';
import type { Catalog, CatalogEntry, UiSpecNode, ValidationIssue } from './validate.js';
import { toPlainData, validatePlainData } from './validate.js';

type Scalar = boolean | number | string;

/** The action event of a live surface (035 FR-008, D7). */
export interface LiveActionEvent extends ActionEvent {
  /** The bound node's stable id, when it has one. */
  readonly id?: string | undefined;
  /** The surface revision at the moment of the gesture. */
  readonly revision: number;
}

/**
 * Per-batch budgets (035 FR-003/FR-004): the number of ops and the
 * serialized size of one batch. The host paces batches; these bound the
 * work a single batch can demand.
 */
export interface LiveBatchBudgets {
  readonly maxOps: number;
  readonly maxBytes: number;
}

export const DEFAULT_LIVE_BATCH_BUDGETS: LiveBatchBudgets = {
  maxBytes: 65_536,
  maxOps: 64,
};

export interface LiveSurfaceOptions {
  /** The host-owned mount point; the surface only touches what it inserted. */
  readonly surface: Element;
  /** The catalog in use, fixed for the surface's life (032 S16); default built-in. */
  readonly catalog?: Catalog;
  /** The declared actions, fixed for the surface's life. */
  readonly actions?: readonly string[];
  /** Budgets of the RESULTING state (depth, node count, payload bytes). */
  readonly budgets?: Partial<RenderBudgets>;
  /** Budgets of one batch (ops, bytes). */
  readonly batchBudgets?: Partial<LiveBatchBudgets>;
  /** The catalog schema version the agent authors against (SemVer-compatible gate). */
  readonly catalogSchemaVersion?: string;
  /** The single action channel. */
  readonly onAction?: (event: LiveActionEvent) => void;
  /**
   * Whether an op marked `force: true` may overwrite state the user changed
   * (D5). Default false: such an op is rejected.
   */
  readonly allowUserStateOverride?: boolean;
}

export interface LiveBatchResult extends RenderResult {
  /** The surface revision after the call (unchanged when rejected). */
  readonly revision: number;
}

/** Frozen plain data of the current content (035 FR-007). */
export interface LiveSnapshot {
  readonly revision: number;
  readonly actions: readonly string[];
  /** The top-level nodes; each validates as the root of a spec declaring `actions`. */
  readonly nodes: readonly UiSpecNode[];
}

export interface LiveSurface {
  /** Validates and applies one untrusted batch atomically. */
  apply(batch: unknown): LiveBatchResult;
  /** The current content as deep-frozen plain data. */
  snapshot(): LiveSnapshot;
  /** The monotonic count of applied batches. */
  readonly revision: number;
}

/**
 * The props that are a control's own value channel: once the user changed
 * one (D5), an agent `set` may not overwrite it implicitly.
 */
const USER_STATE_PROPS: ReadonlySet<string> = new Set(['checked', 'open', 'value']);

// The interaction events that mark an element's user state as changed, on
// top of the events its catalog entry declares.
const USER_EVENTS = ['input', 'change'] as const;

interface MText {
  readonly kind: 'text';
  text: string;
  dom?: Node;
}

interface MNode {
  readonly kind: 'node';
  readonly id: string | undefined;
  readonly component: string;
  props: Record<string, Scalar>;
  readonly action: string | undefined;
  readonly slots: Map<string, MEntry[]>;
  parent: MNode | null;
  slot: string;
  /** Shadow copies point at the live node they copy (user-state checks). */
  readonly origin?: MNode | undefined;
  dom?: Element;
  /** The user interacted with this element's own value channel. */
  touched: boolean;
}

type MEntry = MNode | MText;

interface MState {
  readonly roots: MNode[];
  readonly ids: Map<string, MNode>;
}

const idRef = z.string();
const opSchema = z.discriminatedUnion('op', [
  z.strictObject({
    op: z.literal('insert'),
    parent: idRef.optional(),
    slot: z.string().optional(),
    before: idRef.optional(),
    node: z.unknown(),
  }),
  z.strictObject({
    op: z.literal('set'),
    id: idRef,
    props: z.record(z.string(), z.union([z.boolean(), z.number(), z.string(), z.null()])),
    force: z.boolean().optional(),
  }),
  z.strictObject({
    op: z.literal('text'),
    id: idRef,
    slot: z.string().optional(),
    text: z.string(),
  }),
  z.strictObject({ op: z.literal('remove'), id: idRef }),
  z.strictObject({ op: z.literal('replace'), id: idRef, node: z.unknown() }),
]);
const batchSchema = z.strictObject({
  ifRevision: z.number().int().nonnegative().optional(),
  ops: z.array(opSchema),
});

type LiveOp = z.infer<typeof opSchema>;

const BATCH_LABELS = { root: 'batch', surface: 'a live batch' };

function fail(path: string, rule: string, message: string, value?: string): RenderDiagnostic {
  return value === undefined ? { message, path, rule } : { message, path, rule, value };
}

/** Re-roots a spec-relative issue path (`root…`/`spec.root…`) under `prefix`. */
function rebase(issue: ValidationIssue, prefix: string): RenderDiagnostic {
  const diagnostic = toDiagnostic(issue);
  return { ...diagnostic, path: diagnostic.path.replace(/^(?:spec\.)?root/u, prefix) };
}

function rebaseGuard(diagnostic: RenderDiagnostic, prefix: string): RenderDiagnostic {
  return { ...diagnostic, path: diagnostic.path.replace(/^root/u, prefix) };
}

function fromPlain(node: UiSpecNode, parent: MNode | null, slot: string): MNode {
  const model: MNode = {
    action: node.action,
    component: node.component,
    id: node.id,
    kind: 'node',
    parent,
    props: { ...node.props },
    slot,
    slots: new Map(),
    touched: false,
  };
  for (const [slotName, children] of Object.entries(node.slots ?? {})) {
    model.slots.set(
      slotName,
      children.map((child) =>
        typeof child === 'string'
          ? { kind: 'text', text: child }
          : fromPlain(child, model, slotName),
      ),
    );
  }
  return model;
}

function cloneNode(node: MNode, parent: MNode | null, ids: Map<string, MNode>): MNode {
  const copy: MNode = {
    action: node.action,
    component: node.component,
    id: node.id,
    kind: 'node',
    origin: node,
    parent,
    props: { ...node.props },
    slot: node.slot,
    slots: new Map(),
    touched: false,
  };
  if (copy.id !== undefined) {
    ids.set(copy.id, copy);
  }
  for (const [slotName, entries] of node.slots) {
    copy.slots.set(
      slotName,
      entries.map((entry) =>
        entry.kind === 'text' ? { kind: 'text', text: entry.text } : cloneNode(entry, copy, ids),
      ),
    );
  }
  return copy;
}

function cloneState(state: MState): MState {
  const ids = new Map<string, MNode>();
  return { ids, roots: state.roots.map((root) => cloneNode(root, null, ids)) };
}

function toPlain(node: MNode): UiSpecNode {
  const slots: Record<string, (UiSpecNode | string)[]> = {};
  for (const [slotName, entries] of node.slots) {
    if (entries.length > 0) {
      slots[slotName] = entries.map((entry) =>
        entry.kind === 'text' ? entry.text : toPlain(entry),
      );
    }
  }
  return {
    ...(node.id === undefined ? {} : { id: node.id }),
    component: node.component,
    ...(Object.keys(node.props).length > 0 ? { props: { ...node.props } } : {}),
    ...(node.action === undefined ? {} : { action: node.action }),
    ...(Object.keys(slots).length > 0 ? { slots } : {}),
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function* subtree(node: MNode): Generator<MNode> {
  yield node;
  for (const entries of node.slots.values()) {
    for (const entry of entries) {
      if (entry.kind === 'node') {
        yield* subtree(entry);
      }
    }
  }
}

function siblings(state: MState, node: MNode): MEntry[] {
  return node.parent === null ? state.roots : (node.parent.slots.get(node.slot) ?? []);
}

/** The DOM node the entry at `from` in (parent, slot) must be inserted before. */
function domAfter(state: MState, parent: MNode | null, slot: string, from: number): Node | null {
  if (parent === null) {
    return state.roots[from]?.dom ?? null;
  }
  const own = parent.slots.get(slot) ?? [];
  for (let index = from; index < own.length; index += 1) {
    const dom = own[index]?.dom;
    if (dom !== undefined) {
      return dom;
    }
  }
  let later = false;
  for (const [name, entries] of parent.slots) {
    if (name === slot) {
      later = true;
    } else if (later) {
      for (const entry of entries) {
        if (entry.dom !== undefined) {
          return entry.dom;
        }
      }
    }
  }
  return null;
}

/** Where a batch's ops write: nowhere (validation copy) or the live DOM. */
interface ApplyContext {
  readonly materialize: (opIndex: number) => MNode;
  readonly dom: { readonly surface: Element; readonly doc: Document } | null;
  readonly components: Readonly<Record<string, CatalogEntry>>;
  readonly allowUserStateOverride: boolean;
}

function registerIds(state: MState, node: MNode, path: string): RenderDiagnostic | null {
  for (const member of subtree(node)) {
    if (member.id !== undefined) {
      if (state.ids.has(member.id)) {
        return fail(
          path,
          'duplicate-id',
          `node id "${member.id}" is already live on the surface`,
          member.id,
        );
      }
      state.ids.set(member.id, member);
    }
  }
  return null;
}

function unregisterIds(state: MState, node: MNode): void {
  for (const member of subtree(node)) {
    if (member.id !== undefined) {
      state.ids.delete(member.id);
    }
  }
}

function lookup(state: MState, id: string, path: string): MNode | RenderDiagnostic {
  return state.ids.get(id) ?? fail(path, 'unknown-id', `no live node has the id "${id}"`, id);
}

function placeDom(ctx: ApplyContext, state: MState, node: MNode, index: number): void {
  if (ctx.dom === null || node.dom === undefined) {
    return;
  }
  if (node.slot !== '') {
    node.dom.setAttribute('slot', node.slot);
  } else {
    node.dom.removeAttribute('slot');
  }
  const container = node.parent === null ? ctx.dom.surface : node.parent.dom;
  container?.insertBefore(node.dom, domAfter(state, node.parent, node.slot, index + 1));
}

function applyInsert(
  state: MState,
  op: Extract<LiveOp, { op: 'insert' }>,
  at: string,
  index: number,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  let parent: MNode | null = null;
  if (op.parent !== undefined) {
    const found = lookup(state, op.parent, `${at}.parent`);
    if (!('kind' in found)) {
      return found;
    }
    parent = found;
  } else if (op.slot !== undefined) {
    return fail(`${at}.slot`, 'invalid-position', 'a top-level insert takes no slot', op.slot);
  }
  const slot = op.slot ?? '';
  const list: MEntry[] = parent === null ? state.roots : (parent.slots.get(slot) ?? []);
  let position = list.length;
  if (op.before !== undefined) {
    const before = lookup(state, op.before, `${at}.before`);
    if (!('kind' in before)) {
      return before;
    }
    if (before.parent !== parent || before.slot !== slot) {
      return fail(
        `${at}.before`,
        'invalid-position',
        `node "${op.before}" is not in the target parent and slot`,
        op.before,
      );
    }
    position = list.indexOf(before);
  }
  const node = ctx.materialize(index);
  const duplicate = registerIds(state, node, `${at}.node`);
  if (duplicate !== null) {
    return duplicate;
  }
  node.parent = parent;
  node.slot = slot;
  if (parent !== null && !parent.slots.has(slot)) {
    parent.slots.set(slot, list);
  }
  list.splice(position, 0, node);
  placeDom(ctx, state, node, position);
  return null;
}

/**
 * The user-state check of one `set` (D5, FR-006): on an element the user
 * interacted with, a user-state prop whose live value differs from what the
 * agent last wrote is the user's. Changing it away from the live value needs
 * `force` AND the host's permission.
 */
function userStateConflict(
  node: MNode,
  name: string,
  next: Scalar | null,
  force: boolean,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const origin = node.origin;
  const constraint = ctx.components[node.component]?.props[name];
  if (
    !USER_STATE_PROPS.has(name) ||
    origin?.dom === undefined ||
    !origin.touched ||
    constraint === undefined
  ) {
    return null;
  }
  // Reads the rendered component's own property (its code, never spec data).
  const live: unknown = Reflect.get(origin.dom, name);
  if (!matchesConstraint(live, constraint)) {
    return null;
  }
  const written = origin.props[name] ?? constraint.default;
  const wanted = next ?? constraint.default;
  if (live === written || live === wanted) {
    return null;
  }
  if (!force) {
    return fail(
      `${at}.props.${name}`,
      'user-state-conflict',
      `the user changed "${name}" of node "${String(node.id)}"; set it with force to override`,
      String(live),
    );
  }
  if (!ctx.allowUserStateOverride) {
    return fail(
      `${at}.props.${name}`,
      'user-state-override-denied',
      `the host does not allow overriding the user's "${name}"`,
      String(live),
    );
  }
  return null;
}

function applySet(
  state: MState,
  op: Extract<LiveOp, { op: 'set' }>,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const node = lookup(state, op.id, `${at}.id`);
  if (!('kind' in node)) {
    return node;
  }
  const force = op.force === true;
  for (const [name, value] of Object.entries(op.props)) {
    const conflict = userStateConflict(node, name, value, force, at, ctx);
    if (conflict !== null) {
      return conflict;
    }
  }
  const entry = ctx.components[node.component];
  for (const [name, value] of Object.entries(op.props)) {
    const previous = node.props[name];
    if (value === null) {
      node.props = Object.fromEntries(Object.entries(node.props).filter(([key]) => key !== name));
    } else {
      node.props[name] = value;
    }
    const element = ctx.dom === null ? undefined : node.dom;
    if (element === undefined) {
      continue;
    }
    const overriding = force && ctx.allowUserStateOverride && USER_STATE_PROPS.has(name);
    if (previous !== node.props[name]) {
      writeProp(element, name, node.props[name]);
    }
    if (overriding) {
      const live = node.props[name] ?? entry?.props[name]?.default;
      if (live !== undefined) {
        // The component's own setter, with a validated scalar of the declared type.
        Reflect.set(element, name, live);
      }
      node.touched = false;
    }
  }
  // Unsetting `type` on a click-bound node re-pins the declarative
  // no-submit default, exactly as a fresh build would.
  if (
    ctx.dom !== null &&
    node.dom !== undefined &&
    node.action !== undefined &&
    'type' in op.props &&
    declaredEvents(entry).length === 0
  ) {
    pinButtonType(node.dom, entry, node.props);
  }
  return null;
}

function applyText(
  state: MState,
  op: Extract<LiveOp, { op: 'text' }>,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const node = lookup(state, op.id, `${at}.id`);
  if (!('kind' in node)) {
    return node;
  }
  const slot = op.slot ?? '';
  const list = node.slots.get(slot) ?? [];
  if (list.some((entry) => entry.kind === 'node')) {
    return fail(
      `${at}.slot`,
      'slot-has-nodes',
      `slot "${slot}" of node "${op.id}" holds nodes; remove them explicitly`,
      slot,
    );
  }
  const only = list.length === 1 ? list[0] : undefined;
  if (only?.kind === 'text' && op.text !== '') {
    only.text = op.text;
    if (ctx.dom !== null && only.dom !== undefined) {
      // Updates the existing text node in place: inert data, never markup.
      const textNode = only.dom.nodeType === 3 ? only.dom : only.dom.firstChild;
      if (textNode !== null) {
        textNode.textContent = op.text;
      }
    }
    return null;
  }
  for (const entry of list) {
    if (ctx.dom !== null) {
      entry.dom?.parentNode?.removeChild(entry.dom);
    }
  }
  const next: MText[] = op.text === '' ? [] : [{ kind: 'text', text: op.text }];
  node.slots.set(slot, next);
  const first = next[0];
  if (ctx.dom !== null && first !== undefined && node.dom !== undefined) {
    first.dom = attachText(node.dom, first.text, slot, ctx.dom.doc, domAfter(state, node, slot, 1));
  }
  return null;
}

function applyRemove(
  state: MState,
  op: Extract<LiveOp, { op: 'remove' }>,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const node = lookup(state, op.id, `${at}.id`);
  if (!('kind' in node)) {
    return node;
  }
  const list = siblings(state, node);
  list.splice(list.indexOf(node), 1);
  unregisterIds(state, node);
  if (ctx.dom !== null) {
    node.dom?.parentNode?.removeChild(node.dom);
  }
  return null;
}

function applyReplace(
  state: MState,
  op: Extract<LiveOp, { op: 'replace' }>,
  at: string,
  index: number,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const old = lookup(state, op.id, `${at}.id`);
  if (!('kind' in old)) {
    return old;
  }
  const list = siblings(state, old);
  const position = list.indexOf(old);
  unregisterIds(state, old);
  const node = ctx.materialize(index);
  const duplicate = registerIds(state, node, `${at}.node`);
  if (duplicate !== null) {
    return duplicate;
  }
  node.parent = old.parent;
  node.slot = old.slot;
  list[position] = node;
  if (ctx.dom !== null && node.dom !== undefined && old.dom !== undefined) {
    if (node.slot !== '') {
      node.dom.setAttribute('slot', node.slot);
    }
    old.dom.parentNode?.replaceChild(node.dom, old.dom);
  }
  return null;
}

function applyOps(
  state: MState,
  ops: readonly LiveOp[],
  ctx: ApplyContext,
): RenderDiagnostic | null {
  for (const [index, op] of ops.entries()) {
    const at = `ops[${String(index)}]`;
    let failure: RenderDiagnostic | null;
    switch (op.op) {
      case 'insert':
        failure = applyInsert(state, op, at, index, ctx);
        break;
      case 'set':
        failure = applySet(state, op, at, ctx);
        break;
      case 'text':
        failure = applyText(state, op, at, ctx);
        break;
      case 'remove':
        failure = applyRemove(state, op, at, ctx);
        break;
      case 'replace':
        failure = applyReplace(state, op, at, index, ctx);
        break;
    }
    if (failure !== null) {
      return failure;
    }
  }
  return null;
}

/**
 * Creates a live surface (spec 035). The catalog, the declared actions and
 * the catalog-schema-version gate are fixed at creation; an unsupported
 * version leaves a surface that rejects every batch.
 */
export function createLiveSurface(options: LiveSurfaceOptions): LiveSurface {
  const catalog: Catalog = options.catalog ?? catalogData;
  const components = catalog.components;
  const budgets: RenderBudgets = { ...DEFAULT_RENDER_BUDGETS, ...options.budgets };
  const batchBudgets: LiveBatchBudgets = {
    ...DEFAULT_LIVE_BATCH_BUDGETS,
    ...options.batchBudgets,
  };
  const actions: readonly string[] = Object.freeze([...(options.actions ?? [])]);
  const surface = options.surface;
  const doc = surface.ownerDocument;
  const onAction = options.onAction;
  const allowUserStateOverride = options.allowUserStateOverride === true;
  const skew = versionDiagnostic(options.catalogSchemaVersion, catalog.catalogSchemaVersion);
  const live: MState = { ids: new Map(), roots: [] };
  let revision = 0;
  let cached: LiveSnapshot | null = null;

  const result = (diagnostics: readonly RenderDiagnostic[]): LiveBatchResult => ({
    diagnostics,
    ok: diagnostics.length === 0,
    revision,
  });

  /** The node's CURRENT path, or null once it left the surface. */
  const pathOf = (node: MNode): string | null => {
    const segments: string[] = [];
    let current = node;
    while (current.parent !== null) {
      const index = (current.parent.slots.get(current.slot) ?? []).indexOf(current);
      if (index < 0) {
        return null;
      }
      segments.unshift(`.slots.${current.slot}[${String(index)}]`);
      current = current.parent;
    }
    const top = live.roots.indexOf(current);
    return top < 0 ? null : `surface[${String(top)}]${segments.join('')}`;
  };

  const trackUserState = (element: Element, entry: CatalogEntry | undefined, model: MNode) => {
    if (entry === undefined || ![...USER_STATE_PROPS].some((name) => name in entry.props)) {
      return;
    }
    for (const type of new Set<string>([...USER_EVENTS, ...declaredEvents(entry)])) {
      element.addEventListener(type, (event: Event) => {
        if (event.target === element) {
          model.touched = true;
        }
      });
    }
  };

  /** Builds a validated node into a detached element subtree (FR-005). */
  const build = (node: UiSpecNode, parent: MNode | null, slot: string): MNode => {
    const element = doc.createElement(node.component);
    const model: MNode = {
      action: node.action,
      component: node.component,
      dom: element,
      id: node.id,
      kind: 'node',
      parent,
      props: { ...node.props },
      slot,
      slots: new Map(),
      touched: false,
    };
    for (const [name, value] of Object.entries(model.props)) {
      writeProp(element, name, value);
    }
    const entry = components[node.component];
    if (node.action !== undefined && onAction !== undefined) {
      const action = node.action;
      wireActivation(
        element,
        entry,
        () => model.props,
        (data) => {
          const path = pathOf(model);
          if (path === null) {
            return;
          }
          onAction({
            action,
            data,
            ...(model.id === undefined ? {} : { id: model.id }),
            path,
            revision,
          });
        },
      );
    }
    trackUserState(element, entry, model);
    for (const [slotName, children] of Object.entries(node.slots ?? {})) {
      const list: MEntry[] = [];
      model.slots.set(slotName, list);
      for (const child of children) {
        if (typeof child === 'string') {
          list.push({ dom: attachText(element, child, slotName, doc), kind: 'text', text: child });
        } else {
          const built = build(child, model, slotName);
          if (slotName !== '' && built.dom !== undefined) {
            built.dom.setAttribute('slot', slotName);
          }
          if (built.dom !== undefined) {
            element.appendChild(built.dom);
          }
          list.push(built);
        }
      }
    }
    return model;
  };

  /** Validates one op's node as a spec root (catalog, ids, guards). */
  const validateNode = (
    raw: unknown,
    at: string,
  ): { node?: UiSpecNode; diagnostics: RenderDiagnostic[] } => {
    const report = validatePlainData({ actions, root: raw, version: 1 }, catalog);
    if (!report.ok || report.spec === undefined) {
      return { diagnostics: report.issues.map((issue) => rebase(issue, `${at}.node`)) };
    }
    const state: GuardState = { budgets, components, diagnostics: [], nodes: 0 };
    guardNode(report.spec.root, 'root', 1, state);
    if (state.diagnostics.length > 0) {
      return {
        diagnostics: state.diagnostics.map((diagnostic) => rebaseGuard(diagnostic, `${at}.node`)),
      };
    }
    return { diagnostics: [], node: report.spec.root };
  };

  /** Validates the resulting state as a whole (FR-004). */
  const validateState = (state: MState): RenderDiagnostic[] => {
    const plain = state.roots.map(toPlain);
    const ids = new Set<string>();
    const guard: GuardState = { budgets, components, diagnostics: [], nodes: 0 };
    const diagnostics: RenderDiagnostic[] = [];
    plain.forEach((root, index) => {
      const at = `surface[${String(index)}]`;
      const report = validatePlainData({ actions, root, version: 1 }, catalog, ids);
      if (!report.ok || report.spec === undefined) {
        diagnostics.push(...report.issues.map((issue) => rebase(issue, at)));
        return;
      }
      const before = guard.diagnostics.length;
      guardNode(report.spec.root, 'root', 1, guard);
      diagnostics.push(
        ...guard.diagnostics.slice(before).map((diagnostic) => rebaseGuard(diagnostic, at)),
      );
    });
    if (diagnostics.length > 0) {
      return diagnostics;
    }
    const bytes = payloadBytes(plain);
    if (bytes > budgets.maxBytes) {
      return [
        fail(
          'surface',
          'size-budget',
          `surface payload of ${String(bytes)} bytes exceeds the ${String(budgets.maxBytes)}-byte budget`,
          String(bytes),
        ),
      ];
    }
    return [];
  };

  const apply = (input: unknown): LiveBatchResult => {
    if (skew !== null) {
      return result([skew]);
    }
    // 1. Purity wall over the whole batch: no foreign code runs past here.
    const wall = toPlainData(input, ABSOLUTE_MAX_BYTES, BATCH_LABELS);
    if (wall.issues.length > 0) {
      return result(wall.issues.map(toDiagnostic));
    }
    // 2. Per-batch byte budget over the exact serialized clone.
    const bytes = payloadBytes(wall.data);
    if (bytes > batchBudgets.maxBytes) {
      return result([
        fail(
          'batch',
          'batch-size-budget',
          `batch payload of ${String(bytes)} bytes exceeds the ${String(batchBudgets.maxBytes)}-byte batch budget`,
          String(bytes),
        ),
      ]);
    }
    // 3. Batch shape.
    const parsed = batchSchema.safeParse(wall.data);
    if (!parsed.success) {
      return result(
        parsed.error.issues.map((issue) =>
          fail(['batch', ...issue.path.map(String)].join('.'), 'malformed-batch', issue.message),
        ),
      );
    }
    const batch = parsed.data;
    if (batch.ops.length > batchBudgets.maxOps) {
      return result([
        fail(
          'batch.ops',
          'batch-op-budget',
          `batch of ${String(batch.ops.length)} ops exceeds the ${String(batchBudgets.maxOps)}-op batch budget`,
          String(batch.ops.length),
        ),
      ]);
    }
    // 4. Optimistic concurrency.
    if (batch.ifRevision !== undefined && batch.ifRevision !== revision) {
      return result([
        fail(
          'batch.ifRevision',
          'stale-revision',
          `batch expects revision ${String(batch.ifRevision)}; the surface is at revision ${String(revision)}`,
          String(revision),
        ),
      ]);
    }
    if (batch.ops.length === 0) {
      return result([]);
    }
    // 5. Every new node validated as a spec root.
    const nodes = new Map<number, UiSpecNode>();
    for (const [index, op] of batch.ops.entries()) {
      if (op.op === 'insert' || op.op === 'replace') {
        const checked = validateNode(op.node, `ops[${String(index)}]`);
        if (checked.node === undefined) {
          return result(checked.diagnostics);
        }
        nodes.set(index, checked.node);
      }
    }
    const nodeAt = (index: number): UiSpecNode => {
      const node = nodes.get(index);
      if (node === undefined) {
        throw new Error(`live surface: op ${String(index)} carries no validated node`);
      }
      return node;
    };
    // 6. The ops applied to a copy of the state, then the RESULTING state
    // validated as a whole. Nothing has touched the DOM yet.
    const shadow = cloneState(live);
    const shadowFailure = applyOps(shadow, batch.ops, {
      allowUserStateOverride,
      components,
      dom: null,
      materialize: (index) => fromPlain(nodeAt(index), null, ''),
    });
    if (shadowFailure !== null) {
      return result([shadowFailure]);
    }
    const stateDiagnostics = validateState(shadow);
    if (stateDiagnostics.length > 0) {
      return result(stateDiagnostics);
    }
    // 7. New subtrees built detached first: a component constructor that
    // throws rejects the batch before any attached node changes.
    const built = new Map<number, MNode>();
    try {
      for (const index of nodes.keys()) {
        built.set(index, build(nodeAt(index), null, ''));
      }
    } catch {
      return result([
        fail('batch', 'build-failed', 'a component failed to construct; nothing was applied'),
      ]);
    }
    // 8. Commit: the same ops, now with minimal DOM writes.
    applyOps(live, batch.ops, {
      allowUserStateOverride,
      components,
      dom: { doc, surface },
      materialize: (index) => {
        const node = built.get(index);
        if (node === undefined) {
          throw new Error(`live surface: op ${String(index)} has no built node`);
        }
        return node;
      },
    });
    revision += 1;
    cached = null;
    return result([]);
  };

  return {
    apply,
    get revision(): number {
      return revision;
    },
    snapshot(): LiveSnapshot {
      cached ??= deepFreeze({ actions, nodes: live.roots.map(toPlain), revision });
      return cached;
    },
  };
}
