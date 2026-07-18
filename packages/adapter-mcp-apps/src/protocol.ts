/**
 * MCP Apps protocol vocabulary (SEP-1865), isolated inside this disposable
 * adapter (constitution Art. VIII): no protocol type leaks into
 * @kimen/elements or @kimen/catalog — enforced by the `scope:adapter` module
 * boundary. MCP Apps exposes a tool's UI as a predeclared `ui://` resource (a
 * self-contained HTML document) and carries bi-directional traffic over MCP's
 * JSON-RPC base protocol: the host delivers a tool result to the surface, the
 * surface renders it through the neutral catalog, and a declared action
 * travels back over the same audited channel.
 *
 * Only the subset this adapter uses is modelled here; the exact supported
 * protocol revision is pinned in `COMPAT.md` and `MCP_APPS_PROTOCOL_VERSIONS`.
 */

/** Exact MCP Apps protocol revision(s) this adapter supports (FR-006, SC-003). */
export const MCP_APPS_PROTOCOL_VERSIONS: readonly string[] = ['2026-01-26'];

/** The `ui://` URI scheme a host resolves a Kimen surface resource through. */
export const UI_SCHEME = 'ui://';

/** MIME type of the self-contained surface resource (SEP-1865). */
export const SURFACE_MIME_TYPE = 'text/html;profile=mcp-app';

/** The JSON-RPC base protocol version every envelope carries. */
export const JSONRPC_VERSION = '2.0';

/** Host → surface: deliver a tool result to render. */
export const METHOD_TOOL_RESULT = 'ui/toolResult';

/** Surface → host: a declared action, routed through the host's audit path. */
export const METHOD_ACTION = 'ui/action';

/** The catalog-schema payload derived from a tool result — the only render input. */
export interface SurfacePayload {
  /** The neutral UI spec (validated and rendered by the guarded renderer). */
  readonly spec: unknown;
}

/** Host → surface message carrying a tool result to render. */
export interface ToolResultMessage {
  readonly jsonrpc: '2.0';
  readonly method: 'ui/toolResult';
  readonly params: { readonly surface: SurfacePayload; readonly protocolVersion?: string };
}

/** Surface → host message carrying one declared action. */
export interface ActionMessage {
  readonly jsonrpc: '2.0';
  readonly method: 'ui/action';
  readonly params: {
    readonly action: string;
    readonly data: Readonly<Record<string, boolean | number | string>>;
  };
}

/** A minimally-validated JSON-RPC envelope, or null for non-protocol traffic. */
export interface ProtocolEnvelope {
  readonly method: string;
  readonly params: Record<string, unknown>;
}

/**
 * Recognizes a JSON-RPC 2.0 envelope with a string `method` and an object
 * `params`. Anything else — a raw string, a null, a message without the
 * envelope — is NOT protocol traffic and returns null so the boundary can
 * ignore it without any state change (FR-004, S7).
 */
export function parseEnvelope(message: unknown): ProtocolEnvelope | null {
  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    return null;
  }
  const record = message as Record<string, unknown>;
  if (record['jsonrpc'] !== JSONRPC_VERSION) {
    return null;
  }
  const method = record['method'];
  const params = record['params'];
  if (
    typeof method !== 'string' ||
    params === null ||
    typeof params !== 'object' ||
    Array.isArray(params)
  ) {
    return null;
  }
  return { method, params: params as Record<string, unknown> };
}

/** The `ui://` resource URI for a named Kimen surface (e.g. `ui://kimen/surface`). */
export function surfaceResourceUri(name: string): string {
  return `${UI_SCHEME}kimen/${name}`;
}

/** True when a host-announced protocol version is one this adapter supports (S8). */
export function isSupportedProtocolVersion(version: string): boolean {
  return MCP_APPS_PROTOCOL_VERSIONS.includes(version);
}
