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
import type { CatalogEntry, UiSpec, UiSpecNode } from './validate.js';
import { toPlainData, validatePlainData } from './validate.js';

const componentEntries: Readonly<Record<string, CatalogEntry>> = catalogData.components;

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
  for (const [name, value] of Object.entries(node.props ?? {})) {
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
 * (never `innerHTML`), and a bound action wires exactly one native
 * activation listener onto the renderer's single channel. No spec string is
 * ever evaluated.
 */
function buildNode(
  node: UiSpecNode,
  path: string,
  doc: Document,
  onAction: ((event: ActionEvent) => void) | undefined,
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
    // A guarded action is the ONLY interaction channel (S4): suppress the
    // native default (a submit button's form submission) and stop the event
    // bubbling to an ancestor action listener, so exactly one declared action
    // dispatches per activation and no other callback or code path runs.
    element.addEventListener('click', (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onAction({ action, data: { ...props }, path });
    });
    // Declaratively neutralize a form-submitting default when the catalog
    // types this component's `type` prop and the spec left it unset: pin it
    // to "button" so no native submit path runs alongside the action.
    const typeConstraint = componentEntries[node.component]?.props['type'];
    if (
      typeConstraint?.type === 'enum' &&
      typeConstraint.values?.includes('button') === true &&
      props['type'] === undefined
    ) {
      element.setAttribute('type', 'button');
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
function versionDiagnostic(declared: string | undefined): RenderDiagnostic | null {
  if (declared === undefined || declared === catalogData.catalogSchemaVersion) {
    return null;
  }
  return {
    message: `spec declares catalog schema version "${declared}"; this renderer supports "${catalogData.catalogSchemaVersion}"`,
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
  const skew = versionDiagnostic(declaredVersion);
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
  const report = validatePlainData(data);
  if (!report.ok || report.spec === undefined) {
    return {
      diagnostics: report.issues.map(toDiagnostic),
      spec: undefined as unknown as UiSpec,
    };
  }
  const state: GuardState = { budgets, diagnostics: [], nodes: 0 };
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
  const prepared = prepare(input, budgets, options.catalogSchemaVersion);
  if (prepared.diagnostics.length > 0) {
    return { diagnostics: prepared.diagnostics, ok: false };
  }
  const doc = ownerDocument(options.surface);
  options.surface.replaceChildren(buildNode(prepared.spec.root, 'root', doc, options.onAction));
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
  const doc = ownerDocument(options.surface);
  const declaredActions = options.actions ?? [];
  let accumulatedBytes = 0;
  let accumulatedNodes = 0;
  // The version-skew gate (FR-012/S13) applies to a stream up front: an
  // unsupported catalog schema version halts every push before any chunk
  // attaches, so future or laxer chunks can never render.
  let halted: RenderDiagnostic | null = versionDiagnostic(options.catalogSchemaVersion);

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
      const report = validatePlainData(data);
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
      const state: GuardState = { budgets: remainingNodeBudget, diagnostics: [], nodes: 0 };
      guardNode(report.spec.root, 'root', 1, state);
      if (state.diagnostics.length > 0) {
        halted = state.diagnostics[0] ?? null;
        return { diagnostics: state.diagnostics, ok: false };
      }
      accumulatedBytes += chunkBytes;
      accumulatedNodes += state.nodes;
      options.surface.appendChild(buildNode(report.spec.root, 'root', doc, options.onAction));
      return { diagnostics: [], ok: true };
    },
  };
}
