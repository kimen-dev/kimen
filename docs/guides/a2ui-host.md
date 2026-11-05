# Build an A2UI host with Kimen

[A2UI](https://a2ui.org/) is a declarative protocol for agent-driven UI: the
agent sends messages describing a surface, the host renders it, and user
activation returns to the agent as an `action` event. `@kimen/adapter-a2ui`
is the boundary where those untrusted messages become Kimen surfaces — every
message is translated into a neutral [UI spec](./ui-spec.md) and reaches the
DOM through the guarded renderer alone. The catalog and the `ki-*` elements
are the durable assets; the adapter is **disposable by design**: the exact
supported protocol version (A2UI **v0.9.1**) lives in
[`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md), protocol churn is
absorbed inside the package, and an unabsorbable break retires it without
touching core.

This guide builds a complete host: transport wiring, the message lifecycle,
data binding, the `action` round-trip, and the degradation policy.

## The pipeline

```
agent ──(your transport)──▶ adapter.apply(message)
                                │  validate envelope + version (v0.9.1 / v0.9)
                                │  update surface state (components, data model)
                                │  translate from `root` → neutral UI spec
                                ▼
                        guarded renderer (@kimen/catalog)
                                │  catalog validation, budgets, URL policy
                                ▼
                            host surface (ki-* elements)

user activates a bound control ──▶ onAction(action, metadata?) ──▶ your transport ──▶ agent
rejected message (known surface) ──▶ onError(error) ──▶ your transport ──▶ agent
```

Transport is deliberately caller-owned: the adapter consumes already-delivered
A2UI messages (payload MIME type `application/a2ui+json` in v0.9.1) and emits
client messages to the callbacks you supply. It works identically over
WebSocket, SSE, A2A, or an in-process agent loop.

## Wiring

The adapter renders `ki-*` tags; the page registers the elements and loads
the token stylesheets (the adapter itself does neither):

```ts
import { createA2uiAdapter } from '@kimen/adapter-a2ui';
import { defineCustomElements } from '@kimen/elements/loader';
import '@kimen/tokens/css';      // onmars default theme
import '@kimen/tokens/css/base'; // page contract: color-scheme, page canvas

defineCustomElements(); // agent output can name any catalog tag, so register all

const socket = new WebSocket('wss://agent.example/session');
const send = (message: unknown) => socket.send(JSON.stringify(message));

const adapter = createA2uiAdapter({
  // One element for every surface, or a resolver per createSurface.
  surface: (surfaceId) => document.querySelector(`[data-surface="${surfaceId}"]`),
  onAction: (event, metadata) => send({ ...event, metadata }), // metadata only with sendDataModel
  onError: (error) => send(error),                             // VALIDATION_FAILED, for self-correction
  onDegradation: (report) => console.info('A2UI fallback', report),
});

socket.addEventListener('message', (message) => {
  const result = adapter.apply(JSON.parse(message.data));
  if (!result.ok) {
    // Machine-readable, inert data — render as text, never as markup.
    console.warn(result.diagnostics);
  }
});
```

The lazy loader is the right registration strategy here: an agent may emit any
subset of the catalog, so the host cannot tree-shake tags in advance. Load
`@kimen/tokens/css/base` (the page contract) or pin
`data-ki-color-scheme` — see
[Tokens & theming](../../packages/elements/docs/theming.mdx) for why skipping
both is the one combination the library cannot render legibly in dark scheme.

`createA2uiAdapter` also accepts `actions` (the declared action set),
`locale` (for `formatNumber`, `formatCurrency`, `pluralize`), `now` (the clock
for action timestamps), `budgets` (tighter render budgets),
`catalogSchemaVersion` (version-skew gate, forwarded to the renderer) and
`render` — an injection seam for the guarded renderer itself, which is how the
test suite proves every render call arrives at the guardrail and nothing
reaches the surface outside it.

## The message lifecycle

Every server message carries `"version"` (`"v0.9.1"`, or `"v0.9"`, which the
v0.9.1 schema also accepts) and exactly one message key. Every `apply` result
is an `A2uiApplyResult`: `{ ok, diagnostics, degradations }`.

### 1. `createSurface` binds a surface to the basic catalog

```json
{ "version": "v0.9.1", "createSurface": {
    "surfaceId": "checkout",
    "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
    "sendDataModel": true } }
```

The surface must be created before any other message names it, and creating
an existing surface is an error until it is deleted. The `catalogId` must name
the A2UI basic catalog (both spellings the spec uses are accepted; see
`COMPAT.md`). `theme` is accepted and ignored: appearance stays token-driven.

### 2. `updateComponents` delivers components

A2UI describes a surface as a **flat component list**: each component carries
a string `id` and its catalog type in `component`, with its properties
alongside; containers reference children by id (`child`, or `children` as a
list of ids or a template). The component with id `root` is the tree root;
until it arrives, components are buffered and nothing renders.

```json
{ "version": "v0.9.1", "updateComponents": {
    "surfaceId": "checkout",
    "components": [
      { "id": "root", "component": "Card", "child": "body" },
      { "id": "body", "component": "Column", "children": ["title", "notes", "confirm"] },
      { "id": "title", "component": "Text", "text": "Order #1042", "variant": "h2" },
      { "id": "notes", "component": "TextField", "label": "Delivery notes",
        "value": { "path": "/order/notes" }, "variant": "longText" },
      { "id": "confirm", "component": "Button", "child": "confirm-label", "variant": "primary",
        "action": { "event": { "name": "confirm-order",
                               "context": { "order": { "path": "/order/id" } } } } },
      { "id": "confirm-label", "component": "Text", "text": "Confirm order" }
    ] } }
```

The adapter translates the tree into one neutral spec — `Card` becomes
`ki-card`, `Column` contributes its children in order (the catalog has no
layout element yet), `TextField` with `longText` becomes `ki-textarea`,
`Button` becomes `ki-button` with its child text as label, `Text` becomes inert
text in the parent's slot — and hands it to the guarded renderer. A property
the basic catalog does not declare for the type rejects the message
(`unknown-property`), naming the offender. A later `updateComponents` upserts
by id and re-renders; previously delivered components persist, and a child id
that has not arrived yet simply renders nothing until it does.

### 3. `updateDataModel` revises bound values

```json
{ "version": "v0.9.1", "updateDataModel": {
    "surfaceId": "checkout", "path": "/order", "value": { "id": "1042", "notes": "Ring the doorbell" } } }
```

The data model lives in the adapter, never in the catalog. `value` replaces
(or creates) the value at `path`; an omitted `value` removes the key (for an
array element, it becomes `undefined` and the length is kept); an omitted
`path` or `/` addresses the whole model. Bindings resolve on every render: a
missing path shows the empty state. Templates (`"children": { "componentId":
"row", "path": "/items" }`) instantiate the template component once per list
item, and paths without a leading `/` inside it resolve relative to that item.
Path segments `__proto__`, `constructor` and `prototype` are rejected
(`forbidden-key`), and reads follow the model's own properties only.

### 4. `deleteSurface` drops adapter state

```json
{ "version": "v0.9.1", "deleteSurface": { "surfaceId": "checkout" } }
```

The adapter forgets the surface (its id can be created again). Teardown of the
surface *element* is the host's job — the adapter never mutates the DOM
outside the guarded renderer.

### State commits only after a successful render

An `updateComponents` or `updateDataModel` stages a candidate state,
translates, renders — and commits the candidate **only if the render
succeeds**. A rejected message therefore never poisons prior state: the
previous surface stays intact on screen and the previous components and model
remain the base for the next message. Each accepted update re-renders the
whole surface; that call lives in one module (`src/render-point.ts`) so an
incremental renderer can replace it.

## The `action` round-trip

When the user activates a control bound to a declared `action.event`, the
adapter emits the A2UI v0.9.1 client message to your `onAction` callback:

```json
{
  "version": "v0.9.1",
  "action": {
    "name": "confirm-order",
    "surfaceId": "checkout",
    "sourceComponentId": "confirm",
    "timestamp": "2026-11-05T10:00:00.000Z",
    "context": { "order": "1042" }
  }
}
```

- `sourceComponentId` is the A2UI id of the component that fired (for a
  template instance, the template component's id).
- `context` is the event's context with every binding resolved against the
  data model at activation time, in the scope of the instance that fired.
- When the surface was created with `sendDataModel: true`, the second argument
  carries `{ a2uiClientDataModel: { version, surfaces: { [surfaceId]: model } } }`
  for your transport's metadata.
- User input does not flow back into the data model yet: the guarded renderer
  only reports activations, so the context carries the values the agent last
  set (declared gap in `COMPAT.md`).

The surface's **declared action set** is fixed: pass `actions` to declare it,
or the first successful render that binds an action freezes it. A later update
binding a new action name is rejected (`undeclared-action`), so an agent
cannot smuggle `export-account-data` into a surface that only declared
`confirm-order`. An `Action.functionCall` (a local client function such as
`openUrl`) is refused: the client-function allowlist is empty by design.

## Degradation and the COMPAT policy

The compatibility matrix
([`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md), machine-readable as
`A2UI_COVERAGE`) classifies every basic-catalog type, and a test gate fails if
the two ever drift. Five classes, five behaviors:

| Class | Behavior |
| --- | --- |
| `mapped` (Card, Button, TextField, List, Tabs, …) | Renders as its neutral `ki-*` counterpart(s) |
| `inline` (Text) | No element of its own; its resolved string becomes inert text in the parent slot |
| `layout` (Row, Column) | No element of its own; its children join the parent slot in order |
| `unmapped` (Image, Icon, Modal, Slider, …) and any non-basic type | Degrades **per node** to a fixed fallback and reports the gap |
| `forbidden` (`html`, `RawHtml`, `script`, `iframe`) | The **whole message** is rejected (`forbidden-type`) — across every updated component, reachable from the root or not |

The asymmetry between the last two is deliberate: an attacker gains nothing by
preferring a forbidden type over an unmapped one, because the soft path never
applies to forbidden types. And the soft path itself carries no agent content
— the fallback is a constant catalog node (`ki-badge`, `warning` tone, the
fixed label `Unsupported component`), so a hostile payload under an unmapped
type never rides it. Each degradation reaches `onDegradation` as data:

```ts
{ surfaceId: 'checkout', componentId: 'when', componentType: 'DateTimeInput', reason: 'unmapped-type' }
```

A value that needs a client function the adapter does not evaluate (for
example `formatDate`) degrades its component the same way, with
`reason: 'unsupported-function'`; `formatString`, `formatNumber`,
`formatCurrency` and `pluralize` are evaluated. Report degradations back to
the agent over your channel so it can re-emit with supported content; the
rest of the surface renders normally.

## Diagnostics reference

`diagnostics` entries are `{ path, rule, message, value? }` — inert data,
safe to display as text. `path` is a JSON-pointer-like location
(`/version`, `/updateDataModel/path`, `/components/<id>/<property>`). Rules
produced by the adapter itself:

| Rule | Cause |
| --- | --- |
| `malformed-message` | The envelope or a component has the wrong shape (missing `version`, zero or two message keys, an undeclared envelope field, an empty component list, a component without `id` or `component`, a value that is not a literal, binding or function call) |
| `unsupported-version` | `version` outside `SUPPORTED_A2UI_VERSIONS` |
| `unsupported-catalog` | `createSurface` names a catalog other than the basic catalog |
| `surface-exists` | `createSurface` for a surface that already exists |
| `unknown-surface` | A message for a surface no `createSurface` created |
| `no-host-surface` | The `surface` resolver returned `null` |
| `forbidden-type` | A security-forbidden type anywhere in the update |
| `unknown-property` | A property the basic catalog does not declare for the type |
| `forbidden-function` | A client function that reaches a browser capability (`openUrl`) |
| `undeclared-action` | An `action.event` name outside the declared action set |
| `cycle` | A component reachable from itself through the component graph |
| `depth-budget` / `node-budget` | Nesting beyond 256 levels, or a template expansion beyond 4096 components |
| `forbidden-key` | A prototype-polluting data-model path segment |

Everything the guarded renderer rejects — invalid prop values, URL schemes,
render budgets — passes through with the renderer's own rule names; see
[the UI-spec guide](./ui-spec.md#failure-modes).

## Related

- [`@kimen/adapter-a2ui` README](../../packages/adapter-a2ui/README.md) —
  package reference and safety model.
- [`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md) — the supported
  protocol version, the full coverage matrix, lossy mappings and gaps.
- [The UI-spec format](./ui-spec.md) — the neutral document every message
  becomes.
- [Ship an MCP App with Kimen](./mcp-apps.md) — the same guardrail behind a
  different protocol.
