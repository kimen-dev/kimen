// Wire fixtures for the MCP Apps 2026-01-26 suites (spec 030). Every message
// is copied from the stable specification — `specification/2026-01-26/apps.mdx`
// in github.com/modelcontextprotocol/ext-apps at the commit pinned in
// COMPAT.md — or from the SDK's normative types (`src/spec.types.ts`), cited
// line by line. Only the Kimen payload inside `structuredContent` and the
// concrete values are ours. Not a test file: the suites import it.
import { KIMEN_ACTION_TOOL, KIMEN_SURFACE_KEY } from '../src/index.js';

/** One wire message, as the peer would receive it from `postMessage`. */
export type Fixture = Readonly<Record<string, unknown>>;

/** The protocol version the stable revision and the SDK pin (spec.types.ts:29). */
const STABLE_VERSION = '2026-01-26';

/**
 * Host → View `McpUiInitializeResult`, after the example at apps.mdx:593-619
 * (result fields: spec.types.ts:570-584). The `styles` block is elided — the
 * adapter does not map host theming in v1.
 */
export const initializeResult = (
  id: number | string,
  protocolVersion = STABLE_VERSION,
): Fixture => ({
  id,
  jsonrpc: '2.0',
  result: {
    hostCapabilities: { logging: {}, serverTools: {} },
    hostContext: {
      containerDimensions: { maxHeight: 600, width: 400 },
      displayMode: 'inline',
      theme: 'dark',
    },
    hostInfo: { name: 'claude-desktop', version: '1.0.0' },
    protocolVersion,
  },
});

/** Host → View error response for a View request, after apps.mdx:985-993. */
export const errorResponse = (id: number | string, message: string): Fixture => ({
  error: { code: -32000, message },
  id,
  jsonrpc: '2.0',
});

/** Host → View `ui/notifications/tool-input`, after apps.mdx:1413-1422. */
export const toolInput = (): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/tool-input',
  params: { arguments: { location: 'San Francisco' } },
});

/** Host → View `ui/notifications/tool-input-partial`, after apps.mdx:1122-1130. */
export const toolInputPartial = (): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/tool-input-partial',
  params: { arguments: { location: 'San' } },
});

/**
 * Host → View `ui/notifications/tool-result` with `params: CallToolResult`,
 * after apps.mdx:1450-1468: `content` text for the model, `structuredContent`
 * for the UI (apps.mdx:1473-1475), here carrying the Kimen surface payload.
 */
export const toolResult = (spec: unknown, text = 'Current inventory'): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/tool-result',
  params: {
    _meta: { source: 'inventory-api', timestamp: '2025-11-10T15:30:00Z' },
    content: [{ text, type: 'text' }],
    structuredContent: { [KIMEN_SURFACE_KEY]: { spec } },
  },
});

/** Host → View `ui/notifications/tool-cancelled`, after apps.mdx:1159-1166. */
export const toolCancelled = (): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/tool-cancelled',
  params: { reason: 'user action' },
});

/** Host → View `ui/notifications/host-context-changed`, after apps.mdx:1221-1226. */
export const hostContextChanged = (): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/host-context-changed',
  params: { theme: 'light' },
});

/** Host → View `ui/resource-teardown` request, after apps.mdx:1173-1181. */
export const resourceTeardown = (id: number | string): Fixture => ({
  id,
  jsonrpc: '2.0',
  method: 'ui/resource-teardown',
  params: { reason: 'user closed the conversation' },
});

/** Host → View `ping` (MCP lifecycle subset, apps.mdx:505-508). */
export const ping = (id: number | string): Fixture => ({
  id,
  jsonrpc: '2.0',
  method: 'ping',
});

/**
 * Expected View → Host `ui/initialize` request: params per
 * spec.types.ts:554-564 (`appInfo`, `appCapabilities`, `protocolVersion`) and
 * apps.mdx:510-512 ("MUST include its capabilities in the appCapabilities field").
 */
export const expectedInitializeRequest = (id: number | string, version: string): Fixture => ({
  id,
  jsonrpc: '2.0',
  method: 'ui/initialize',
  params: {
    appCapabilities: {},
    appInfo: { name: 'kimen-surface', version },
    protocolVersion: STABLE_VERSION,
  },
});

/** Expected View → Host `ui/notifications/initialized` (spec.types.ts:590-593). */
export const expectedInitialized = (): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/initialized',
  params: {},
});

/**
 * Expected View → Host `tools/call` for one declared action: the standard MCP
 * request the spec shows at apps.mdx:1400-1410, aimed at the adapter's
 * app-only action tool (apps.mdx:370-384, 1490).
 */
export const expectedActionCall = (
  id: number | string,
  action: string,
  data: Record<string, boolean | number | string> = {},
): Fixture => ({
  id,
  jsonrpc: '2.0',
  method: 'tools/call',
  params: { arguments: { action, data }, name: KIMEN_ACTION_TOOL },
});

/** Expected View → Host empty success result, after apps.mdx:1183-1188. */
export const expectedEmptyResult = (id: number | string): Fixture => ({
  id,
  jsonrpc: '2.0',
  result: {},
});

/** A small catalog spec with one declared action. */
export const confirmSurface = {
  actions: ['confirm'],
  root: {
    action: 'confirm',
    component: 'ki-button',
    slots: { '': ['Confirm'] },
  },
  version: 1,
};
