# Ship an MCP App with Kimen

[MCP Apps](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
(SEP-1865, stable revision `2026-01-26`) lets an MCP tool ship an
interactive UI: the tool predeclares a `ui://` resource, the host resolves
and audits it, embeds it, and delivers tool results to it over JSON-RPC 2.0
on `postMessage`. `@kimen/adapter-mcp-apps` packages a Kimen
surface as exactly that resource — one self-contained HTML document whose only
render path is the guarded renderer over the neutral
[UI spec](./ui-spec.md). The catalog and the `ki-*` elements are the durable
assets; the adapter is **disposable by design**: the exact supported protocol
revision lives in [`COMPAT.md`](../../packages/adapter-mcp-apps/COMPAT.md),
and a breaking protocol release is absorbed there or retires the package,
never touching core.

This guide covers both halves: the MCP server that declares and serves the
surface, and the surface document that renders results and returns actions.

## The flow

```
tool call ──▶ host resolves the tool's declared ui:// resource
                │  audits the self-contained document, caches it
                ▼
        embedded surface document ──▶ ui/initialize (request) ──▶ host
                                  ◀── McpUiInitializeResult (version, hostContext)
                                  ──▶ ui/notifications/initialized
                                          │
host delivers the tool result ──▶ ui/notifications/tool-result ──▶ guarded renderer ──▶ ki-* tree
                                          │
user activates a declared action ◀────────┘
        └──▶ tools/call kimen_surface_action ──▶ host audit path ──▶ server
```

Every message crosses MCP's JSON-RPC base protocol; the host mediates both
directions.

## Server side: declare, serve, return

Four functions cover the whole server obligation:

```ts
import {
  createKimenSurfaceResource,
  declareActionTool,
  declareToolSurface,
  surfaceToolResult,
} from '@kimen/adapter-mcp-apps';
```

**Declare the surface on the tool.** `declareToolSurface(name)` returns the
`_meta` fragment that points the host at the resource:

```ts
const tool = {
  name: 'check_inventory',
  description: 'Current stock levels',
  _meta: declareToolSurface('inventory'), // { ui: { resourceUri: 'ui://kimen/inventory' } }
};
```

**Serve the predeclared resource.** However your MCP framework registers
resources, answer a read of that URI with `createKimenSurfaceResource`:

```ts
const resource = createKimenSurfaceResource('inventory');
resource.uri;      // 'ui://kimen/inventory'
resource.mimeType; // 'text/html;profile=mcp-app'
resource.text;     // the self-contained HTML document
resource._meta;    // { ui: { csp: { connectDomains: [], resourceDomains: [] } } }
```

The call is deterministic — the same packaged document every time — so a
host's audit of a cached resource stays valid.

**Register the action tool.** Declared actions reach your server as a
standard `tools/call` to one app-only tool, `kimen_surface_action`, with
arguments `{ action, data }`. `declareActionTool(name)` returns its
definition with `_meta.ui.visibility: ["app"]`, so the host keeps it out of
the agent's tool list and accepts calls to it only from the app:

```ts
const actionTool = declareActionTool('inventory');
// { name: 'kimen_surface_action', inputSchema: {...}, _meta: { ui: { resourceUri, visibility: ['app'] } } }
```

Validate `action` in its handler: the surface never sends an undeclared
action, but your server is the authority. The handler may return another
`surfaceToolResult`; the surface renders it through the same guarded path.

**Return tool results through the surface.** `surfaceToolResult` wraps a
neutral UI spec together with a text fallback:

```ts
const result = surfaceToolResult(
  {
    version: 1,
    actions: ['refresh-inventory'],
    root: {
      component: 'ki-card',
      slots: {
        header: ['Inventory'],
        '': [
          {
            component: 'ki-list',
            slots: {
              '': [
                {
                  component: 'ki-list-item',
                  slots: {
                    '': ['SKU-104 — Field jacket'],
                    end: [
                      {
                        component: 'ki-badge',
                        props: { tone: 'success' },
                        slots: { '': ['12 in stock'] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        footer: [
          {
            component: 'ki-button',
            props: { variant: 'secondary' },
            action: 'refresh-inventory',
            slots: { '': ['Refresh'] },
          },
        ],
      },
    },
  },
  'SKU-104 (Field jacket): 12 in stock.',
);
```

The returned `CallToolResult` carries the spec under
`structuredContent.kimenSurface.spec` — structured data for the UI, not for
the model — and the fallback as ordinary `content` text. A host **without** interactive surfaces
still gets a usable answer from the text; the fallback is data, never an
alternate render path. Compose the spec from the generated catalog —
components, props and slots are queryable at runtime via `catalogData` from
`@kimen/catalog`, and `validateUiSpec` gives you the same verdict the surface
will reach before you ship a spec shape (see
[the UI-spec guide](./ui-spec.md)).

## The surface document

`createKimenSurfaceResource` serves a generated, committed document
(exported as `SURFACE_DOCUMENT`) with these properties:

- **Self-contained.** Every script and style is inline; the guarded renderer
  and the catalog validator are bundled into one `<script>`. Nothing is
  fetched.
- **No external origin, by policy and by content.** The document's CSP is
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
  img-src data:; base-uri 'none'; form-action 'none'`, and its declared
  SEP-1865 content policy (`_meta.ui.csp`) has empty allowlists. This is
  defense in depth: the document stays safe by construction even if the host
  does not enforce the policy.
- **Origin-checked channel.** The document accepts only messages whose
  `source` is the embedding frame — a well-formed tool result (or a forged
  handshake answer) posted by a sibling frame or an embedded third party is
  ignored. Replies are addressed to the origin the host spoke from, once it
  has one.
- **Opens the handshake.** On load it sends the `ui/initialize` request and
  renders nothing until the host's result negotiates a supported version;
  then it sends `ui/notifications/initialized` and reports its size with
  `ui/notifications/size-changed`.

One declared v1 boundary matters to integrators: the bundled document embeds
the guarded **render path**, not the `ki-*` element definitions — registration
and theming stay out of it to keep the document deterministic and small. The
rendered tree is real `ki-*` markup either way; hosts and custom documents
that load `@kimen/elements` and the token stylesheets get the fully styled
components.

## Inside the surface: the bridge

The bundled document wires itself. Reach for `createSurfaceBridge` when you
build a **custom** surface document — for example one that also registers the
elements and loads tokens — and need the same guarantees:

```ts
import { createSurfaceBridge } from '@kimen/adapter-mcp-apps';

const bridge = createSurfaceBridge({
  surface: document.querySelector('#kimen-surface'),
  send: (message) => window.parent.postMessage(message, hostOrigin),
  onRefusal: (refusal) => console.warn(refusal), // { reason, detail, value? }
});

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return; // only the embedding host may drive
  bridge.receive(event.data);
});

bridge.start(); // sends ui/initialize
```

`receive` handles one inbound message:

- The host's answer to `ui/initialize` completes the handshake when it
  negotiates a supported `protocolVersion` (`bridge.state` becomes
  `'ready'`); any other version, or an error answer, refuses the connection
  naming the supported set, and nothing renders afterwards.
- Before `'ready'`, host notifications are refused (`not-initialized`) and
  never become state.
- A `ui/notifications/tool-result` renders
  `params.structuredContent.kimenSurface.spec` through the guarded renderer.
  A refused spec — unknown component, undeclared prop, executable URL scheme,
  tripped budget, version skew — produces machine-readable refusals and
  leaves the previously rendered state intact.
- `ui/resource-teardown` and `ping` are answered with `{}`; any other host
  request gets JSON-RPC error `-32601`.
- A message **without** the JSON-RPC 2.0 envelope (a raw string, a null, a
  batch, anything malformed) is not protocol traffic: it is ignored with no
  state change, `{ handled: false }`.

`dispatch` sends one action to the host — and only a **declared** one. The
accepted spec's `actions` list becomes the outbound allowlist, so a surface
whose spec declares only `refresh-inventory` can never emit
`transfer-funds`:

```ts
bridge.dispatch('refresh-inventory');            // { sent: true } → tools/call to the host
bridge.dispatch('transfer-funds');               // { sent: false, refusal: { reason: 'undeclared-action', ... } }
```

User activation of a rendered, action-bound control dispatches through the
same path automatically; the host receives
`{ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'kimen_surface_action', arguments: { action, data } } }`
and mediates its own audit/consent step before anything reaches the server.
The tool name is a constant of the adapter: a spec can choose which declared
action fires, never which tool is called.

## Host negotiation

The adapter pins the exact MCP Apps revision(s) it supports —
`MCP_APPS_PROTOCOL_VERSIONS`, human-readable in
[`COMPAT.md`](../../packages/adapter-mcp-apps/COMPAT.md). A host announcing
anything else is refused at the `ui/initialize` handshake, never guessed at.
The same check is available directly:

```ts
import { negotiateProtocolVersion } from '@kimen/adapter-mcp-apps';

const outcome = negotiateProtocolVersion(hostAnnouncedVersion);
if (!outcome.ok) {
  // outcome.refusal names the announced version and the supported set;
  // no surface renders under an undeclared version.
}
```

The protocol constants are exported for hosts and tests that speak the wire
format directly: `JSONRPC_VERSION` (`'2.0'`), the `METHOD_*` names
(`METHOD_INITIALIZE` = `'ui/initialize'`, `METHOD_TOOL_RESULT` =
`'ui/notifications/tool-result'`, `METHOD_TOOLS_CALL` = `'tools/call'`, ...),
`KIMEN_ACTION_TOOL` (`'kimen_surface_action'`), `KIMEN_SURFACE_KEY`
(`'kimenSurface'`), `UI_SCHEME` (`'ui://'`), `SURFACE_MIME_TYPE`
(`'text/html;profile=mcp-app'`), plus `surfaceResourceUri(name)`,
`isSupportedProtocolVersion(version)` and `parseJsonRpcMessage(message)`.

## Why this is safe

The surface owns no render path besides the guarded renderer, so the four
guardrail invariants are enforced once, at one boundary: only catalog
components render, only declared actions dispatch, unknown props are
rejected, and no code path executes from message data. Markup smuggled into
result text stays inert text; an `iframe` node or an `onclick` prop refuses
the render fail-closed with the offender named; a hostile message without the
envelope never becomes state. Transport and iframe sandboxing remain the
host's obligation — the document is safe by construction regardless.

## Related

- [`@kimen/adapter-mcp-apps` README](../../packages/adapter-mcp-apps/README.md)
  — package reference and safety model.
- [`COMPAT.md`](../../packages/adapter-mcp-apps/COMPAT.md) — supported
  protocol revisions, document contents, declared v1 boundaries.
- [The UI-spec format](./ui-spec.md) — the document every tool result
  carries.
- [Build an A2UI host with Kimen](./a2ui-host.md) — the same guardrail behind
  a different protocol.
