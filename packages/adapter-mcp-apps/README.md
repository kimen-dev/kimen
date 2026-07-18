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
  with every script and style inline and a content policy (`default-src 'none'`)
  that references no external origin — a host can audit and cache it before
  first render (verified mechanically, S2).
- **Validated boundary.** Inbound host traffic is checked against the JSON-RPC
  envelope before it can affect rendering; a non-protocol message is ignored
  with no state change. Outbound traffic is limited to the surface's declared
  actions, mediated by the host.

## Usage

```ts
import {
  createKimenSurfaceResource,
  declareToolSurface,
  surfaceToolResult,
} from '@kimen/adapter-mcp-apps';

// 1. Declare the surface on the tool, and serve the predeclared resource:
const tool = { name: 'inventory', _meta: declareToolSurface('inventory') };
const resource = createKimenSurfaceResource('inventory'); // { uri: 'ui://kimen/inventory', text: <self-contained html>, ... }

// 2. Return a tool result: a neutral spec to render + a text fallback for
//    hosts without interactive surfaces.
const result = surfaceToolResult(
  { version: 1, root: { component: 'ki-card', slots: { '': ['12 items in stock'] } } },
  '12 items in stock',
);
```

Inside the surface document, `createSurfaceBridge` connects the host channel to
the guarded renderer: it renders a `ui/toolResult`, ignores non-protocol
traffic, and lets only declared actions leave as `ui/action`. A host announcing
a protocol version outside `COMPAT.md` is refused at negotiation.

See phase 5 of the [roadmap](../../docs/roadmap.md).
