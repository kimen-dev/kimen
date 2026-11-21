# @kimen/adapter-mcp-apps

The second Kimen protocol adapter (constitution Art. VIII, spec 030). It
exposes Kimen surfaces to [MCP Apps](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
(SEP-1865) hosts as predeclared, self-contained `ui://` resources whose only
render path is the guarded renderer over the neutral catalog. The catalog and
the `ki-*` elements are the durable assets; this adapter is **disposable by
design** — the exact supported protocol revision lives in [`COMPAT.md`](./COMPAT.md),
and a breaking protocol release is absorbed here or retires the package,
never touching core.

## Why it is safe

- **One render path.** The surface document embeds `renderUiSpec` from
  `@kimen/catalog` and nothing else can draw: the guardrail's four invariants
  (only catalog components render, only declared actions dispatch, unknown
  props are rejected, no code path executes from data) are enforced there,
  once (Art. I).
- **Self-contained, auditable resource.** The `ui://` document is one HTML file
  with one inline script and one inline stylesheet, and a content policy
  (`default-src 'none'`) that references no external origin and names exactly
  those two elements by digest — no other inline script, inline style or
  evaluated code is admitted. A host can audit and cache it before first
  render (verified mechanically, S2 and S21), and regeneration is
  byte-identical.
- **The document is the whole surface.** It carries the definition of every
  catalog component and the default token stylesheet, so a host that only
  speaks the protocol displays real, styled, operable `ki-*` components — an
  MCP server has nothing to add, and could not (verified in a real browser,
  S16–S18). It follows the host's light/dark theme (S19).
- **Stock glyph.** Use `name: 'circle-check'` for `ki-icon` in a stock
  `ui://` resource. The document includes that Lucide glyph at build time.
  It is the only name a spec may use, in `ki-icon` or any `icon-name`; the
  guarded renderer rejects every other name with `unavailable-icon`, even a
  glyph a component draws for its own controls.
- **Validated boundary.** Inbound host traffic is classified as JSON-RPC 2.0
  and gated by the MCP Apps lifecycle before it can affect rendering: nothing
  renders before the `ui/initialize` handshake completes, and a non-protocol
  message is ignored with no state change. Outbound traffic is limited to
  the lifecycle messages and the surface's declared actions, sent as
  `tools/call` to one app-only tool whose name the adapter fixes.

## When to use

Use this adapter when you build an MCP server whose tool results should
render as interactive Kimen surfaces in MCP Apps hosts: it produces the
predeclared `ui://` resource, the tool metadata and the tool-result envelope
on the server side, and `createSurfaceBridge` connects host traffic to the
guarded renderer inside the surface. If you control the rendering host
yourself, skip the adapter and use [`@kimen/catalog`](../catalog/README.md)
directly; if your host speaks A2UI, use
[`@kimen/adapter-a2ui`](../adapter-a2ui/README.md).

The end-to-end walkthrough — declaring the surface, serving the resource,
returning tool results and host negotiation — is
[Ship an MCP App with Kimen](../../docs/guides/mcp-apps.md).

## Usage

```ts
import {
  acknowledgeSurfaceAction,
  createKimenSurfaceResource,
  declareActionTool,
  declareToolSurface,
  surfaceToolResult,
} from '@kimen/adapter-mcp-apps';

// 1. Declare the surface on the tool, serve the predeclared resource, and
//    register the app-only tool that receives the surface's declared actions:
const tool = { name: 'inventory', _meta: declareToolSurface('inventory') };
const resource = createKimenSurfaceResource('inventory'); // { uri: 'ui://kimen/inventory', text: <self-contained html>, ... }
const actionTool = declareActionTool('inventory'); // name 'kimen_surface_action', _meta.ui.visibility ['app']

// 2. Return a tool result: a neutral spec to render + a text fallback for
//    hosts without interactive surfaces.
const result = surfaceToolResult(
  { version: 1, root: { component: 'ki-card', slots: { '': ['12 items in stock'] } } },
  '12 items in stock',
);
```

The result is a `CallToolResult`: the spec travels in
`structuredContent.kimenSurface`, the text in `content`.

```ts
// 3. Answer a declared action. Ask for relay when the person's choice needs
//    the model; leave it off for a UI-only action such as a refresh.
const answer = acknowledgeSurfaceAction('confirm-order', { relay: true });
// structuredContent.kimenAction = { action: 'confirm-order', relay: true }
```

With `relay: true`, a host that advertises text messages receives one
`ui/message` in the person's name:
`kimen-surface-action {"action":"confirm-order","data":{…}}`. The surface
builds that line from the action and data it sent — never from your answer —
escapes line breaks and direction controls, and sends nothing above 8192
bytes. Tell the model how to read it in the description of the tool that
renders the surface (spec 040).

Inside the surface document, `createSurfaceBridge` speaks the MCP Apps
2026-01-26 lifecycle: it opens with `ui/initialize`, confirms with
`ui/notifications/initialized`, renders `ui/notifications/tool-result`
through the guarded renderer, answers `ui/resource-teardown` and `ping`,
ignores non-protocol traffic, and lets only declared actions leave as
`tools/call` to `kimen_surface_action` — relayed to the model as one
`ui/message` when the server's answer asks for it. A host negotiating a protocol version
outside `COMPAT.md` is refused at the handshake. The host's `theme` reaches
the document as its color scheme: the packaged document sets it on its root
element, and a custom document receives it through the bridge's
`onColorScheme` option. The full wire table, what the document contains, its
size and its declared boundaries are in [`COMPAT.md`](./COMPAT.md).

See [Ship an MCP App with Kimen](../../docs/guides/mcp-apps.md) for the full
guide, and the [roadmap](../../docs/roadmap.md) for project context.
