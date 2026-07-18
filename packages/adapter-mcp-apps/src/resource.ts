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
import { SURFACE_MIME_TYPE, surfaceResourceUri } from './protocol.js';

/**
 * The surface's declared content policy (SEP-1865 `_meta.ui.csp`): empty
 * allowlists — the document performs no network I/O, so no external origin is
 * ever referenced (FR-002/FR-007, S2).
 */
export interface SurfaceContentPolicy {
  readonly connectDomains: readonly string[];
  readonly resourceDomains: readonly string[];
}

const NO_NETWORK_POLICY: SurfaceContentPolicy = { connectDomains: [], resourceDomains: [] };

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

/** A tool result carrying both the renderable surface payload and its text fallback. */
export interface SurfaceToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
  readonly _meta: { readonly ui: { readonly surface: { readonly spec: unknown } } };
}

/**
 * Wraps a neutral UI spec as a tool result (FR-005): the surface payload is
 * rendered by hosts with interactive surfaces, while `content` carries the
 * same outcome as text for hosts without them. The text fallback is data — it
 * is never an alternate render path.
 */
export function surfaceToolResult(spec: unknown, textFallback: string): SurfaceToolResult {
  return {
    _meta: { ui: { surface: { spec } } },
    content: [{ text: textFallback, type: 'text' }],
  };
}
