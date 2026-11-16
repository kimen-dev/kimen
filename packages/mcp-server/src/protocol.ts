/**
 * The protocol revisions this server serves (spec 038 FR-013, D4), declared
 * once here and projected in `COMPAT.md`; `tests/protocol.spec.ts` (S19)
 * fails when the matrix, this module or the running binary disagree.
 *
 * MCP revisions are negotiated by the pinned SDK
 * (`@modelcontextprotocol/server@2.4.0`): `serveStdio` serves the modern era
 * (`2026-07-28`: no `initialize`, `server/discover` plus a per-request
 * `_meta` envelope) and, by default, every legacy-era revision that opens
 * with `initialize`. The MCP Apps revision is the one the surface adapter
 * (`@kimen/adapter-mcp-apps`, its `COMPAT.md`) speaks.
 */
import { MCP_APPS_PROTOCOL_VERSIONS } from '@kimen/adapter-mcp-apps';

/** One MCP revision the server negotiates, and the SDK era it belongs to. */
export interface McpRevision {
  readonly revision: string;
  readonly era: 'legacy' | 'modern';
}

export const MCP_REVISIONS: readonly McpRevision[] = [
  { era: 'modern', revision: '2026-07-28' },
  { era: 'legacy', revision: '2025-11-25' },
  { era: 'legacy', revision: '2025-06-18' },
  { era: 'legacy', revision: '2025-03-26' },
  { era: 'legacy', revision: '2024-11-05' },
  { era: 'legacy', revision: '2024-10-07' },
];

/** The MCP Apps (SEP-1865) revision(s) the served surface speaks. */
export const MCP_APPS_REVISIONS: readonly string[] = MCP_APPS_PROTOCOL_VERSIONS;

/** The name the server announces in `serverInfo`. */
export const SERVER_NAME = 'kimen';
