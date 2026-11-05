/**
 * The guarded renderer (spec 028, Art. VIII): untrusted UI specs reach the
 * DOM only through the neutral catalog. Components, props and actions outside
 * the catalog contract are rejected fail-closed with machine-readable
 * diagnostics; no code path executes from spec data; and declared budgets
 * bound every render, including the accumulated state of a stream.
 *
 * The renderer owns the SAFE-RENDER semantics over the neutral format of
 * spec 027 (budgets, the URL allowlist, streaming attachment) and adds no
 * schema of its own: catalog membership, prop types, declared actions and
 * the purity wall all come from `@kimen/catalog`'s validation layer
 * (Art. I, one source of truth). It is client-side (touches `document`);
 * SSR/DSD is a deferred bet.
 */
import { catalogData } from './generated/catalog.js';
import { tagGrammarViolation } from './tag-grammar.js';
import type {
  Catalog,
  CatalogEntry,
  CatalogPropConstraint,
  UiSpec,
  UiSpecNode,
} from './validate.js';
import { toPlainData, validatePlainData } from './validate.js';

const builtInCatalog: Catalog = catalogData;

/**
 * A machine-readable rejection record (FR-007): the node path, the violated
 * rule and the offending value. Pure data — safe to display anywhere because
 * a host renders it as text, never markup (S16).
 */
export interface RenderDiagnostic {
  readonly path: string;
  readonly rule: string;
  readonly message: string;
  readonly value?: string | undefined;
}

export interface RenderResult {
  readonly ok: boolean;
  readonly diagnostics: readonly RenderDiagnostic[];
}

/** The data-only payload delivered on the renderer's single action channel. */
export interface ActionEvent {
  readonly action: string;
  readonly path: string;
  readonly data: Readonly<Record<string, boolean | number | string>>;
}

/**
 * Declared render budgets (FR-006): nesting depth, node count and payload
 * size. A spec exactly at a budget passes (S14); one beyond it is rejected
 * before any node attaches (S9). The defaults are safe; a host may tighten
 * them but the renderer never renders past them.
 */
export interface RenderBudgets {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxBytes: number;
}

export const DEFAULT_RENDER_BUDGETS: RenderBudgets = {
  maxBytes: 262_144,
  maxDepth: 32,
  maxNodes: 512,
};

// Absolute anti-DoS ceiling for the purity-wall snapshot, always ≥ any host
// payload budget: the host's `maxBytes` is the EXACT at-budget-passes bound,
// checked over the serialized clone; this ceiling only stops the snapshot
// itself from unbounded work on a hostile input the host budget would reject.
const ABSOLUTE_MAX_BYTES = 8 * 1_024 * 1_024;

export interface RenderOptions {
  readonly surface: Element;
  readonly onAction?: (event: ActionEvent) => void;
  readonly budgets?: Partial<RenderBudgets>;
  /**
   * The catalog schema version the spec was authored against. When present
   * and unsupported the render is rejected fail-closed (FR-012, S13); when
   * absent the render proceeds under the renderer's own catalog.
   */
  readonly catalogSchemaVersion?: string;
  /**
   * The catalog to validate and render against (spec 032): a value from
   * `createCatalog`, or absent for the built-in generated catalog — the
   * default path, byte-for-byte the pre-032 behavior. Membership, prop
   * constraints, `type`-prop pinning and the version-skew gate all read
   * this catalog in use; it is never half-applied (032 FR-011).
   */
  readonly catalog?: Catalog;
}

/**
 * URL-bearing prop names, as a renderer-wide policy rather than a
 * per-component schema (FR-011): any string prop under one of these names is
 * held to the URL allowlist. Component-agnostic and conservative — the same
 * attribute names a browser treats as fetchable/navigable.
 */
const URL_PROP_NAMES = new Set([
  'action',
  'background',
  'cite',
  'data',
  'formaction',
  'href',
  'ping',
  'poster',
  'src',
  'srcset',
  'xlink:href',
]);

const SUPPORTED_SCHEMES = new Set(['http', 'https']);

// HTML inline event-handler content attributes: setting one via setAttribute
// installs executable code, so the renderer rejects the whole on* namespace
// (case-insensitive) — the last line of defence for a hand-built `Catalog`
// value that never crossed `createCatalog`'s registration guard.
const EVENT_HANDLER_PROP = /^on/iu;

// A conservative DOM attribute name, kept in sync with @kimen/catalog's
// registration guard (register.ts SAFE_PROP_NAME): rejecting empty/exotic
// names keeps an InvalidCharacterError from throwing out of setAttribute
// (fail-closed diagnostic instead). Every built-in catalog prop name satisfies
// it, so normal rendering is unaffected.
const SAFE_PROP_NAME = /^[a-z][a-z0-9_-]*$/u;

/**
 * The scheme of a URL value that is NOT on the allowlist, or null when the
 * value is a relative reference or an http(s) URL (FR-004). Control
 * characters and surrounding whitespace are stripped first, so
 * `java\tscript:` and leading-newline tricks cannot smuggle a live scheme
 * past the check.
 */
function offendingScheme(value: string): string | null {
  // Strip the C0/C1 controls and spaces a browser ignores when resolving
  // a URL scheme (defeats `java\tscript:` and leading-newline tricks) by
  // code point, so no control-character regex literal is needed.
  let normalized = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code > 0x20 && !(code >= 0x7f && code <= 0x9f)) {
      normalized += character;
    }
  }
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/u.exec(normalized);
  if (match === null) {
    return null;
  }
  const scheme = (match[1] ?? '').toLowerCase();
  return SUPPORTED_SCHEMES.has(scheme) ? null : scheme;
}

interface GuardState {
  nodes: number;
  readonly diagnostics: RenderDiagnostic[];
  readonly budgets: RenderBudgets;
  readonly components: Readonly<Record<string, CatalogEntry>>;
}

/**
 * The platform activation event of a bound node whose catalog entry declares
 * no event of its own (buttons, cards): the click a pointer, Enter or Space
 * produces on an activatable element.
 */
const DEFAULT_ACTIVATION_EVENT = 'click';

/**
 * The declared events of a catalog entry, in the entry's (sorted) order. A
 * bound node activates on the only one (FR-003, S17) or, when there is none,
 * on the platform click; more than one is ambiguous and the guard rejects
 * the binding before any listener exists (S19).
 */
function declaredEvents(entry: CatalogEntry | undefined): readonly string[] {
  return Object.keys(entry?.events ?? {});
}

/**
 * Renderer-native guards over the already-catalog-validated tree (plain,
 * safe data): node-count and depth budgets and the URL allowlist. Catalog
 * membership, prop types, actions and slots were already enforced upstream.
 */
function guardNode(node: UiSpecNode, path: string, depth: number, state: GuardState): void {
  state.nodes += 1;
  if (depth > state.budgets.maxDepth) {
    state.diagnostics.push({
      message: `spec nesting depth exceeds the ${String(state.budgets.maxDepth)}-level budget`,
      path,
      rule: 'depth-budget',
      value: String(depth),
    });
    return;
  }
  if (state.nodes > state.budgets.maxNodes) {
    state.diagnostics.push({
      message: `spec node count exceeds the ${String(state.budgets.maxNodes)}-node budget`,
      path,
      rule: 'node-count-budget',
      value: String(state.nodes),
    });
    return;
  }
  // Renderer-native tag guard (032 FR-013/S17, defence in depth): `Catalog`
  // is structural, so a hand-built value that never crossed createCatalog
  // could declare a native tag such as `script` or `iframe`. Re-apply the
  // registration tag grammar before buildNode ever calls createElement.
  const tagViolation = tagGrammarViolation(node.component);
  if (tagViolation !== null) {
    state.diagnostics.push({
      message: `component "${node.component}" ${tagViolation}`,
      path: `${path}.component`,
      rule: 'invalid-tag',
      value: node.component,
    });
  }
  // Renderer-native activation guard (FR-003, S19): a bound action needs ONE
  // activation event. An entry declaring several gives the spec no way to
  // say which, so the binding is rejected fail-closed instead of guessing.
  if (node.action !== undefined) {
    const events = declaredEvents(state.components[node.component]);
    if (events.length > 1) {
      state.diagnostics.push({
        message: `${node.component} declares more than one event (${events.join(', ')}); a bound action needs exactly one activation event`,
        path: `${path}.action`,
        rule: 'ambiguous-activation-event',
        value: node.action,
      });
    }
  }
  for (const [name, value] of Object.entries(node.props ?? {})) {
    // Renderer-native name guard (defence in depth for hand-built catalogs that
    // never crossed createCatalog): an on* name would compile into a live
    // inline handler, and an exotic name would throw InvalidCharacterError out
    // of setAttribute — reject both fail-closed before buildNode touches the
    // DOM. Kept in sync with register.ts's registration-time check.
    if (EVENT_HANDLER_PROP.test(name)) {
      state.diagnostics.push({
        message: `${node.component} prop "${name}" uses a forbidden event-handler attribute name`,
        path: `${path}.props.${name}`,
        rule: 'forbidden-prop-name',
        value: name,
      });
      continue;
    }
    if (!SAFE_PROP_NAME.test(name)) {
      state.diagnostics.push({
        message: `${node.component} prop "${name}" is not a valid attribute name`,
        path: `${path}.props.${name}`,
        rule: 'malformed-prop-name',
        value: name,
      });
      continue;
    }
    if (typeof value === 'string' && URL_PROP_NAMES.has(name.toLowerCase())) {
      const scheme = offendingScheme(value);
      if (scheme !== null) {
        state.diagnostics.push({
          message: `${node.component} URL prop "${name}" uses the rejected scheme "${scheme}"`,
          path: `${path}.props.${name}`,
          rule: 'url-scheme',
          value,
        });
      }
    }
  }
  for (const [slotName, children] of Object.entries(node.slots ?? {})) {
    children.forEach((child, index) => {
      if (typeof child !== 'string') {
        guardNode(child, `${path}.slots.${slotName}[${String(index)}]`, depth + 1, state);
      }
    });
  }
}

/**
 * Exact serialized byte length of a plain-data clone (FR-006 payload size).
 * The clone carries no getters or `toJSON`, so `JSON.stringify` here invokes
 * no foreign code — the purity wall was crossed upstream.
 */
function payloadBytes(data: unknown): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

/**
 * The live-state props a declared-event activation reports (FR-003, S17): the
 * control's own value channel, which the user changes in place. A renderer-
 * wide policy like the URL prop names, applied only where the entry declares
 * the prop and only when the live value has the declared type, so nothing
 * undeclared or mistyped ever crosses the action channel.
 */
const LIVE_STATE_PROPS = ['checked', 'value'] as const;

function matchesConstraint(
  value: unknown,
  constraint: CatalogPropConstraint,
): value is boolean | number | string {
  switch (constraint.type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'enum':
      return typeof value === 'string' && constraint.values?.includes(value) === true;
    default:
      return typeof value === 'string';
  }
}

function liveData(
  element: Element,
  props: Readonly<Record<string, boolean | number | string>>,
  entry: CatalogEntry | undefined,
): Record<string, boolean | number | string> {
  const data: Record<string, boolean | number | string> = { ...props };
  for (const name of LIVE_STATE_PROPS) {
    const constraint = entry?.props[name];
    if (constraint === undefined) {
      continue;
    }
    // Reads the rendered component's own property (its code, never spec data).
    const live: unknown = Reflect.get(element, name);
    if (matchesConstraint(live, constraint)) {
      data[name] = live;
    }
  }
  return data;
}

/**
 * Interactions already owned by a bound node. Listeners run innermost-first
 * while an event bubbles, so the innermost bound node claims the event and
 * no enclosing bound node dispatches for the same activation (S4) — without
 * cancelling it or hiding it from the host page.
 */
const claimedEvents = new WeakSet<Event>();

function claim(event: Event): boolean {
  if (claimedEvents.has(event)) {
    return false;
  }
  claimedEvents.add(event);
  return true;
}

function attachText(parent: Node, text: string, slotName: string, doc: Document): void {
  if (slotName === '') {
    parent.appendChild(doc.createTextNode(text));
    return;
  }
  // Slotted text needs an element to carry the slot assignment; the text
  // itself stays a text node (inert), never parsed as markup.
  const holder = doc.createElement('span');
  holder.setAttribute('slot', slotName);
  holder.appendChild(doc.createTextNode(text));
  parent.appendChild(holder);
}

/**
 * Builds one validated node into a detached element (FR-004): props become
 * attributes (booleans as presence), text children become inert text nodes
 * (never `innerHTML`), and a bound action wires exactly one activation
 * listener — derived from the catalog entry (FR-003) — onto the renderer's
 * single channel. No spec string is ever evaluated.
 */
function buildNode(
  node: UiSpecNode,
  path: string,
  doc: Document,
  onAction: ((event: ActionEvent) => void) | undefined,
  entries: Readonly<Record<string, CatalogEntry>>,
): Element {
  const element = doc.createElement(node.component);
  const props = node.props ?? {};
  for (const [name, value] of Object.entries(props)) {
    if (typeof value === 'boolean') {
      if (value) {
        element.setAttribute(name, '');
      }
    } else {
      element.setAttribute(name, String(value));
    }
  }
  if (node.action !== undefined && onAction !== undefined) {
    const action = node.action;
    const entry = entries[node.component];
    // The guard admitted at most one declared event (S19).
    const activation = declaredEvents(entry)[0] ?? DEFAULT_ACTIVATION_EVENT;
    if (activation === DEFAULT_ACTIVATION_EVENT) {
      // A click-activated node (S4) dispatches the spec's data payload and
      // suppresses the native default (a submit button's form submission)
      // and the bubbling, so no other callback or code path runs.
      element.addEventListener(DEFAULT_ACTIVATION_EVENT, (event: Event) => {
        if (!claim(event)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onAction({ action, data: { ...props }, path });
      });
      // Declaratively neutralize a form-submitting default when the catalog
      // types this component's `type` prop and the spec left it unset: pin it
      // to "button" so no native submit path runs alongside the action.
      const typeConstraint = entry?.props['type'];
      if (
        typeConstraint?.type === 'enum' &&
        typeConstraint.values?.includes('button') === true &&
        props['type'] === undefined
      ) {
        element.setAttribute('type', 'button');
      }
    } else {
      // A declared-event node (S17) dispatches on the event its catalog
      // entry declares, emitted by the component itself — a same-named
      // event bubbling up from a descendant is not this control's
      // activation (S18). Nothing is cancelled: the control must be able to
      // change, and the payload carries its live state. The click that
      // operates the control is claimed, never cancelled, so an enclosing
      // click-bound node does not dispatch for it (S4).
      element.addEventListener(DEFAULT_ACTIVATION_EVENT, (event: Event) => {
        claim(event);
      });
      element.addEventListener(activation, (event: Event) => {
        if (event.target !== element || !claim(event)) {
          return;
        }
        onAction({ action, data: liveData(element, props, entry), path });
      });
    }
  }
  for (const [slotName, children] of Object.entries(node.slots ?? {})) {
    children.forEach((child, index) => {
      if (typeof child === 'string') {
        attachText(element, child, slotName, doc);
      } else {
        const childElement = buildNode(
          child,
          `${path}.slots.${slotName}[${String(index)}]`,
          doc,
          onAction,
          entries,
        );
        if (slotName !== '') {
          childElement.setAttribute('slot', slotName);
        }
        element.appendChild(childElement);
      }
    });
  }
  return element;
}

function ownerDocument(surface: Element): Document {
  // An element always carries its owner document (the client-side surface
  // the host mounts; SSR/DSD is a deferred bet).
  return surface.ownerDocument;
}

interface PreparedSpec {
  readonly spec: UiSpec;
  readonly diagnostics: readonly RenderDiagnostic[];
}

/** The fail-closed version-skew diagnostic (FR-012/S13), or null when supported. */
function versionDiagnostic(
  declared: string | undefined,
  supported: string,
): RenderDiagnostic | null {
  if (declared === undefined || declared === supported) {
    return null;
  }
  return {
    message: `spec declares catalog schema version "${declared}"; this renderer supports "${supported}"`,
    path: 'spec.catalogSchemaVersion',
    rule: 'unsupported-version',
    value: declared,
  };
}

/**
 * The shared validation pipeline for one spec/node payload: purity wall →
 * catalog-schema-version gate → catalog validation → renderer guards
 * (budgets, URL allowlist). Returns the typed spec only when every layer
 * passes; otherwise fail-closed diagnostics and no spec.
 */
function prepare(
  input: unknown,
  budgets: RenderBudgets,
  optionsVersion: string | undefined,
  catalog: Catalog,
): PreparedSpec {
  const { data, issues } = toPlainData(input, ABSOLUTE_MAX_BYTES);
  if (issues.length > 0) {
    return { diagnostics: issues.map(toDiagnostic), spec: undefined as unknown as UiSpec };
  }
  // The agent's own declaration (FR-012/S13) is authoritative; the option is
  // the host fallback. The neutral spec schema is strict, so a declared
  // version travels as a top-level field the renderer reads and strips off
  // the plain-data clone (safe — it is the renderer's own object) before
  // catalog validation would reject the extra key.
  let declaredVersion = optionsVersion;
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const field = record['catalogSchemaVersion'];
    if (typeof field === 'string') {
      declaredVersion = field;
    }
    if ('catalogSchemaVersion' in record) {
      delete record['catalogSchemaVersion'];
    }
  }
  const skew = versionDiagnostic(declaredVersion, catalog.catalogSchemaVersion);
  if (skew !== null) {
    return { diagnostics: [skew], spec: undefined as unknown as UiSpec };
  }
  const bytes = payloadBytes(data);
  if (bytes > budgets.maxBytes) {
    return {
      diagnostics: [
        {
          message: `spec payload of ${String(bytes)} bytes exceeds the ${String(budgets.maxBytes)}-byte budget`,
          path: 'spec',
          rule: 'size-budget',
          value: String(bytes),
        },
      ],
      spec: undefined as unknown as UiSpec,
    };
  }
  const report = validatePlainData(data, catalog);
  if (!report.ok || report.spec === undefined) {
    return {
      diagnostics: report.issues.map(toDiagnostic),
      spec: undefined as unknown as UiSpec,
    };
  }
  const state: GuardState = {
    budgets,
    components: catalog.components,
    diagnostics: [],
    nodes: 0,
  };
  guardNode(report.spec.root, 'root', 1, state);
  if (state.diagnostics.length > 0) {
    return { diagnostics: state.diagnostics, spec: undefined as unknown as UiSpec };
  }
  return { diagnostics: [], spec: report.spec };
}

function toDiagnostic(issue: {
  code: string;
  message: string;
  path: string;
  value?: string | undefined;
}): RenderDiagnostic {
  return { message: issue.message, path: issue.path, rule: issue.code, value: issue.value };
}

/**
 * Renders a complete untrusted UI spec into `surface`, fail-closed and
 * atomic (FR-007): full validation precedes the first attach, so a rejected
 * spec touches the surface not at all. On success the validated tree is
 * built into a fragment and REPLACES the surface's content in one operation,
 * so a re-render swaps the previous tree (and its action listeners) rather
 * than duplicating it; a rejected re-render leaves the previous content
 * intact.
 */
export function renderUiSpec(input: unknown, options: RenderOptions): RenderResult {
  const budgets: RenderBudgets = { ...DEFAULT_RENDER_BUDGETS, ...options.budgets };
  const catalog = options.catalog ?? builtInCatalog;
  const prepared = prepare(input, budgets, options.catalogSchemaVersion, catalog);
  if (prepared.diagnostics.length > 0) {
    return { diagnostics: prepared.diagnostics, ok: false };
  }
  const doc = ownerDocument(options.surface);
  options.surface.replaceChildren(
    buildNode(prepared.spec.root, 'root', doc, options.onAction, catalog.components),
  );
  return { diagnostics: [], ok: true };
}

export interface StreamingRenderer {
  /**
   * Validates and, on success, attaches one top-level node subtree to the
   * surface (FR-008): a node attaches only after it fully validates; an
   * invalid node fails closed (its subtree never attaches, the failure is
   * reported) while previously validated content remains. Once the
   * accumulated payload trips a budget the stream halts and every further
   * push is rejected (S15).
   */
  push(node: unknown): RenderResult;
  /** Marks the stream complete; attached content is unaffected. */
  close(): void;
}

/**
 * A progressive renderer over a streamed spec (FR-008). The declared actions
 * and the catalog-schema-version gate are fixed at creation; each pushed
 * node is validated as a standalone subtree, and the FR-006 budgets bind the
 * ACCUMULATED stream state (attached node count and payload size), so a
 * stream that never closes still trips its budget and halts fail-closed.
 */
export function createStreamingRenderer(
  options: RenderOptions & { readonly actions?: readonly string[] },
): StreamingRenderer {
  const budgets: RenderBudgets = { ...DEFAULT_RENDER_BUDGETS, ...options.budgets };
  // The catalog in use is fixed at creation (032 S16): every pushed chunk
  // validates and renders against the same catalog for the stream's life.
  const catalog = options.catalog ?? builtInCatalog;
  const doc = ownerDocument(options.surface);
  const declaredActions = options.actions ?? [];
  let accumulatedBytes = 0;
  let accumulatedNodes = 0;
  // Attach order of the next chunk: each top-level chunk is addressed as
  // `stream[<n>]`, so action paths stay unique across pushes.
  let attachedChunks = 0;
  // The version-skew gate (FR-012/S13) applies to a stream up front: an
  // unsupported catalog schema version halts every push before any chunk
  // attaches, so future or laxer chunks can never render.
  let halted: RenderDiagnostic | null = versionDiagnostic(
    options.catalogSchemaVersion,
    catalog.catalogSchemaVersion,
  );

  return {
    close(): void {
      halted = halted ?? { message: 'stream closed', path: 'stream', rule: 'closed' };
    },
    push(node: unknown): RenderResult {
      // Once halted for ANY reason — a prior invalid chunk (FR-008), a
      // tripped accumulated budget (S15), version skew, or close() — every
      // further push is rejected; an untrusted stream never mutates the
      // surface again after it has been rejected or completed.
      if (halted !== null) {
        return { diagnostics: [halted], ok: false };
      }
      // Wrap the streamed node as a one-node neutral document so it crosses
      // the identical validation pipeline; the stream's declared actions
      // travel with it.
      const wrapped = { actions: declaredActions, root: node, version: 1 };
      const { data, issues } = toPlainData(wrapped, ABSOLUTE_MAX_BYTES);
      if (issues.length > 0) {
        halted = issues[0] === undefined ? null : toDiagnostic(issues[0]);
        return { diagnostics: issues.map(toDiagnostic), ok: false };
      }
      const chunkBytes = payloadBytes((data as { root: unknown }).root);
      if (accumulatedBytes + chunkBytes > budgets.maxBytes) {
        halted = {
          message: `accumulated stream payload exceeds the ${String(budgets.maxBytes)}-byte budget`,
          path: 'stream',
          rule: 'size-budget',
          value: String(accumulatedBytes + chunkBytes),
        };
        return { diagnostics: [halted], ok: false };
      }
      const report = validatePlainData(data, catalog);
      if (!report.ok || report.spec === undefined) {
        // FR-008: an invalid chunk halts the stream fail-closed; its subtree
        // never attaches and previously validated content remains.
        const diagnostics = report.issues.map(toDiagnostic);
        halted = diagnostics[0] ?? {
          message: 'invalid chunk',
          path: 'stream',
          rule: 'malformed-spec',
        };
        return { diagnostics, ok: false };
      }
      const remainingNodeBudget: RenderBudgets = {
        ...budgets,
        maxNodes: budgets.maxNodes - accumulatedNodes,
      };
      const state: GuardState = {
        budgets: remainingNodeBudget,
        components: catalog.components,
        diagnostics: [],
        nodes: 0,
      };
      guardNode(report.spec.root, 'root', 1, state);
      if (state.diagnostics.length > 0) {
        halted = state.diagnostics[0] ?? null;
        return { diagnostics: state.diagnostics, ok: false };
      }
      accumulatedBytes += chunkBytes;
      accumulatedNodes += state.nodes;
      // Each chunk is its own top-level subtree on the surface: it dispatches
      // actions at `stream[<n>]` (descendants keep renderUiSpec's path
      // grammar below it), never a `root` shared by every pushed chunk.
      const chunkPath = `stream[${String(attachedChunks)}]`;
      attachedChunks += 1;
      options.surface.appendChild(
        buildNode(report.spec.root, chunkPath, doc, options.onAction, catalog.components),
      );
      return { diagnostics: [], ok: true };
    },
  };
}
