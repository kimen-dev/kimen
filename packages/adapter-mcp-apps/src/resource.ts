/**
 * The host-facing MCP Apps surface (spec 030 FR-002/FR-005): a tool declares a
 * Kimen surface, the host resolves it to a predeclared `ui://` resource — one
 * self-contained HTML document embedding the guarded renderer — audits and
 * caches it, then renders tool results through it. Every result also carries
 * text content so a host without interactive surfaces still gets a usable
 * answer. Nothing here renders; the document's only render path is the guarded
 * renderer over the neutral catalog.
 */
import { SURFACE_DOCUMENT } from './generated/surface-document.js';
import {
  KIMEN_ACTION_TOOL,
  KIMEN_SURFACE_KEY,
  SURFACE_MIME_TYPE,
  surfaceResourceUri,
} from './protocol.js';

/**
 * The surface's declared content policy (SEP-1865 `_meta.ui.csp`): empty
 * allowlists — the document performs no network I/O, so no external origin is
 * ever referenced (FR-002/FR-007, S2).
 */
export interface SurfaceContentPolicy {
  readonly connectDomains: readonly string[];
  readonly resourceDomains: readonly string[];
}

const NO_NETWORK_POLICY: SurfaceContentPolicy = {
  connectDomains: [],
  resourceDomains: [],
};

/** The predeclared `ui://` resource a host resolves, audits, caches and renders. */
export interface KimenSurfaceResource {
  readonly uri: string;
  readonly name: string;
  readonly mimeType: string;
  /** The self-contained HTML document — all scripts and styles inline (S1/S2). */
  readonly text: string;
  readonly _meta: { readonly ui: { readonly csp: SurfaceContentPolicy } };
}

/**
 * Builds the predeclared surface resource. Deterministic: the same packaged
 * document every time, so a host's audit of a cached resource stays valid
 * (S2 edge case).
 */
export function createKimenSurfaceResource(name = 'surface'): KimenSurfaceResource {
  return {
    _meta: { ui: { csp: NO_NETWORK_POLICY } },
    mimeType: SURFACE_MIME_TYPE,
    name,
    text: SURFACE_DOCUMENT,
    uri: surfaceResourceUri(name),
  };
}

/**
 * The `_meta` fragment a tool sets to declare its Kimen surface (S1): the host
 * resolves `ui.resourceUri` to the predeclared resource above.
 */
export function declareToolSurface(name = 'surface'): {
  readonly ui: { readonly resourceUri: string };
} {
  return { ui: { resourceUri: surfaceResourceUri(name) } };
}

/**
 * The app-only tool that receives every declared action of a Kimen surface
 * (spec 030 S6). Register it on the same MCP server as the surface tool and
 * validate `action` server-side: the surface only sends actions its rendered
 * spec declared, but the server is the authority.
 */
export interface KimenActionTool {
  readonly name: typeof KIMEN_ACTION_TOOL;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: {
      readonly action: { readonly type: 'string' };
      readonly data: {
        readonly type: 'object';
        readonly additionalProperties: { readonly type: readonly string[] };
      };
    };
    readonly required: readonly ['action'];
    readonly additionalProperties: false;
  };
  readonly _meta: {
    readonly ui: {
      readonly resourceUri: string;
      readonly visibility: readonly ['app'];
    };
  };
}

/**
 * Declares the action tool for a surface. `visibility: ["app"]` keeps it out
 * of the agent's tool list and limits callers to the app on this server
 * connection (SEP-1865 2026-01-26, apps.mdx:395-402); the surface reaches it
 * with a standard `tools/call` (apps.mdx:1490).
 */
export function declareActionTool(name = 'surface'): KimenActionTool {
  return {
    _meta: {
      ui: { resourceUri: surfaceResourceUri(name), visibility: ['app'] },
    },
    description: 'Receives a declared action from a Kimen surface. App-only; not for the model.',
    inputSchema: {
      additionalProperties: false,
      properties: {
        action: { type: 'string' },
        data: {
          additionalProperties: { type: ['boolean', 'number', 'string'] },
          type: 'object',
        },
      },
      required: ['action'],
      type: 'object',
    },
    name: KIMEN_ACTION_TOOL,
  };
}

/** A `CallToolResult` carrying both the renderable surface payload and its text fallback. */
export interface SurfaceToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
  readonly structuredContent: {
    readonly kimenSurface: { readonly spec: unknown };
  };
}

/**
 * Wraps a neutral UI spec as a tool result (FR-005). The spec travels in
 * `structuredContent` — "structured data optimized for UI rendering (not
 * added to model context)" (apps.mdx:1474) — and is what the surface renders
 * when the host forwards it as `ui/notifications/tool-result`; `content`
 * carries the same outcome as text for the model and for hosts without
 * interactive surfaces (apps.mdx:1473, 1559). The text fallback is data — it
 * is never an alternate render path.
 */
export function surfaceToolResult(spec: unknown, textFallback: string): SurfaceToolResult {
  return {
    content: [{ text: textFallback, type: 'text' }],
    structuredContent: { [KIMEN_SURFACE_KEY]: { spec } },
  };
}
