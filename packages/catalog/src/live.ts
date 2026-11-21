/**
 * The live surface (spec 035): a long-lived surface an agent keeps changing
 * through atomic batches of operations addressed by stable node ids.
 *
 * Every batch crosses the guarded renderer's boundary (spec 028) against the
 * state it would PRODUCE: the purity wall over the whole batch, the batch
 * shape and per-batch budgets, then every op applied to a copy of the state
 * (each new node validated as a spec root), then the resulting state
 * validated as a whole (catalog membership, props and their limits, the URL
 * policy, actions, slots, unique ids, tag grammar, prop-name guards, state
 * budgets). Only a
 * batch that passes every layer touches the DOM, and it touches only what it
 * names: existing elements keep their identity, focus, typed values and
 * scroll. A rejected batch changes nothing and the surface stays live. Focus
 * a batch leaves nowhere is repaired once the change settles, never taken
 * from where the person is (spec 155, `focus-repair.ts`).
 *
 * `renderUiSpec` and `createStreamingRenderer` keep their semantics (D1).
 * Nothing here names a protocol or a domain (Art. VIII).
 */
import { z } from 'zod';

import {
  allocateDialogId,
  DIALOG_TAG,
  type DialogIdFor,
  isDialogInvoker,
  writeDialogId,
} from './dialog-commands.js';
import { createFocusRepair, holdsFocus } from './focus-repair.js';
import { catalogData } from './generated/catalog.js';
import { writeNativeLayout } from './primitives.js';
import {
  ABSOLUTE_MAX_BYTES,
  type ActionEvent,
  attachText,
  authoredLiveScalar,
  collectingDispatch,
  createNodeElement,
  DEFAULT_RENDER_BUDGETS,
  declaredEvents,
  type GuardState,
  guardNode,
  payloadBytes,
  pinButtonType,
  readLiveScalar,
  type RenderBudgets,
  type RenderDiagnostic,
  type RenderResult,
  toDiagnostic,
  versionDiagnostic,
  wireActivation,
  writeProp,
  writeProps,
} from './render.js';
import type {
  Catalog,
  CatalogEntry,
  CatalogPropConstraint,
  NodeValidationScope,
  UiSpecNode,
  ValidationContext,
  ValidationIssue,
} from './validate.js';
import {
  checkCommandTargets,
  createValidationScope,
  FORBIDDEN_KEYS,
  ownEntry,
  toPlainData,
  validatePlainData,
} from './validate.js';

type Scalar = boolean | number | string;

/** The action event of a live surface (035 FR-008, D7). */
export interface LiveActionEvent extends ActionEvent {
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

/**
 * Inserts a node at the top level, or into a parent's slot before a sibling
 * (035 D3).
 */
export interface LiveInsertOp {
  readonly op: 'insert';
  /** The parent's id; absent, the surface's top level. */
  readonly parent?: string | undefined;
  /** The parent's slot, default `''`; only with a parent. */
  readonly slot?: string | undefined;
  /** The sibling to insert before, in the same parent and slot; absent, last. */
  readonly before?: string | undefined;
  /** The new node, validated as the root of a spec. */
  readonly node: UiSpecNode;
}

/** Sets props of a node; `null` removes one. */
export interface LiveSetOp {
  readonly op: 'set';
  readonly id: string;
  readonly props: Readonly<Record<string, boolean | number | string | null>>;
  /** Overrides what the person changed, where the host allows it (035 D5). */
  readonly force?: boolean | undefined;
}

/** Replaces the text of one slot that holds only text. */
export interface LiveTextOp {
  readonly op: 'text';
  readonly id: string;
  /** Default `''`. */
  readonly slot?: string | undefined;
  readonly text: string;
}

/** Removes a node and its subtree. */
export interface LiveRemoveOp {
  readonly op: 'remove';
  readonly id: string;
  /** Discards what the person changed inside it, where the host allows it. */
  readonly force?: boolean | undefined;
}

/** Replaces a node and its subtree in place. */
export interface LiveReplaceOp {
  readonly op: 'replace';
  readonly id: string;
  /** The new node, validated as the root of a spec. */
  readonly node: UiSpecNode;
  /** Discards what the person changed inside it, where the host allows it. */
  readonly force?: boolean | undefined;
}

export type LiveOp = LiveInsertOp | LiveSetOp | LiveTextOp | LiveRemoveOp | LiveReplaceOp;

/**
 * One atomic change of a live surface (035 D3). `apply` still takes it as
 * untrusted data: these types help a producer write it, they prove nothing.
 */
export interface LiveBatch {
  /** Rejects the batch unless the surface is at this revision (035 D6). */
  readonly ifRevision?: number | undefined;
  readonly ops: readonly LiveOp[];
  /**
   * The id of the node that receives keyboard focus if, once the batch has
   * settled, focus is nowhere (155 D1). Focus that is somewhere never moves.
   */
  readonly focus?: string | undefined;
}

export interface LiveSurfaceOptions {
  /** The host-owned mount point; the surface only touches what it inserted. */
  readonly surface: Element;
  /** The catalog in use, fixed for the surface's life (032 S16); default built-in. */
  readonly catalog?: Catalog;
  /**
   * The allowed origins of URL props and Markdown destinations, fixed for
   * the surface's life. Absent, the scheme allowlist applies. Present, a URL
   * must be absolute HTTP(S) and belong to a listed origin
   * (see `RenderOptions.allowedUrlOrigins`).
   */
  readonly allowedUrlOrigins?: readonly string[];
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
  /**
   * Validates and applies one untrusted batch (a `LiveBatch`, or its JSON
   * text) atomically. A rejection is the return value, never a throw, and
   * leaves every earlier batch applied.
   */
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
const USER_STATE_PROPS: ReadonlySet<string> = new Set(['checked', 'open', 'selected', 'value']);

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
  /** The fields its action collects (spec 153); like `action`, only a replace changes it. */
  readonly collect: Readonly<Record<string, string>> | undefined;
  readonly slots: Map<string, MEntry[]>;
  parent: MNode | null;
  slot: string;
  /** Shadow copies point at the live node they copy (user-state checks). */
  readonly origin?: MNode | undefined;
  dom?: Element;
  /** The user interacted with this element's own value channel. */
  touched: boolean;
  /** User-state props a `set` agreed with, still the user's (spec 159); absent when none. */
  held?: Set<string>;
}

type MEntry = MNode | MText;

interface MState {
  readonly roots: MNode[];
  readonly ids: Map<string, MNode>;
}

/**
 * An op as the batch schema yields it: its node is still untrusted data until
 * `validateNode` checks it as a spec root.
 */
type ParsedOp<Op extends LiveOp = LiveOp> = Op extends { readonly node: UiSpecNode }
  ? Omit<Op, 'node'> & { readonly node: unknown }
  : Op;

interface ParsedBatch extends Omit<LiveBatch, 'ops'> {
  readonly ops: readonly ParsedOp[];
}

const idRef = z.string();
// Annotated against the public types: a public field the schema stops
// yielding, or yields with another type, fails the build.
const opSchema: z.ZodType<ParsedOp> = z.discriminatedUnion('op', [
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
  z.strictObject({ op: z.literal('remove'), id: idRef, force: z.boolean().optional() }),
  z.strictObject({
    op: z.literal('replace'),
    id: idRef,
    node: z.unknown(),
    force: z.boolean().optional(),
  }),
]);
const batchSchema: z.ZodType<ParsedBatch> = z.strictObject({
  focus: idRef.optional(),
  ifRevision: z.number().int().nonnegative().optional(),
  ops: z.array(opSchema),
});

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
    collect: node.collect,
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
    collect: node.collect,
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

/**
 * Writes an OWN data property whatever the name: a plain assignment of
 * `__proto__` would set the prototype instead and silently drop the value
 * from everything that reads the plain view (validation, budgets, snapshot).
 */
function defineOwn<T>(record: Record<string, T>, name: string, value: T): void {
  Object.defineProperty(record, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function toPlain(node: MNode): UiSpecNode {
  const slots: Record<string, (UiSpecNode | string)[]> = {};
  for (const [slotName, entries] of node.slots) {
    if (entries.length > 0) {
      defineOwn(
        slots,
        slotName,
        entries.map((entry) => (entry.kind === 'text' ? entry.text : toPlain(entry))),
      );
    }
  }
  return {
    ...(node.id === undefined ? {} : { id: node.id }),
    component: node.component,
    ...(Object.keys(node.props).length > 0 ? { props: { ...node.props } } : {}),
    ...(node.action === undefined ? {} : { action: node.action }),
    ...(node.collect === undefined ? {} : { collect: { ...node.collect } }),
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

/** Node count and depth of the MODEL itself, never of a derived view. */
function measure(roots: readonly MNode[]): { nodes: number; depth: number } {
  let nodes = 0;
  let depth = 0;
  const walk = (node: MNode, level: number): void => {
    nodes += 1;
    depth = Math.max(depth, level);
    for (const entries of node.slots.values()) {
      for (const entry of entries) {
        if (entry.kind === 'node') {
          walk(entry, level + 1);
        }
      }
    }
  };
  for (const root of roots) {
    walk(root, 1);
  }
  return { depth, nodes };
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
  readonly dom: {
    readonly surface: Element;
    readonly doc: Document;
    readonly dialogIdFor: DialogIdFor;
    /** Set when a `replace` swaps out the subtree that held focus (155 FR-003). */
    readonly focus: { replacement?: MNode };
  } | null;
  readonly components: Readonly<Record<string, CatalogEntry>>;
  readonly allowUserStateOverride: boolean;
}

/**
 * A slot name arrives as an op VALUE, never as an object key, so the purity
 * wall's forbidden-key check never sees it. It must be one the node's catalog
 * entry declares as an OWN property (an inherited `toString` or
 * `constructor` is not declared), and never a prototype-bearing name, even
 * when a hand-built catalog declares one (035 S20).
 */
function undeclaredSlot(
  ctx: ApplyContext,
  node: MNode,
  slot: string,
  at: string,
): RenderDiagnostic | null {
  if (FORBIDDEN_KEYS.has(slot)) {
    return fail(`${at}.slot`, 'forbidden-key', `the slot name "${slot}" is not allowed`, slot);
  }
  const entry = ownEntry(ctx.components, node.component);
  if (entry === undefined || !Object.hasOwn(entry.slots, slot)) {
    return fail(`${at}.slot`, 'unknown-slot', `${node.component} declares no slot "${slot}"`, slot);
  }
  return null;
}

/**
 * The user's live value of user-state prop `name` of a live `node` (D5), or
 * undefined when nothing there is the user's: the element is untouched, or
 * it shows what the agent last wrote and no `set` agreed with the user
 * since (spec 159). A diagnostic never repeats it (159 FR-004).
 */
function usersValue(
  node: MNode,
  name: string,
  constraint: CatalogPropConstraint,
): Scalar | undefined {
  if (node.dom === undefined || !node.touched) {
    return undefined;
  }
  const live = readLiveScalar(node.dom, name, constraint);
  if (live === undefined || node.held?.has(name)) {
    return live;
  }
  const written = authoredLiveScalar(
    node.dom,
    name,
    ownEntry(node.props, name) ?? constraint.default,
  );
  return live === written ? undefined : live;
}

/**
 * What the user changed inside `node`'s subtree (the node itself included)
 * that a `replace` or `remove` would discard (035 S21, D5). Discarding it
 * needs `force` AND the host's permission.
 */
function heldUserState(
  node: MNode,
  force: boolean,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  for (const member of subtree(node)) {
    const origin = member.origin;
    if (origin === undefined) {
      continue;
    }
    const entry = ownEntry(ctx.components, member.component);
    for (const name of USER_STATE_PROPS) {
      const constraint = ownEntry(entry?.props, name);
      if (constraint === undefined || usersValue(origin, name, constraint) === undefined) {
        continue;
      }
      if (!force) {
        return fail(
          `${at}.id`,
          'user-state-conflict',
          `the user changed "${name}" of node "${String(member.id)}"; this op would discard it without force`,
        );
      }
      if (!ctx.allowUserStateOverride) {
        return fail(
          `${at}.id`,
          'user-state-override-denied',
          `the host does not allow discarding the user's "${name}" of node "${String(member.id)}"`,
        );
      }
    }
  }
  return null;
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
  op: Extract<ParsedOp, { op: 'insert' }>,
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
  if (parent !== null) {
    const undeclared = undeclaredSlot(ctx, parent, slot, at);
    if (undeclared !== null) {
      return undeclared;
    }
  }
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
 * The user-state check of one `set` (D5, FR-006): changing a value that is
 * the user's away from its live value needs `force` AND the host's
 * permission.
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
  const constraint = ownEntry(ownEntry(ctx.components, node.component)?.props, name);
  if (!USER_STATE_PROPS.has(name) || origin?.dom === undefined || constraint === undefined) {
    return null;
  }
  const live = usersValue(origin, name, constraint);
  if (
    live === undefined ||
    live === authoredLiveScalar(origin.dom, name, next ?? constraint.default)
  ) {
    return null;
  }
  if (!force) {
    return fail(`${at}.props.${name}`, 'user-state-conflict', conflictMessage(name, node.id, live));
  }
  if (!ctx.allowUserStateOverride) {
    return fail(
      `${at}.props.${name}`,
      'user-state-override-denied',
      `the host does not allow overriding the user's "${name}"`,
    );
  }
  return null;
}

/**
 * What the agent can do about a conflict (155 FR-005). A disclosure the person
 * opened or closed is first set to the person's state in a batch of its own;
 * the agent's change is then an ordinary one in a later batch (a single batch
 * is checked against the state before it). Any other value needs force.
 */
function conflictMessage(name: string, id: string | undefined, live: Scalar): string {
  if (name === 'open' && typeof live === 'boolean') {
    return (
      `the user ${live ? 'opened' : 'closed'} "${String(id)}"; set open to ${String(live)} ` +
      'in a batch of its own first, then change it in a later batch'
    );
  }
  return `the user changed "${name}" of node "${String(id)}"; set it with force to override`;
}

/**
 * The ids a live state names as targets (spec 152): values of a dialog
 * invoker's `commandfor` and of props the catalog marks `format: "idref"`.
 */
function stateTargets(
  state: MState,
  components: Readonly<Record<string, CatalogEntry>>,
): Set<string> {
  const targets = new Set<string>();
  const pending: MNode[] = [...state.roots];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    collectTargets(node, components, targets);
    for (const children of node.slots.values()) {
      for (const child of children) {
        if (child.kind === 'node') {
          pending.push(child);
        }
      }
    }
  }
  return targets;
}

function collectTargets(
  node: MNode,
  components: Readonly<Record<string, CatalogEntry>>,
  targets: Set<string>,
): void {
  const entry = ownEntry(components, node.component);
  for (const [name, value] of Object.entries(node.props)) {
    if (
      typeof value === 'string' &&
      ((name === 'commandfor' && isDialogInvoker(node.component)) ||
        ownEntry(entry?.props, name)?.format === 'idref')
    ) {
      targets.add(value);
    }
  }
}

function applySet(
  state: MState,
  op: Extract<ParsedOp, { op: 'set' }>,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const node = lookup(state, op.id, `${at}.id`);
  if (!('kind' in node)) {
    return node;
  }
  const force = op.force === true;
  const entry = ownEntry(ctx.components, node.component);
  // Every prop name is checked against the OWN declared props here, before
  // any write, instead of trusting a later view of the state (035 S20).
  for (const name of Object.keys(op.props)) {
    if (ownEntry(entry?.props, name) === undefined) {
      return fail(
        `${at}.props.${name}`,
        'unknown-prop',
        `${node.component} declares no prop "${name}"`,
        name,
      );
    }
  }
  for (const [name, value] of Object.entries(op.props)) {
    const conflict = userStateConflict(node, name, value, force, at, ctx);
    if (conflict !== null) {
      return conflict;
    }
  }
  for (const [name, value] of Object.entries(op.props)) {
    const previous = ownEntry(node.props, name);
    const userState = USER_STATE_PROPS.has(name);
    const overriding = force && ctx.allowUserStateOverride && userState;
    const constraint = ownEntry(entry?.props, name);
    // A set the check let through on a value that is still the user's agreed
    // with it: the value stays theirs until a forced override (spec 159).
    // Not `open`: agreeing that the user closed a dialog hands it back, which
    // is how it is reopened (155 S6). Only the commit's live nodes are ever
    // touched.
    if (
      userState &&
      !overriding &&
      name !== 'open' &&
      constraint !== undefined &&
      usersValue(node, name, constraint) !== undefined
    ) {
      (node.held ??= new Set()).add(name);
    }
    if (value === null) {
      node.props = Object.fromEntries(Object.entries(node.props).filter(([key]) => key !== name));
    } else {
      defineOwn(node.props, name, value);
    }
    const element = node.dom;
    if (ctx.dom === null || element === undefined) {
      continue;
    }
    const current = ownEntry(node.props, name);
    // A native layout element's props are CSSOM layout (spec 037 D4): the
    // whole layout is re-derived and only changed style properties written.
    if (previous !== current && !writeNativeLayout(element, node.component, node.props)) {
      writeProp(element, node.component, name, current, ctx.dom.dialogIdFor, entry);
    }
    if (overriding) {
      // The component's own setter, with a validated scalar of the declared
      // type, or `undefined` for a removed prop with no default: a number
      // field has no empty value to fall back to (155 FR-004).
      Reflect.set(element, name, current ?? constraint?.default);
      // Only this prop is handed back: it now shows what the agent wrote.
      // Every other prop the user changed stays theirs (spec 160 FR-001).
      node.held?.delete(name);
    }
  }
  // Unsetting `type` re-pins the declarative no-submit default on every
  // node, bound or not, exactly as a fresh build would (spec 152 FR-007).
  if (ctx.dom !== null && node.dom !== undefined && Object.hasOwn(op.props, 'type')) {
    pinButtonType(node.dom, entry, node.props);
  }
  return null;
}

function applyText(
  state: MState,
  op: Extract<ParsedOp, { op: 'text' }>,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const node = lookup(state, op.id, `${at}.id`);
  if (!('kind' in node)) {
    return node;
  }
  const slot = op.slot ?? '';
  const undeclared = undeclaredSlot(ctx, node, slot, at);
  if (undeclared !== null) {
    return undeclared;
  }
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
  op: Extract<ParsedOp, { op: 'remove' }>,
  at: string,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const node = lookup(state, op.id, `${at}.id`);
  if (!('kind' in node)) {
    return node;
  }
  const held = heldUserState(node, op.force === true, at, ctx);
  if (held !== null) {
    return held;
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
  op: Extract<ParsedOp, { op: 'replace' }>,
  at: string,
  index: number,
  ctx: ApplyContext,
): RenderDiagnostic | null {
  const old = lookup(state, op.id, `${at}.id`);
  if (!('kind' in old)) {
    return old;
  }
  const held = heldUserState(old, op.force === true, at, ctx);
  if (held !== null) {
    return held;
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
    if (holdsFocus(old.dom)) {
      ctx.dom.focus.replacement = node;
    }
    old.dom.parentNode?.replaceChild(node.dom, old.dom);
  }
  return null;
}

function applyOps(
  state: MState,
  ops: readonly ParsedOp[],
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
  const sourceScope = Symbol();
  const onAction = options.onAction;
  const allowUserStateOverride = options.allowUserStateOverride === true;
  const skew = versionDiagnostic(options.catalogSchemaVersion, catalog.catalogSchemaVersion);
  // What every validation of this surface is checked against (FR-004): the
  // catalog and the URL origins are fixed at creation, never per batch.
  const context: ValidationContext = { allowedUrlOrigins: options.allowedUrlOrigins, catalog };
  const live: MState = { ids: new Map(), roots: [] };
  let dialogIds = new Map<string, string>();
  let revision = 0;
  let cached: LiveSnapshot | null = null;
  // True while a batch is being applied: a component reacting to its own
  // connection (or the host's onAction) must not interleave a second batch
  // with a commit validated against the state before it (035 S22).
  let applying = false;

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

  const focusRepair = createFocusRepair(doc);
  /** Focus goes to `node` if the batch left it nowhere, while `node` is on the surface. */
  const repairFocusTo = (node: MNode): void => {
    focusRepair.request(() => (pathOf(node) === null ? undefined : node.dom));
  };
  const unknownFocus = (id: string): RenderDiagnostic =>
    fail('batch.focus', 'unknown-id', `no node of the resulting surface has the id "${id}"`, id);

  const trackUserState = (element: Element, entry: CatalogEntry | undefined, model: MNode) => {
    if (
      entry === undefined ||
      ![...USER_STATE_PROPS].some((name) => Object.hasOwn(entry.props, name))
    ) {
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
  const build = (
    node: UiSpecNode,
    parent: MNode | null,
    slot: string,
    dialogIdFor: DialogIdFor,
  ): MNode => {
    const element = createNodeElement(doc, node.component, context.allowedUrlOrigins, sourceScope);
    const model: MNode = {
      action: node.action,
      collect: node.collect,
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
    const entry = ownEntry(components, node.component);
    writeProps(element, node.component, model.props, dialogIdFor, entry);
    writeDialogId(element, node.id, dialogIdFor);
    if (node.component === 'ki-chip') {
      // Live membership belongs to the patch model. The host can answer the
      // removal request with a remove operation, with or without a binding.
      element.addEventListener('ki-remove', (event) => {
        if (event.target === element) {
          event.preventDefault();
        }
      });
    } else if (node.component === 'ki-chip-group') {
      // A chip group moves the actual node. Keep the live default slot in the
      // same reading order so later placements and action paths use it.
      element.addEventListener('ki-reorder', (event) => {
        if (event.target !== element || applying) {
          return;
        }
        const entries = model.slots.get('');
        if (entries) {
          const order = new Map<Node, number>(
            Array.from(element.childNodes, (node, index) => [node, index]),
          );
          const indexOf = (entry: MEntry): number =>
            entry.dom ? (order.get(entry.dom) ?? -1) : -1;
          entries.sort((left, right) => indexOf(left) - indexOf(right));
          cached = null;
        }
      });
    }
    const action = node.action;
    wireActivation(
      element,
      entry,
      () => model.props,
      action !== undefined && onAction !== undefined
        ? collectingDispatch(
            model.collect,
            // Resolved at the gesture: the field the surface holds now.
            (id) => live.ids.get(id)?.dom,
            components,
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
          )
        : undefined,
    );
    trackUserState(element, entry, model);
    for (const [slotName, children] of Object.entries(node.slots ?? {})) {
      const list: MEntry[] = [];
      model.slots.set(slotName, list);
      for (const child of children) {
        if (typeof child === 'string') {
          list.push({ dom: attachText(element, child, slotName, doc), kind: 'text', text: child });
        } else {
          const built = build(child, model, slotName, dialogIdFor);
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
    // The prospective target can be in another root, or a later op.
    const report = validatePlainData(
      { actions, root: raw, version: 1 },
      context,
      createValidationScope(),
    );
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
    const scope: NodeValidationScope = createValidationScope();
    const guard: GuardState = { budgets, components, diagnostics: [], nodes: 0 };
    const diagnostics: RenderDiagnostic[] = [];
    plain.forEach((root, index) => {
      const at = `surface[${String(index)}]`;
      const report = validatePlainData({ actions, root, version: 1 }, context, scope, at);
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
    const commandDiagnostics = checkCommandTargets(scope);
    if (commandDiagnostics.length > 0) {
      return commandDiagnostics.map(toDiagnostic);
    }
    // The state budgets bind the live MODEL (035 S20): the plain view is
    // only what the validators read, so a view that ever lost a node would
    // under-count. Any disagreement between the two fails closed.
    const shape = measure(state.roots);
    if (shape.depth > budgets.maxDepth) {
      return [
        fail(
          'surface',
          'depth-budget',
          `surface nesting depth exceeds the ${String(budgets.maxDepth)}-level budget`,
          String(shape.depth),
        ),
      ];
    }
    if (shape.nodes > budgets.maxNodes) {
      return [
        fail(
          'surface',
          'node-count-budget',
          `surface node count exceeds the ${String(budgets.maxNodes)}-node budget`,
          String(shape.nodes),
        ),
      ];
    }
    if (shape.nodes !== guard.nodes) {
      return [
        fail(
          'surface',
          'state-mismatch',
          `the validated view holds ${String(guard.nodes)} of the ${String(shape.nodes)} live nodes`,
          String(shape.nodes),
        ),
      ];
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
    if (applying) {
      return result([
        fail(
          'batch',
          'reentrant-batch',
          'a batch is being applied; submit this one after apply returns',
        ),
      ]);
    }
    applying = true;
    try {
      return applyOnce(input);
    } finally {
      applying = false;
    }
  };

  const applyOnce = (input: unknown): LiveBatchResult => {
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
      if (batch.focus !== undefined) {
        const target = live.ids.get(batch.focus);
        if (target === undefined) {
          return result([unknownFocus(batch.focus)]);
        }
        repairFocusTo(target);
      }
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
    // The focus names a node of the RESULTING state: one the batch inserts
    // may be named, one it removes may not (155 S3).
    if (batch.focus !== undefined && !shadow.ids.has(batch.focus)) {
      return result([unknownFocus(batch.focus)]);
    }
    const stateDiagnostics = validateState(shadow);
    if (stateDiagnostics.length > 0) {
      return result(stateDiagnostics);
    }
    // 7. New subtrees built detached first: a component constructor that
    // throws rejects the batch before any attached node changes.
    // Target nodes of the resulting state (spec 152): every dialog, and
    // every node a command or a reference names. Each keeps the DOM id it
    // already had; a new target gets a fresh one the host page does not use.
    const targets = stateTargets(shadow, components);
    const nextDialogIds = new Map<string, string>();
    for (const [id, node] of shadow.ids) {
      if (node.component === DIALOG_TAG || targets.has(id)) {
        nextDialogIds.set(id, dialogIds.get(id) ?? allocateDialogId(surface));
      }
    }
    const dialogIdFor: DialogIdFor = (id) => nextDialogIds.get(id);
    const built = new Map<number, MNode>();
    try {
      for (const index of nodes.keys()) {
        built.set(index, build(nodeAt(index), null, '', dialogIdFor));
      }
    } catch {
      return result([
        fail('batch', 'build-failed', 'a component failed to construct; nothing was applied'),
      ]);
    }
    // 8. Commit: the same ops, now with minimal DOM writes. They replay
    // exactly what step 6 validated on an identical copy, so they cannot
    // fail; a divergence would be a defect, never a partial apply to hide.
    const focus: { replacement?: MNode } = {};
    const diverged = applyOps(live, batch.ops, {
      allowUserStateOverride,
      components,
      dom: { dialogIdFor, doc, focus, surface },
      materialize: (index) => {
        const node = built.get(index);
        if (node === undefined) {
          throw new Error(`live surface: op ${String(index)} has no built node`);
        }
        return node;
      },
    });
    if (diverged !== null) {
      throw new Error(`live surface: commit diverged from validation at ${diverged.path}`);
    }
    // A node that was already on the surface and is now a target receives
    // its id; one that stopped being a target loses the id it was given.
    for (const [id, node] of live.ids) {
      const target = nextDialogIds.get(id);
      if (target !== undefined && node.dom?.getAttribute('id') !== target) {
        node.dom?.setAttribute('id', target);
      } else if (target === undefined && dialogIds.has(id)) {
        node.dom?.removeAttribute('id');
      }
    }
    dialogIds = nextDialogIds;
    revision += 1;
    cached = null;
    // 9. Focus the batch left nowhere: to the node it names, else to the
    // replacement of the node that held it (155 FR-003).
    const focusTarget = batch.focus === undefined ? focus.replacement : live.ids.get(batch.focus);
    if (focusTarget !== undefined) {
      repairFocusTo(focusTarget);
    }
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
