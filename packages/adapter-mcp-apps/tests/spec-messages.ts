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
 * adapter applies the host's `theme` (apps.mdx:544-545) and does not map host
 * style variables. `hostContext` overrides the example's context fields; pass
 * `{ theme: undefined }` for a host that announces no theme. `hostCapabilities`
 * replaces the example's capabilities (`McpUiHostCapabilities`,
 * spec.types.ts:494-523).
 */
export const initializeResult = (
  id: number | string,
  protocolVersion = STABLE_VERSION,
  hostContext: Readonly<Record<string, unknown>> = {},
  hostCapabilities: Readonly<Record<string, unknown>> = { logging: {}, serverTools: {} },
): Fixture => ({
  id,
  jsonrpc: '2.0',
  result: {
    hostCapabilities,
    hostContext: {
      containerDimensions: { maxHeight: 600, width: 400 },
      displayMode: 'inline',
      theme: 'dark',
      ...hostContext,
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
export const toolResult = (
  spec: unknown,
  text = 'Current inventory',
  update?: unknown,
): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/tool-result',
  params: {
    _meta: { source: 'inventory-api', timestamp: '2025-11-10T15:30:00Z' },
    content: [{ text, type: 'text' }],
    structuredContent: {
      [KIMEN_SURFACE_KEY]: update === undefined ? { spec } : { spec, update },
    },
  },
});

/** Host → View `ui/notifications/tool-cancelled`, after apps.mdx:1159-1166. */
export const toolCancelled = (): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/tool-cancelled',
  params: { reason: 'user action' },
});

/**
 * Host → View `ui/notifications/host-context-changed`, after apps.mdx:1221-1226:
 * a partial context update, by default the spec's own example (a theme toggle).
 */
export const hostContextChanged = (
  params: Readonly<Record<string, unknown>> = { theme: 'light' },
): Fixture => ({
  jsonrpc: '2.0',
  method: 'ui/notifications/host-context-changed',
  params,
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
 * app-only action tool (apps.mdx:370-384, 1490). The arguments also name the
 * page revision the person acted on and, when the bound node has one, its
 * stable id (spec 157 FR-007). Revision 1 is a page that painted one result.
 */
export const expectedActionCall = (
  id: number | string,
  action: string,
  data: Record<string, boolean | number | string> = {},
  where: { readonly revision: number; readonly node?: string } = { revision: 1 },
): Fixture => ({
  id,
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    arguments: {
      action,
      data,
      ...(where.node === undefined ? {} : { id: where.node }),
      revision: where.revision,
    },
    name: KIMEN_ACTION_TOOL,
  },
});

/**
 * `McpUiHostCapabilities` of a host that accepts text messages from the View
 * (spec 040 D3): `message` is `McpUiSupportedContentBlockModalities` with its
 * `text` member (spec.types.ts:462-475, 523; draft apps.mdx:776-777).
 */
export const TEXT_MESSAGE_CAPABILITIES: Readonly<Record<string, unknown>> = {
  logging: {},
  message: { text: {} },
  serverTools: {},
};

/**
 * Host → View success response to a View request: the server's
 * `CallToolResult` for a `tools/call` the host proxied (apps.mdx:1337-1342,
 * 1400-1410), or the empty result of `ui/message` (apps.mdx:1014-1019).
 */
export const resultResponse = (
  id: number | string,
  result: Readonly<Record<string, unknown>> = {},
): Fixture => ({
  id,
  jsonrpc: '2.0',
  result,
});

/**
 * Expected View → Host `ui/message` relaying one declared action (spec 040
 * FR-002): role `user` (apps.mdx:1005-1011) and `content` as an ARRAY of one
 * text block — the reference SDK's normative type (spec.types.ts:208-217) and
 * the schema its host validates against (generated/schema.ts:801-813); the
 * 2026-01-26 prose shows a single object.
 */
export const expectedMessageRequest = (id: number | string, text: string): Fixture => ({
  id,
  jsonrpc: '2.0',
  method: 'ui/message',
  params: { content: [{ text, type: 'text' }], role: 'user' },
});

/** Expected View → Host empty success result, after apps.mdx:1183-1188. */
export const expectedEmptyResult = (id: number | string): Fixture => ({
  id,
  jsonrpc: '2.0',
  result: {},
});

/** One entry of the list "tasks" (spec 157 fixtures). */
export const taskItem = (text: string, index: number): Fixture => ({
  component: 'ki-list-item',
  id: `task-${String(index)}`,
  slots: { '': [text] },
});

/**
 * A title field, an "Add" button and the list "tasks", as a server describes
 * them in a full spec (spec 157 fixtures). Every node a batch names has an id.
 */
export const tasksSpec = (
  items: readonly string[],
  actions: readonly string[] = ['add'],
): Fixture => ({
  actions: [...actions],
  root: {
    component: 'ki-stack',
    id: 'page',
    slots: {
      '': [
        {
          component: 'ki-input',
          id: 'title',
          props: { label: 'Title', name: 'title', value: '' },
        },
        { action: 'add', component: 'ki-button', id: 'add', slots: { '': ['Add'] } },
        {
          component: 'ki-list',
          id: 'tasks',
          props: { label: 'Tasks' },
          slots: { '': items.map(taskItem) },
        },
      ],
    },
  },
  version: 1,
});

/** The live batch (spec 035) that appends one item to the list "tasks". */
export const addItemBatch = (text: string, index: number): Fixture => ({
  ops: [{ node: taskItem(text, index), op: 'insert', parent: 'tasks' }],
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
