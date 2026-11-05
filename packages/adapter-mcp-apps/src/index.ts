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
  declareActionTool,
  declareToolSurface,
  surfaceToolResult,
} from './resource.js';
export type {
  KimenActionTool,
  KimenSurfaceResource,
  SurfaceContentPolicy,
  SurfaceToolResult,
} from './resource.js';
export {
  createSurfaceBridge,
  KIMEN_APP_INFO,
  negotiateProtocolVersion,
} from './bridge.js';
export type {
  BridgeRefusal,
  DispatchResult,
  GuardedRender,
  ReceiveResult,
  SurfaceBridge,
  SurfaceBridgeOptions,
  SurfaceState,
} from './bridge.js';
export {
  isSupportedProtocolVersion,
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
  SURFACE_MIME_TYPE,
  surfaceResourceUri,
  UI_SCHEME,
} from './protocol.js';
export type {
  ActionCallRequest,
  Implementation,
  InitializedNotification,
  InitializeRequest,
  JsonRpcMessage,
  RequestId,
  SizeChangedNotification,
  SurfaceOutboundMessage,
  SurfacePayload,
  ViewResponse,
} from './protocol.js';
export { SURFACE_DOCUMENT } from './generated/surface-document.js';
