# @kimen/adapter-mcp-apps

> Kimen adapter for MCP Apps (SEP-1865): disposable by design (constitution Art. VIII). Exposes Kimen surfaces to MCP Apps hosts as predeclared, self-contained ui:// resources rendered only through the guarded renderer. Supported protocol versions live in COMPAT.md, versioned with the adapter.

## When to use

You ship an MCP server and want tool results to render as interactive Kimen surfaces in MCP Apps (SEP-1865) hosts.

## When not to use

The host is not an MCP Apps client, or you control the rendering surface directly — render neutral specs with @kimen/catalog instead.

## Entry points

- `declareToolSurface(name?) => { ui: { resourceUri } }`: Declares in an MCP tool's _meta that its results render in a predeclared ui:// surface.
- `createKimenSurfaceResource(name?) => KimenSurfaceResource`: The self-contained ui:// resource the server serves: one HTML document with every script and style inline, a no-network content policy, and the guarded renderer as its only render path.
- `surfaceToolResult(spec, textFallback, update?) => SurfaceToolResult`: Wraps a neutral UI spec plus a plain-text fallback as an MCP CallToolResult (spec in structuredContent.kimenSurface, text in content), so hosts without interactive surfaces still get text. The optional update { baseRevision, batch } is a live batch computed on the revision an action call carried: the surface applies it, keeping what the person is typing, only on that revision and when the live surface accepts it, and otherwise paints the full spec.
- `declareActionTool(name?) => KimenActionTool`: The app-only MCP tool (kimen_surface_action, _meta.ui.visibility ["app"]) that receives the surface's declared actions as tools/call { action, data, revision, id? } (the page revision the person acted on and the bound node's id; both optional in its schema); register it on the same server and validate the action.
- `acknowledgeSurfaceAction(action, options?) => SurfaceActionAcknowledgment`: The action tool's answer for an action your server accepts. With { relay: true } the surface relays that exact action to the model as one ui/message, if the host advertises text messages: one line, kimen-surface-action followed by { action, data } as escaped JSON, at most 8192 bytes, built by the surface from what it sent, never from this result. Relay when the person's choice needs the model; leave it off for UI-only actions such as a refresh.
- `createSurfaceBridge(options) => SurfaceBridge`: Runs inside the surface document and speaks the MCP Apps 2026-01-26 lifecycle: sends ui/initialize, refuses an undeclared negotiated version, renders ui/notifications/tool-result specs through the guarded renderer and its live surface only after the handshake (applying a result's update when it was computed on the current page revision), answers ui/resource-teardown and ping, and dispatches only declared actions as tools/call; when the server acknowledges one for relay and the host advertises text messages, relays it once as ui/message. Non-protocol messages are ignored with no state change.
- `MCP_APPS_PROTOCOL_VERSIONS`: The exact MCP Apps protocol revisions this adapter supports, versioned with the adapter in COMPAT.md.
