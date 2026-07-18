/**
 * @kimen/adapter-mcp-apps (spec 030, constitution Art. VIII): the MCP Apps
 * (SEP-1865) protocol adapter. It exposes Kimen surfaces to MCP Apps hosts as
 * predeclared, self-contained `ui://` resources whose only render path is the
 * guarded renderer over the neutral catalog (@kimen/catalog) — the durable
 * catalog and `ki-*` elements never learn the MCP Apps vocabulary. Disposable
 * by design: the exact supported protocol revision lives in `COMPAT.md` and
 * `MCP_APPS_PROTOCOL_VERSIONS`, and a breaking protocol release is absorbed
 * here or retires this package, never touching core.
 */
export {
  createKimenSurfaceResource,
  declareToolSurface,
  surfaceToolResult,
} from './resource.js';
export type {
  KimenSurfaceResource,
  SurfaceContentPolicy,
  SurfaceToolResult,
} from './resource.js';
export { createSurfaceBridge, negotiateProtocolVersion } from './bridge.js';
export type {
  BridgeRefusal,
  DispatchResult,
  GuardedRender,
  ReceiveResult,
  SurfaceBridge,
  SurfaceBridgeOptions,
} from './bridge.js';
export {
  isSupportedProtocolVersion,
  JSONRPC_VERSION,
  MCP_APPS_PROTOCOL_VERSIONS,
  METHOD_ACTION,
  METHOD_TOOL_RESULT,
  parseEnvelope,
  SURFACE_MIME_TYPE,
  surfaceResourceUri,
  UI_SCHEME,
} from './protocol.js';
export type {
  ActionMessage,
  ProtocolEnvelope,
  SurfacePayload,
  ToolResultMessage,
} from './protocol.js';
export { SURFACE_DOCUMENT } from './generated/surface-document.js';
