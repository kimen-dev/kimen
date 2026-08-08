# Ship an MCP App with Kimen

[MCP Apps](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
(SEP-1865) lets an MCP tool ship an interactive UI: the tool predeclares a
`ui://` resource, the host resolves and audits it, embeds it, and delivers
tool results to it over JSON-RPC. `@kimen/adapter-mcp-apps` packages a Kimen
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
        embedded surface document ──▶ posts ui/ready to its host
                                          │
host delivers the tool result ──▶ ui/toolResult ──▶ guarded renderer ──▶ ki-* tree
                                          │
user activates a declared action ◀────────┘
        └──▶ ui/action ──▶ host audit path ──▶ server
```

Every message crosses MCP's JSON-RPC base protocol; the host mediates both
directions.

## Server side: declare, serve, return

Three functions cover the whole server obligation:

```ts
import {
  createKimenSurfaceResource,
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

The returned object carries the spec under `_meta.ui.surface.spec` and the
fallback as ordinary `content` text. A host **without** interactive surfaces
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
- **Origin-checked channel.** The document renders only messages whose
  `source` is the embedding frame — a well-formed `ui/toolResult` posted by a
  sibling frame or an embedded third party is ignored. Replies are addressed
  to the origin the host spoke from, once it has one.
- **Announces readiness.** On load it posts `ui/ready`, telling the host it
  may deliver the first result.

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
```

`receive` handles one inbound message:

- A `ui/toolResult` envelope renders `params.surface.spec` through the
  guarded renderer. A refused spec — unknown component, undeclared prop,
  executable URL scheme, tripped budget, version skew — produces
  machine-readable refusals and leaves the previously rendered state intact.
- A message **without** the JSON-RPC envelope (a raw string, a null, anything
  malformed) is not protocol traffic: it is ignored with no state change,
  `{ handled: false }`.
- A tool result declaring an unsupported `protocolVersion` is refused naming
  the supported set.

`dispatch` sends one action to the host — and only a **declared** one. The
accepted spec's `actions` list becomes the outbound allowlist, so a surface
whose spec declares only `refresh-inventory` can never emit
`transfer-funds`:

```ts
bridge.dispatch('refresh-inventory');            // { sent: true } → ui/action to the host
bridge.dispatch('transfer-funds');               // { sent: false, refusal: { reason: 'undeclared-action', ... } }
```

User activation of a rendered, action-bound control dispatches through the
same path automatically; the host receives
`{ jsonrpc: '2.0', method: 'ui/action', params: { action, data } }` and
mediates its own audit/consent step before anything reaches the server.

## Host negotiation

The adapter pins the exact MCP Apps revision(s) it supports —
`MCP_APPS_PROTOCOL_VERSIONS`, human-readable in
[`COMPAT.md`](../../packages/adapter-mcp-apps/COMPAT.md). A host announcing
anything else is refused at negotiation, never guessed at:

```ts
import { negotiateProtocolVersion } from '@kimen/adapter-mcp-apps';

const outcome = negotiateProtocolVersion(hostAnnouncedVersion);
if (!outcome.ok) {
  // outcome.refusal names the announced version and the supported set;
  // no surface renders under an undeclared version.
}
```

The protocol constants are exported for hosts and tests that speak the wire
format directly: `JSONRPC_VERSION` (`'2.0'`), `METHOD_TOOL_RESULT`
(`'ui/toolResult'`), `METHOD_ACTION` (`'ui/action'`), `UI_SCHEME` (`'ui://'`),
`SURFACE_MIME_TYPE` (`'text/html;profile=mcp-app'`), plus
`surfaceResourceUri(name)`, `isSupportedProtocolVersion(version)` and
`parseEnvelope(message)`.

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
