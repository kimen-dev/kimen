/**
 * The surface-side bridge (spec 030): the boundary where untrusted MCP Apps
 * protocol traffic meets the guarded renderer. It owns no render path of its
 * own — every surface mutation is a call to the injected guarded renderer
 * (default `renderUiSpec`), so a test can substitute a double and prove the
 * guarantee.
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
 * - A declared action leaves as a standard `tools/call` (apps.mdx:493-495,
 *   1336-1338, 1490) to the adapter's fixed app-only action tool. Undeclared
 *   actions never leave (S6).
 */
import type { ActionEvent, RenderBudgets, RenderOptions, RenderResult } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';

import type {
  Implementation,
  JsonRpcMessage,
  RequestId,
  SurfaceOutboundMessage,
} from './protocol.js';
import {
  JSONRPC_METHOD_NOT_FOUND,
  JSONRPC_VERSION,
  KIMEN_ACTION_TOOL,
  KIMEN_SURFACE_KEY,
  MCP_APPS_PROTOCOL_VERSIONS,
  METHOD_HOST_CONTEXT_CHANGED,
  METHOD_INITIALIZE,
  METHOD_INITIALIZED,
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

/**
 * The surface's `appInfo` in `ui/initialize`. `version` is the adapter
 * version of the `COMPAT.md` row; `resource.spec.ts` (S9) fails on drift.
 */
export const KIMEN_APP_INFO: Implementation = {
  name: 'kimen-surface',
  version: '0.0.0',
};

/** The guarded-renderer contract the bridge depends on (injection seam, S4/S5). */
export type GuardedRender = (input: unknown, options: RenderOptions) => RenderResult;

/** Where the surface is in the MCP Apps lifecycle. */
export type SurfaceState = 'closed' | 'idle' | 'initializing' | 'ready' | 'refused';

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
  /** Attempts to send one action to the host; only declared actions leave, only once ready (S6). */
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
  /** Guarded renderer; defaults to `renderUiSpec`. The bridge mutates the DOM only through it. */
  readonly render?: GuardedRender;
  /** Receives every refusal (unknown component, undeclared prop or action, version skew, ...). */
  readonly onRefusal?: (refusal: BridgeRefusal) => void;
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

/** The declared action set the surface spec commits to (the outbound allowlist). */
function declaredActionsOf(spec: unknown): ReadonlySet<string> {
  if (isRecord(spec) && Array.isArray(spec['actions'])) {
    return new Set(
      spec['actions'].filter((action): action is string => typeof action === 'string'),
    );
  }
  return new Set();
}

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
  const render: GuardedRender = options.render ?? renderUiSpec;
  const supported = options.supportedVersions ?? MCP_APPS_PROTOCOL_VERSIONS;
  const appInfo = options.appInfo ?? KIMEN_APP_INFO;

  let state: SurfaceState = 'idle';
  let hostContext: Readonly<Record<string, unknown>> = {};
  let declaredActions: ReadonlySet<string> = new Set();
  let nextId = 1;
  let initializeId: RequestId | undefined;
  /** Outstanding `tools/call` requests, by id: only their responses are accepted. */
  const pendingActions = new Map<RequestId, string>();
  let lastSize: { width: number; height: number } | undefined;
  let sentSize: { width: number; height: number } | undefined;

  const report = (refusal: BridgeRefusal): void => {
    options.onRefusal?.(refusal);
  };

  const refuse = (refusal: BridgeRefusal): ReceiveResult => {
    report(refusal);
    return { handled: true, ok: false, refusals: [refusal] };
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

  const dispatch = (
    action: string,
    data: Readonly<Record<string, boolean | number | string>> = {},
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
    pendingActions.set(id, action);
    // `tools/call` (apps.mdx:493-495): the host proxies it to the server and
    // MUST reject it unless the tool's visibility includes "app" (:399-400).
    // The tool name is the adapter's constant, never spec data.
    options.send({
      id,
      jsonrpc: JSONRPC_VERSION,
      method: METHOD_TOOLS_CALL,
      params: { arguments: { action, data }, name: KIMEN_ACTION_TOOL },
    });
    return { sent: true };
  };

  const onAction = (event: ActionEvent): void => {
    dispatch(event.action, event.data);
  };

  /**
   * Renders a `CallToolResult` through the guarded renderer. The only render
   * input is `structuredContent.kimenSurface.spec` ("structured data optimized
   * for UI rendering", apps.mdx:1474); `content` text is never rendered.
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

    const renderOptions: RenderOptions = {
      onAction,
      surface: options.surface,
      ...(options.budgets !== undefined ? { budgets: options.budgets } : {}),
      ...(options.catalogSchemaVersion !== undefined
        ? { catalogSchemaVersion: options.catalogSchemaVersion }
        : {}),
    };

    const rendered = render(spec, renderOptions);
    if (!rendered.ok) {
      // The guardrail refused hostile content (unknown component, undeclared
      // prop, version skew, budget) fail-closed and atomic: nothing rendered,
      // so every component that DID render is a catalog component (S4). Each
      // diagnostic is an observable, inert refusal.
      const refusals = rendered.diagnostics.map((diagnostic) => ({
        detail: diagnostic.message,
        reason: diagnostic.rule,
        value: diagnostic.value,
      }));
      refusals.forEach(report);
      return { handled: true, ok: false, refusals };
    }

    // On success the accepted spec's declared actions become the outbound
    // allowlist; a later dispatch outside it is refused (S6).
    declaredActions = declaredActionsOf(spec);
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
    state = 'ready';
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
      if (message.id === null || !pendingActions.has(message.id)) {
        return IGNORED;
      }
      const action = pendingActions.get(message.id);
      pendingActions.delete(message.id);
      if (message.kind === 'error') {
        return refuse({
          detail: `host rejected action "${String(action)}": ${message.error.message}`,
          reason: 'action-failed',
          value: action,
        });
      }
      if (message.result['isError'] === true) {
        return refuse({
          detail: `tool "${KIMEN_ACTION_TOOL}" reported an error for action "${String(action)}"`,
          reason: 'action-failed',
          value: action,
        });
      }
      // "Views can request fresh data by calling tools" (apps.mdx:1477-1488):
      // a response that carries a surface re-renders through the same path.
      return renderToolResult(message.result, false);
    }

    switch (message.method) {
      case METHOD_TOOL_RESULT:
        return renderToolResult(message.params, true);
      case METHOD_HOST_CONTEXT_CHANGED:
        hostContext = { ...hostContext, ...message.params };
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
