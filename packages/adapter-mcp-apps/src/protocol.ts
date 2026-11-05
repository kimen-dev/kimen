/**
 * MCP Apps protocol vocabulary (SEP-1865, stable revision 2026-01-26),
 * isolated inside this disposable adapter (constitution Art. VIII): no
 * protocol type leaks into @kimen/elements or @kimen/catalog — enforced by the
 * `scope:adapter` module boundary.
 *
 * The normative source is `specification/2026-01-26/apps.mdx` in
 * github.com/modelcontextprotocol/ext-apps (the exact commit audited is pinned
 * in `COMPAT.md`). A View (this surface document) is an MCP-style client of
 * its host over JSON-RPC 2.0 on `postMessage` (apps.mdx:413-417): it opens
 * with the `ui/initialize` request, confirms with `ui/notifications/initialized`,
 * receives tool data as `ui/notifications/tool-input` / `tool-result`
 * notifications, and reaches the server through standard `tools/call`.
 *
 * Only the subset this adapter uses is modelled here; the exact supported
 * protocol revision is pinned in `COMPAT.md` and `MCP_APPS_PROTOCOL_VERSIONS`.
 */

/**
 * Exact MCP Apps protocol revision(s) this adapter supports (FR-006, SC-003).
 * `2026-01-26` is the only stable revision (apps.mdx, "Status: Stable") and
 * the SDK's `LATEST_PROTOCOL_VERSION` (ext-apps `src/spec.types.ts:29`).
 */
export const MCP_APPS_PROTOCOL_VERSIONS: readonly string[] = ['2026-01-26'];

/** The `ui://` URI scheme a host resolves a Kimen surface resource through (apps.mdx:267). */
export const UI_SCHEME = 'ui://';

/** MIME type of the self-contained surface resource (apps.mdx:268, MUST). */
export const SURFACE_MIME_TYPE = 'text/html;profile=mcp-app';

/** The JSON-RPC base protocol version every message carries (apps.mdx:413). */
export const JSONRPC_VERSION = '2.0';

/** View → Host request opening the connection (apps.mdx:507, 510-512). */
export const METHOD_INITIALIZE = 'ui/initialize';

/** View → Host notification closing the handshake (apps.mdx:485, 507). */
export const METHOD_INITIALIZED = 'ui/notifications/initialized';

/** Host → View: complete tool arguments, sent once, before the result (apps.mdx:1106-1118). */
export const METHOD_TOOL_INPUT = 'ui/notifications/tool-input';

/** Host → View: best-effort streamed arguments; a View MAY ignore them (apps.mdx:1120-1143). */
export const METHOD_TOOL_INPUT_PARTIAL = 'ui/notifications/tool-input-partial';

/** Host → View: the tool's `CallToolResult` (apps.mdx:1145-1155). */
export const METHOD_TOOL_RESULT = 'ui/notifications/tool-result';

/** Host → View: the tool execution was cancelled (apps.mdx:1157-1169). */
export const METHOD_TOOL_CANCELLED = 'ui/notifications/tool-cancelled';

/** Host → View: partial host-context update to merge (apps.mdx:1219-1229). */
export const METHOD_HOST_CONTEXT_CHANGED = 'ui/notifications/host-context-changed';

/** Host → View request announcing teardown; answered with `{}` (apps.mdx:1171-1202). */
export const METHOD_RESOURCE_TEARDOWN = 'ui/resource-teardown';

/** View → Host: the rendered content size changed (apps.mdx:1204-1217). */
export const METHOD_SIZE_CHANGED = 'ui/notifications/size-changed';

/** View → Host: standard MCP tool call, proxied to the server (apps.mdx:493-495, 1337-1338). */
export const METHOD_TOOLS_CALL = 'tools/call';

/** Connection health check, valid in either direction (apps.mdx:508). */
export const METHOD_PING = 'ping';

/** JSON-RPC 2.0 error code: the method does not exist on this peer. */
export const JSONRPC_METHOD_NOT_FOUND = -32601;

/**
 * The app-only tool every declared action is routed to. The tool NAME is a
 * constant of this adapter, never data: the surface spec (model output) only
 * chooses the `action` argument, so a hostile spec cannot aim a click at some
 * other tool on the server. The integrator registers it with
 * `declareActionTool` (visibility `["app"]`, apps.mdx:370-384, 395-402).
 */
export const KIMEN_ACTION_TOOL = 'kimen_surface_action';

/** Key under `CallToolResult.structuredContent` that carries the surface payload (apps.mdx:1474). */
export const KIMEN_SURFACE_KEY = 'kimenSurface';

/** `Implementation` (MCP core): a peer's name and version. */
export interface Implementation {
  readonly name: string;
  readonly version: string;
}

/** A JSON-RPC request id: MCP forbids `null`. */
export type RequestId = number | string;

/** The catalog-schema payload derived from a tool result — the only render input. */
export interface SurfacePayload {
  /** The neutral UI spec (validated and rendered by the guarded renderer). */
  readonly spec: unknown;
}

/** `McpUiInitializeRequest` (ext-apps `src/spec.types.ts:554-564`). */
export interface InitializeRequest {
  readonly jsonrpc: '2.0';
  readonly id: RequestId;
  readonly method: 'ui/initialize';
  readonly params: {
    readonly appInfo: Implementation;
    /** `McpUiAppCapabilities` (apps.mdx:515-528): this surface exposes no tools. */
    readonly appCapabilities: Readonly<Record<string, unknown>>;
    readonly protocolVersion: string;
  };
}

/** `McpUiInitializedNotification` (ext-apps `src/spec.types.ts:590-593`). */
export interface InitializedNotification {
  readonly jsonrpc: '2.0';
  readonly method: 'ui/notifications/initialized';
  readonly params: Readonly<Record<string, never>>;
}

/** View → Host `tools/call` carrying one declared action (shape: apps.mdx:1400-1410). */
export interface ActionCallRequest {
  readonly jsonrpc: '2.0';
  readonly id: RequestId;
  readonly method: 'tools/call';
  readonly params: {
    readonly name: typeof KIMEN_ACTION_TOOL;
    readonly arguments: {
      readonly action: string;
      readonly data: Readonly<Record<string, boolean | number | string>>;
    };
  };
}

/** `ui/notifications/size-changed` (apps.mdx:1206-1214). */
export interface SizeChangedNotification {
  readonly jsonrpc: '2.0';
  readonly method: 'ui/notifications/size-changed';
  readonly params: { readonly width: number; readonly height: number };
}

/** A success or error response the View sends back to a host request. */
export type ViewResponse =
  | {
      readonly jsonrpc: '2.0';
      readonly id: RequestId;
      readonly result: Record<string, never>;
    }
  | {
      readonly jsonrpc: '2.0';
      readonly id: RequestId;
      readonly error: { readonly code: number; readonly message: string };
    };

/** Every message the surface may emit: lifecycle, declared actions, size, responses. */
export type SurfaceOutboundMessage =
  | ActionCallRequest
  | InitializedNotification
  | InitializeRequest
  | SizeChangedNotification
  | ViewResponse;

/** One inbound JSON-RPC 2.0 message, classified; anything else is not protocol traffic. */
export type JsonRpcMessage =
  | {
      readonly kind: 'request';
      readonly id: RequestId;
      readonly method: string;
      readonly params: Record<string, unknown>;
    }
  | {
      readonly kind: 'notification';
      readonly method: string;
      readonly params: Record<string, unknown>;
    }
  | {
      readonly kind: 'result';
      readonly id: RequestId;
      readonly result: Record<string, unknown>;
    }
  | {
      readonly kind: 'error';
      readonly id: RequestId | null;
      readonly error: { readonly code: number; readonly message: string };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRequestId(value: unknown): value is RequestId {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

/**
 * Classifies a JSON-RPC 2.0 message (request, notification, result or error).
 * Anything else — a raw string, a null, a batch array, an object without
 * `jsonrpc: "2.0"`, a method that is not a string, `params` that are not an
 * object — is NOT protocol traffic and returns null, so the boundary can ignore
 * it without any state change (FR-004, S7). `params` is optional in JSON-RPC
 * (e.g. `ui/notifications/initialized`) and normalizes to `{}`.
 */
export function parseJsonRpcMessage(message: unknown): JsonRpcMessage | null {
  if (!isRecord(message) || message['jsonrpc'] !== JSONRPC_VERSION) {
    return null;
  }
  const method = message['method'];
  if (method !== undefined) {
    const params = message['params'] ?? {};
    if (typeof method !== 'string' || !isRecord(params)) {
      return null;
    }
    if ('id' in message) {
      const id = message['id'];
      return isRequestId(id) ? { id, kind: 'request', method, params } : null;
    }
    return { kind: 'notification', method, params };
  }
  const id = message['id'];
  if ('result' in message) {
    const result = message['result'];
    return isRequestId(id) && isRecord(result) ? { id, kind: 'result', result } : null;
  }
  const error = message['error'];
  if (
    isRecord(error) &&
    typeof error['code'] === 'number' &&
    typeof error['message'] === 'string' &&
    (id === null || isRequestId(id))
  ) {
    return {
      error: { code: error['code'], message: error['message'] },
      id,
      kind: 'error',
    };
  }
  return null;
}

/** The `ui://` resource URI for a named Kimen surface (e.g. `ui://kimen/surface`). */
export function surfaceResourceUri(name: string): string {
  return `${UI_SCHEME}kimen/${name}`;
}

/** True when a host-negotiated protocol version is one this adapter supports (S8). */
export function isSupportedProtocolVersion(version: string): boolean {
  return MCP_APPS_PROTOCOL_VERSIONS.includes(version);
}
