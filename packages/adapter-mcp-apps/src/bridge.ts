/**
 * The surface-side bridge (spec 030): the boundary where untrusted MCP Apps
 * protocol traffic meets the guarded renderer. It owns no render path of its
 * own: a full spec is judged by the guarded renderer (`preflightUiSpec`) and
 * painted by a new live surface (`createLiveSurface`, spec 035), and an update
 * is one live batch, which the live surface validates at the same boundary
 * (spec 157).
 *
 * It is the View half of the MCP Apps 2026-01-26 lifecycle
 * (`specification/2026-01-26/apps.mdx`, "Lifecycle", :1272-1383):
 *
 *   idle ──start()──▶ initializing ──host result, supported version──▶ ready
 *                         │                                              │
 *                         └─ error / unsupported version ─▶ refused      └─ ui/resource-teardown ─▶ closed
 *
 * - `start()` sends the `ui/initialize` request (apps.mdx:510-512) — the only
 *   message the surface emits before the host answers.
 * - The host's `McpUiInitializeResult` (apps.mdx:531-620) carries the
 *   negotiated `protocolVersion`; an undeclared one is refused (S8) and the
 *   surface never sends `ui/notifications/initialized`, so a conforming host
 *   never sends it anything else (apps.mdx:485).
 * - Once ready, `ui/notifications/tool-result` (apps.mdx:1145-1155) renders
 *   the `CallToolResult.structuredContent.kimenSurface.spec` through the
 *   guarded renderer; everything before `ready` is ignored and reported.
 *   When the payload also carries an `update` computed on the current page
 *   revision, the live surface applies it instead, so what the person is
 *   typing, the focus and the scroll survive; in every other case the full
 *   spec paints (spec 157).
 * - A declared action leaves as a standard `tools/call` (apps.mdx:493-495,
 *   1336-1338, 1490) to the adapter's fixed app-only action tool, naming the
 *   page revision and, when it has one, the bound node's id (spec 157).
 *   Undeclared actions never leave (S6).
 * - The host's `theme` (apps.mdx:544-545) — in the handshake result or a later
 *   `ui/notifications/host-context-changed` — is handed to the document as its
 *   color scheme (S19); any value the protocol does not define is ignored (S20).
 * - Spec 040: when the server's answer to a declared action's `tools/call`
 *   asks for it (`structuredContent.kimenAction = { action, relay: true }`,
 *   the exact action sent) and the host advertised text messages, the action
 *   is relayed to the model as one `ui/message` (apps.mdx:998-1035) whose text
 *   the adapter builds from the dispatched action and data alone (relay.ts).
 *   At most one relay per acknowledgment, never retried, never after teardown.
 */
import type {
  LiveActionEvent,
  LiveSurface,
  PreflightOptions,
  RenderBudgets,
  RenderDiagnostic,
} from '@kimen/catalog';
import { createLiveSurface, DEFAULT_RENDER_BUDGETS, preflightUiSpec } from '@kimen/catalog';

import type {
  Implementation,
  JsonRpcMessage,
  RequestId,
  SurfaceOutboundMessage,
} from './protocol.js';
import {
  JSONRPC_METHOD_NOT_FOUND,
  JSONRPC_VERSION,
  KIMEN_ACTION_KEY,
  KIMEN_ACTION_TOOL,
  KIMEN_SURFACE_KEY,
  MCP_APPS_PROTOCOL_VERSIONS,
  METHOD_HOST_CONTEXT_CHANGED,
  METHOD_INITIALIZE,
  METHOD_INITIALIZED,
  METHOD_MESSAGE,
  METHOD_PING,
  METHOD_RESOURCE_TEARDOWN,
  METHOD_SIZE_CHANGED,
  METHOD_TOOL_CANCELLED,
  METHOD_TOOL_INPUT,
  METHOD_TOOL_INPUT_PARTIAL,
  METHOD_TOOL_RESULT,
  METHOD_TOOLS_CALL,
  parseJsonRpcMessage,
} from './protocol.js';
import { formatActionRelay, RELAY_MAX_BYTES, relayBytes } from './relay.js';

type ActionData = Readonly<Record<string, boolean | number | string>>;

/**
 * Which page revisions showed each revision of one painted live surface: its
 * current live revision (shown by the current page) and, for each live
 * revision a later update replaced, the last page revision that showed it.
 */
interface PageRevisions {
  live: number;
  readonly left: Map<number, number>;
}

/** One declared action whose `tools/call` awaits the server's answer. */
interface PendingAction {
  readonly action: string;
  readonly data: ActionData;
}

/**
 * The surface's `appInfo` in `ui/initialize`. `version` is the adapter
 * version of the `COMPAT.md` row; `resource.spec.ts` (S9) fails on drift.
 */
export const KIMEN_APP_INFO: Implementation = {
  name: 'kimen-surface',
  version: '0.0.0',
};

/** Where the surface is in the MCP Apps lifecycle. */
export type SurfaceState = 'closed' | 'idle' | 'initializing' | 'ready' | 'refused';

/**
 * The color scheme a host can ask the surface to render in: the two values of
 * `McpUiHostContext.theme` (apps.mdx:544-545), which are also the two values
 * of the token contract's `data-ki-color-scheme` (@kimen/tokens).
 */
export type SurfaceColorScheme = 'dark' | 'light';

/** A machine-readable, observable refusal (FR-003/FR-004): named, inert data. */
export interface BridgeRefusal {
  readonly reason: string;
  readonly detail: string;
  readonly value?: string | undefined;
}

export interface ReceiveResult {
  /** False when the message was not protocol traffic (or not addressed to us) and was ignored (S7). */
  readonly handled: boolean;
  readonly ok: boolean;
  readonly refusals: readonly BridgeRefusal[];
}

export interface DispatchResult {
  readonly sent: boolean;
  readonly refusal?: BridgeRefusal | undefined;
}

export interface SurfaceBridge {
  /** Opens the connection: sends the `ui/initialize` request. Idempotent. */
  start(): void;
  /** Handles one inbound host message. */
  receive(message: unknown): ReceiveResult;
  /**
   * Attempts to send one action to the host, with the page revision; only
   * declared actions leave, only once ready (S6).
   */
  dispatch(
    action: string,
    data?: Readonly<Record<string, boolean | number | string>>,
  ): DispatchResult;
  /** Records the rendered size; sent as `ui/notifications/size-changed` once ready, on change. */
  reportSize(width: number, height: number): void;
  /** The current lifecycle state. */
  readonly state: SurfaceState;
  /** The host context from the handshake, merged with later changes (apps.mdx:1229). */
  readonly hostContext: Readonly<Record<string, unknown>>;
}

export interface SurfaceBridgeOptions {
  readonly surface: Element;
  /** Sends one JSON-RPC message to the host (the postMessage channel). */
  readonly send: (message: SurfaceOutboundMessage) => void;
  /** Receives every refusal (unknown component, undeclared prop or action, version skew, ...). */
  readonly onRefusal?: (refusal: BridgeRefusal) => void;
  /**
   * Receives the host's color scheme whenever the host announces one: with the
   * handshake result and on every later theme change (S19). The surface
   * document applies it to its root. Never called with a value the protocol
   * does not define, nor outside a completed handshake (S20).
   */
  readonly onColorScheme?: (scheme: SurfaceColorScheme) => void;
  readonly supportedVersions?: readonly string[];
  readonly budgets?: Partial<RenderBudgets>;
  readonly catalogSchemaVersion?: string;
  /** Overrides the `appInfo` announced in `ui/initialize`. */
  readonly appInfo?: Implementation;
}

const IGNORED: ReceiveResult = { handled: false, ok: false, refusals: [] };
const ACCEPTED: ReceiveResult = { handled: true, ok: true, refusals: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The color scheme a host context announces, or undefined when it announces
 * none this surface can honor. `theme` is host data crossing the protocol
 * boundary: only the two values the protocol defines pass, compared exactly —
 * the value is never coerced, trimmed or case-folded into one.
 */
function colorSchemeOf(context: Readonly<Record<string, unknown>>): SurfaceColorScheme | undefined {
  const theme = context['theme'];
  return theme === 'dark' || theme === 'light' ? theme : undefined;
}

/**
 * Whether the host's capabilities accept text messages from the View
 * (spec 040 D3): `hostCapabilities.message` is an object with a `text`
 * member (ext-apps `src/spec.types.ts:462-475, 523`, draft apps.mdx:776-777).
 * Anything else — absent, not an object, no `text` — is a host that did not
 * say it listens, and receives no message in the person's name.
 */
function advertisesTextMessages(capabilities: unknown): boolean {
  if (!isRecord(capabilities)) {
    return false;
  }
  const message = capabilities['message'];
  return isRecord(message) && isRecord(message['text']);
}

/** The declared action set the surface spec commits to (the outbound allowlist). */
function declaredActionsOf(spec: unknown): ReadonlySet<string> {
  if (isRecord(spec) && Array.isArray(spec['actions'])) {
    return new Set(
      spec['actions'].filter((action): action is string => typeof action === 'string'),
    );
  }
  return new Set();
}

function sameActions(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((action) => right.has(action));
}

/**
 * The `update` of a surface payload (spec 157 FR-001), or undefined when it
 * is not `{ baseRevision, batch }` with a non-negative integer revision. The
 * batch stays untrusted: only the live surface judges it.
 */
function readUpdate(update: unknown): { baseRevision: number; batch: unknown } | undefined {
  if (!isRecord(update) || !('batch' in update)) {
    return undefined;
  }
  const baseRevision = update['baseRevision'];
  return typeof baseRevision === 'number' && Number.isSafeInteger(baseRevision) && baseRevision >= 0
    ? { baseRevision, batch: update['batch'] }
    : undefined;
}

/**
 * The bytes a full paint adds around the spec's root: it reaches the live
 * surface as one inserted node. A spec the guarded renderer accepts at its
 * byte budget must never be refused by the batch budget (spec 157 FR-011).
 */
const INSERT_ENVELOPE_BYTES =
  JSON.stringify({ ops: [{ node: null, op: 'insert' }] }).length - 'null'.length;

/**
 * Negotiates a host-announced MCP Apps protocol version against the adapter's
 * matrix (S8): an undeclared version is refused, naming the supported set — no
 * surface renders under a version the adapter did not declare.
 */
export function negotiateProtocolVersion(
  announced: string,
  supportedVersions: readonly string[] = MCP_APPS_PROTOCOL_VERSIONS,
): {
  readonly ok: boolean;
  readonly supportedVersions: readonly string[];
  readonly refusal?: BridgeRefusal;
} {
  if (supportedVersions.includes(announced)) {
    return { ok: true, supportedVersions };
  }
  return {
    ok: false,
    refusal: {
      detail: `MCP Apps protocol version "${announced}" is not supported; this adapter supports ${supportedVersions.join(', ')}`,
      reason: 'unsupported-version',
      value: announced,
    },
    supportedVersions,
  };
}

export function createSurfaceBridge(options: SurfaceBridgeOptions): SurfaceBridge {
  const supported = options.supportedVersions ?? MCP_APPS_PROTOCOL_VERSIONS;
  const appInfo = options.appInfo ?? KIMEN_APP_INFO;
  const budgets = options.budgets !== undefined ? { budgets: options.budgets } : {};
  // The catalog-schema-version gate is preflight's alone: it runs on every
  // result before anything paints or applies, with the spec's own declaration
  // first and this option as the fallback, exactly as the guarded renderer.
  const preflightOptions: PreflightOptions = {
    ...budgets,
    ...(options.catalogSchemaVersion !== undefined
      ? { catalogSchemaVersion: options.catalogSchemaVersion }
      : {}),
  };
  const specBytes = options.budgets?.maxBytes ?? DEFAULT_RENDER_BUDGETS.maxBytes;

  let state: SurfaceState = 'idle';
  let hostContext: Readonly<Record<string, unknown>> = {};
  /** The live surface painted from the last accepted full spec. */
  let live: LiveSurface | undefined;
  /** The page revisions that showed each revision of `live` (spec 162 S8). */
  let pages: PageRevisions | undefined;
  /**
   * The page revision (spec 157 FR-004): +1 per full paint and per applied
   * update, never repeated. Not the live surface's own count, which starts
   * again with every full paint.
   */
  let revision = 0;
  let declaredActions: ReadonlySet<string> = new Set();
  let nextId = 1;
  let initializeId: RequestId | undefined;
  /** Whether the host advertised text messages in its handshake result (spec 040 D3). */
  let acceptsTextMessages = false;
  /** Outstanding `tools/call` requests, by id: only their responses are accepted. */
  const pendingActions = new Map<RequestId, PendingAction>();
  /** Outstanding `ui/message` relays, by id, naming the action each relays. */
  const pendingRelays = new Map<RequestId, string>();
  let lastSize: { width: number; height: number } | undefined;
  let sentSize: { width: number; height: number } | undefined;

  const report = (refusal: BridgeRefusal): void => {
    options.onRefusal?.(refusal);
  };

  const refuse = (refusal: BridgeRefusal): ReceiveResult => {
    report(refusal);
    return { handled: true, ok: false, refusals: [refusal] };
  };

  const applyColorScheme = (context: Readonly<Record<string, unknown>>): void => {
    const scheme = colorSchemeOf(context);
    if (scheme !== undefined) {
      options.onColorScheme?.(scheme);
    }
  };

  const flushSize = (): void => {
    if (state !== 'ready' || lastSize === undefined) {
      return;
    }
    if (sentSize?.width === lastSize.width && sentSize.height === lastSize.height) {
      return;
    }
    sentSize = lastSize;
    options.send({
      jsonrpc: JSONRPC_VERSION,
      method: METHOD_SIZE_CHANGED,
      params: lastSize,
    });
  };

  /**
   * `firedOn` is the page revision the action fired on: the current one for
   * a host's own dispatch, and for a rendered node's action the one it fired
   * on, which an action the action budget held keeps (spec 162 S8).
   */
  const dispatch = (
    action: string,
    data: ActionData = {},
    node?: string,
    firedOn: number = revision,
  ): DispatchResult => {
    if (state !== 'ready') {
      const refusal: BridgeRefusal = {
        detail: `action "${action}" cannot leave a surface in state "${state}"`,
        reason: 'not-initialized',
        value: action,
      };
      report(refusal);
      return { refusal, sent: false };
    }
    if (!declaredActions.has(action)) {
      // Only declared actions leave the surface (FR-004, S6): an undeclared
      // action is refused and reported, and no message reaches the host.
      const refusal: BridgeRefusal = {
        detail: `action "${action}" is not declared by the rendered surface`,
        reason: 'undeclared-action',
        value: action,
      };
      report(refusal);
      return { refusal, sent: false };
    }
    const id = nextId++;
    // A copy: the relay (spec 040) carries exactly what this request carried,
    // even if the caller changes its object before the server answers.
    pendingActions.set(id, { action, data: { ...data } });
    // `tools/call` (apps.mdx:493-495): the host proxies it to the server and
    // MUST reject it unless the tool's visibility includes "app" (:399-400).
    // The tool name is the adapter's constant, never spec data. `id` comes
    // from the spec and `revision` from this page: nothing the person typed.
    options.send({
      id,
      jsonrpc: JSONRPC_VERSION,
      method: METHOD_TOOLS_CALL,
      params: {
        arguments: {
          action,
          data,
          ...(node === undefined ? {} : { id: node }),
          revision: firedOn,
        },
        name: KIMEN_ACTION_TOOL,
      },
    });
    return { sent: true };
  };

  /**
   * The action channel of one painted live surface. An action names the live
   * revision it fired on (spec 162 S8); `shown` gives the latest page revision
   * that showed that live revision. An update with no ops moves the page but
   * leaves the live surface as it was, so one live revision can span several
   * page revisions, all showing the same content.
   */
  const actionsOf =
    (shown: PageRevisions) =>
    (event: LiveActionEvent): void => {
      const page =
        event.revision === shown.live ? revision : (shown.left.get(event.revision) ?? revision);
      dispatch(event.action, event.data, event.id, page);
    };

  /**
   * The guardrail refused hostile content (unknown component, undeclared
   * prop, version skew, budget) fail-closed and atomic: nothing changed, so
   * every component that DID render is a catalog component (S4). Each
   * diagnostic is an observable, inert refusal.
   */
  const refuseAll = (diagnostics: readonly RenderDiagnostic[]): ReceiveResult => {
    const refusals = diagnostics.map((diagnostic) => ({
      detail: diagnostic.message,
      reason: diagnostic.rule,
      value: diagnostic.value,
    }));
    refusals.forEach(report);
    return { handled: true, ok: false, refusals };
  };

  /**
   * Paints a full spec the guarded renderer accepted: a new live surface,
   * fixed to the spec's declared actions, receives the root as one inserted
   * node in a detached container that then replaces the previous content in
   * one operation. A refused paint leaves the previous content intact.
   */
  const paint = (spec: unknown, actions: ReadonlySet<string>): ReceiveResult => {
    const mount = options.surface.ownerDocument.createElement('div');
    const shown: PageRevisions = { left: new Map(), live: 0 };
    const next = createLiveSurface({
      actions: [...actions],
      batchBudgets: { maxBytes: specBytes + INSERT_ENVELOPE_BYTES },
      onAction: actionsOf(shown),
      // The first action the action-rate budget holds (spec 162), reported
      // like every other refusal of this surface.
      onDiagnostic: (diagnostic) => {
        report({ detail: diagnostic.message, reason: diagnostic.rule, value: diagnostic.value });
      },
      surface: mount,
      ...budgets,
    });
    const root = isRecord(spec) ? spec['root'] : undefined;
    const painted = next.apply({ ops: [{ node: root, op: 'insert' }] });
    if (!painted.ok) {
      return refuseAll(painted.diagnostics);
    }
    shown.live = painted.revision;
    pages = shown;
    options.surface.replaceChildren(mount);
    live = next;
    // The accepted spec's declared actions become the outbound allowlist; a
    // later dispatch outside it is refused (S6).
    declaredActions = actions;
    revision += 1;
    return ACCEPTED;
  };

  const notApplied = (value: string, detail: string): BridgeRefusal => ({
    detail: `the update was not applied and the full spec painted instead: ${detail}`,
    reason: 'update-not-applied',
    value,
  });

  /**
   * Applies a result's update (spec 157 FR-003 step 2). Returns why it was not
   * applied, or undefined once the live surface committed it.
   */
  const applyUpdate = (raw: unknown, actions: ReadonlySet<string>): BridgeRefusal | undefined => {
    const update = readUpdate(raw);
    if (update === undefined) {
      return notApplied(
        'malformed-update',
        'it is not { baseRevision, batch } with a non-negative integer revision',
      );
    }
    if (live === undefined || update.baseRevision !== revision) {
      return notApplied(
        'stale-revision',
        `it was computed on revision ${String(update.baseRevision)}; the page is at revision ${String(revision)}`,
      );
    }
    if (!sameActions(actions, declaredActions)) {
      // The live surface's actions are fixed at its creation: only a full
      // paint can make the allowlist the actions this result declares.
      return notApplied(
        'declared-actions',
        'the full spec declares other actions than the surface was painted with',
      );
    }
    const applied = live.apply(update.batch);
    const [first] = applied.diagnostics;
    if (!applied.ok) {
      return notApplied(
        first?.rule ?? 'rejected-batch',
        first === undefined
          ? 'the live surface rejected the batch'
          : `${first.path}: ${first.message}`,
      );
    }
    if (pages !== undefined && applied.revision !== pages.live) {
      // The live revision it replaces was last shown on the current page.
      pages.left.set(pages.live, revision);
      pages.live = applied.revision;
    }
    revision += 1;
    return undefined;
  };

  /**
   * Renders a `CallToolResult` (spec 157 FR-003). The only render input is
   * `structuredContent.kimenSurface` ("structured data optimized for UI
   * rendering", apps.mdx:1474); `content` text is never rendered. The full
   * spec is judged first, so an invalid one refuses the whole result and
   * nothing changes; then its update applies when it can, and otherwise the
   * full spec paints.
   */
  const renderToolResult = (result: Record<string, unknown>, required: boolean): ReceiveResult => {
    const structured = result['structuredContent'];
    const payload = isRecord(structured) ? structured[KIMEN_SURFACE_KEY] : undefined;
    if (!isRecord(payload) || !('spec' in payload)) {
      return required
        ? refuse({
            detail: `tool result carries no Kimen surface under structuredContent.${KIMEN_SURFACE_KEY}`,
            reason: 'missing-surface',
          })
        : ACCEPTED;
    }
    const spec = payload['spec'];
    const verdict = preflightUiSpec(spec, preflightOptions);
    if (!verdict.ok) {
      return refuseAll(verdict.diagnostics);
    }
    const actions = declaredActionsOf(spec);
    if (payload['update'] !== undefined) {
      const withheld = applyUpdate(payload['update'], actions);
      if (withheld === undefined) {
        return ACCEPTED;
      }
      report(withheld);
    }
    return paint(spec, actions);
  };

  /**
   * Relays one acknowledged action to the model when the server asked for it
   * (spec 040 FR-001). Returns the refusal that withheld the relay, if any.
   * The server's answer contributes one boolean: the text is built from the
   * action and data this surface dispatched, never from the answer (FR-003).
   */
  const relayAcknowledged = (
    result: Record<string, unknown>,
    pending: PendingAction,
  ): BridgeRefusal | undefined => {
    const structured = result['structuredContent'];
    const acknowledgment = isRecord(structured) ? structured[KIMEN_ACTION_KEY] : undefined;
    if (acknowledgment === undefined) {
      // An acknowledgment without the Kimen key: the action stays between
      // surface and server, as before spec 040 (S2).
      return undefined;
    }
    if (
      !isRecord(acknowledgment) ||
      acknowledgment['action'] !== pending.action ||
      typeof acknowledgment['relay'] !== 'boolean'
    ) {
      // A relay request for some other action, or one whose `relay` is not the
      // boolean the protocol of D2 defines, relays nothing (S6).
      return {
        detail: `the server's acknowledgment of action "${pending.action}" is not a relay request for that action; nothing was relayed`,
        reason: 'relay-mismatch',
        value: pending.action,
      };
    }
    if (!acknowledgment['relay']) {
      // Acknowledged without relay: the action stays between surface and server.
      return undefined;
    }
    if (!acceptsTextMessages) {
      return {
        detail: `the host did not advertise text messages (hostCapabilities.message.text); action "${pending.action}" was not relayed`,
        reason: 'relay-unsupported',
        value: pending.action,
      };
    }
    const text = formatActionRelay(pending.action, pending.data);
    const bytes = relayBytes(text);
    if (bytes > RELAY_MAX_BYTES) {
      // Never truncated: a cut value would tell the model something the
      // person did not do (D5, S12).
      return {
        detail: `the relay of action "${pending.action}" is ${String(bytes)} bytes, above the ${String(RELAY_MAX_BYTES)}-byte bound; it was not sent`,
        reason: 'relay-too-large',
        value: pending.action,
      };
    }
    const id = nextId++;
    pendingRelays.set(id, pending.action);
    options.send({
      id,
      jsonrpc: JSONRPC_VERSION,
      method: METHOD_MESSAGE,
      params: { content: [{ text, type: 'text' }], role: 'user' },
    });
    return undefined;
  };

  /**
   * The host's answer to one relay: success is silent; a denial or failure is
   * reported and never retried, so the action is never posted twice (S13).
   */
  const answerRelay = (
    message: Extract<JsonRpcMessage, { kind: 'error' | 'result' }>,
    action: string,
  ): ReceiveResult => {
    if (message.kind === 'error') {
      return refuse({
        detail: `the host did not relay action "${action}": ${message.error.message}`,
        reason: 'relay-failed',
        value: action,
      });
    }
    if (message.result['isError'] === true) {
      return refuse({
        detail: `the host reported an error relaying action "${action}"`,
        reason: 'relay-failed',
        value: action,
      });
    }
    return ACCEPTED;
  };

  const respond = (id: RequestId, error?: { code: number; message: string }): void => {
    options.send(
      error === undefined
        ? { id, jsonrpc: JSONRPC_VERSION, result: {} }
        : { error, id, jsonrpc: JSONRPC_VERSION },
    );
  };

  const completeHandshake = (message: JsonRpcMessage): ReceiveResult => {
    if (message.kind === 'error') {
      state = 'refused';
      return refuse({
        detail: `host rejected ui/initialize: ${message.error.message}`,
        reason: 'initialize-failed',
        value: String(message.error.code),
      });
    }
    if (message.kind !== 'result') {
      return IGNORED;
    }
    const version = message.result['protocolVersion'];
    if (typeof version !== 'string') {
      state = 'refused';
      return refuse({
        detail: 'McpUiInitializeResult carries no protocolVersion',
        reason: 'invalid-initialize-result',
      });
    }
    const negotiation = negotiateProtocolVersion(version, supported);
    if (!negotiation.ok) {
      // S8: refuse naming the supported set, and never confirm the
      // handshake — the host then may not send the surface anything.
      state = 'refused';
      return negotiation.refusal ? refuse(negotiation.refusal) : IGNORED;
    }
    const context = message.result['hostContext'];
    hostContext = isRecord(context) ? { ...context } : {};
    acceptsTextMessages = advertisesTextMessages(message.result['hostCapabilities']);
    state = 'ready';
    // Before the confirmation leaves: the document is in the host's scheme by
    // the time the host may send it anything to render.
    applyColorScheme(hostContext);
    options.send({
      jsonrpc: JSONRPC_VERSION,
      method: METHOD_INITIALIZED,
      params: {},
    });
    flushSize();
    return ACCEPTED;
  };

  const receiveReady = (message: JsonRpcMessage): ReceiveResult => {
    if (message.kind === 'request') {
      if (message.method === METHOD_RESOURCE_TEARDOWN) {
        // apps.mdx:1171-1202: answer with an empty result; nothing leaves after.
        state = 'closed';
        declaredActions = new Set();
        // Nothing relays after teardown (spec 040 S14): late answers are ignored.
        pendingActions.clear();
        pendingRelays.clear();
        respond(message.id);
        return ACCEPTED;
      }
      respond(message.id, {
        code: JSONRPC_METHOD_NOT_FOUND,
        message: `method "${message.method}" is not supported by this surface`,
      });
      return { handled: true, ok: false, refusals: [] };
    }

    if (message.kind === 'result' || message.kind === 'error') {
      if (message.id === null) {
        return IGNORED;
      }
      const relayed = pendingRelays.get(message.id);
      if (relayed !== undefined) {
        pendingRelays.delete(message.id);
        return answerRelay(message, relayed);
      }
      const pending = pendingActions.get(message.id);
      if (pending === undefined) {
        // An answer to a request this surface never sent — e.g. the model
        // calling the app-only tool itself — never relays (spec 040 S9).
        return IGNORED;
      }
      pendingActions.delete(message.id);
      const { action } = pending;
      if (message.kind === 'error') {
        return refuse({
          detail: `host rejected action "${action}": ${message.error.message}`,
          reason: 'action-failed',
          value: action,
        });
      }
      if (message.result['isError'] === true) {
        return refuse({
          detail: `tool "${KIMEN_ACTION_TOOL}" reported an error for action "${action}"`,
          reason: 'action-failed',
          value: action,
        });
      }
      // "Views can request fresh data by calling tools" (apps.mdx:1477-1488):
      // a response that carries a surface re-renders through the same path.
      const rendered = renderToolResult(message.result, false);
      // The relay depends on the acknowledgment only, not on that re-render.
      const withheld = relayAcknowledged(message.result, pending);
      if (withheld === undefined) {
        return rendered;
      }
      report(withheld);
      return { handled: true, ok: false, refusals: [...rendered.refusals, withheld] };
    }

    switch (message.method) {
      case METHOD_TOOL_RESULT:
        return renderToolResult(message.params, true);
      case METHOD_HOST_CONTEXT_CHANGED:
        // A partial update (apps.mdx:1229): only a theme it carries is applied.
        hostContext = { ...hostContext, ...message.params };
        applyColorScheme(message.params);
        return ACCEPTED;
      case METHOD_TOOL_INPUT:
      case METHOD_TOOL_INPUT_PARTIAL:
      case METHOD_TOOL_CANCELLED:
        // Acknowledged, never rendered: the surface spec comes from the tool
        // RESULT only (a View MAY ignore partial input, apps.mdx:1140), and a
        // cancellation leaves the rendered state as it was.
        return ACCEPTED;
      default:
        return IGNORED;
    }
  };

  const receive = (raw: unknown): ReceiveResult => {
    const message = parseJsonRpcMessage(raw);
    if (message === null) {
      // Not protocol traffic: ignore it entirely — rendered state is
      // unchanged (FR-004, S7). A raw string never becomes surface state.
      return IGNORED;
    }

    if (message.kind === 'request' && message.method === METHOD_PING && state !== 'closed') {
      // `ping` is valid at any point of the connection (apps.mdx:508).
      respond(message.id);
      return ACCEPTED;
    }

    if (state === 'initializing') {
      if ((message.kind === 'result' || message.kind === 'error') && message.id === initializeId) {
        return completeHandshake(message);
      }
    }
    if (state === 'ready') {
      return receiveReady(message);
    }
    if (message.kind === 'result' || message.kind === 'error') {
      return IGNORED;
    }
    // Host traffic outside the ready state never becomes surface state: a
    // conforming host sends nothing before `initialized` (apps.mdx:485).
    return refuse({
      detail: `"${message.method}" arrived while the surface is "${state}"; it was ignored`,
      reason: state === 'refused' ? 'connection-refused' : 'not-initialized',
      value: message.method,
    });
  };

  const start = (): void => {
    if (state !== 'idle') {
      return;
    }
    state = 'initializing';
    initializeId = nextId++;
    options.send({
      id: initializeId,
      jsonrpc: JSONRPC_VERSION,
      method: METHOD_INITIALIZE,
      params: {
        // apps.mdx:512: the View MUST include its capabilities. This surface
        // registers no app tools and leaves display modes to the host.
        appCapabilities: {},
        appInfo,
        protocolVersion: supported[0] ?? MCP_APPS_PROTOCOL_VERSIONS[0] ?? '',
      },
    });
  };

  const reportSize = (width: number, height: number): void => {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) {
      return;
    }
    lastSize = { height: Math.ceil(height), width: Math.ceil(width) };
    flushSize();
  };

  return {
    dispatch,
    get hostContext() {
      return hostContext;
    },
    receive,
    reportSize,
    start,
    get state() {
      return state;
    },
  };
}
