# Build an A2UI host with Kimen

[A2UI](https://a2ui.org/) is a declarative protocol for agent-driven UI: the
agent sends messages describing a surface, the host renders it, and user
activation returns to the agent as an `action` event. `@kimen/adapter-a2ui`
is the boundary where those untrusted messages become Kimen surfaces — every
message is translated into a neutral [UI spec](./ui-spec.md) and reaches the
DOM through the guarded renderer alone. The catalog and the `ki-*` elements
are the durable assets; the adapter is **disposable by design**: the exact
supported protocol versions (A2UI **1.0**, preferred, and **v0.9.1**) live in
[`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md), protocol churn is
absorbed inside the package, and an unabsorbable break retires it without
touching core.

This guide builds a complete host: transport wiring, the message lifecycle,
data binding, the `action` round-trip, and the degradation policy.

## The pipeline

```
agent ──(your transport)──▶ adapter.apply(message)
                                │  validate envelope against its version (1.0 / v0.9.1 / v0.9)
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
A2UI messages (payload MIME type `application/a2ui+json` in 1.0,
`application/json+a2ui` in v0.9.1) and emits client messages to the callbacks
you supply. It works identically over
WebSocket, SSE, A2A, or an in-process agent loop.

## Wiring

The adapter renders `ki-*` tags; the page registers the elements and loads
the token stylesheets (the adapter itself does neither):

```ts
import { createA2uiAdapter } from '@kimen/adapter-a2ui';
import { defineCustomElements } from '@kimen/elements/loader';
import '@kimen/tokens/css';      // onmars default theme + color-scheme
import '@kimen/tokens/css/base'; // optional page contract: page background, text, font

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
subset of the catalog, so the host cannot tree-shake tags in advance.
`@kimen/tokens/css` alone keeps the surface legible in both schemes: it
declares the `color-scheme` the tokens resolve from, as a default your page's
own `color-scheme` overrides. `@kimen/tokens/css/base` (the page contract) is
optional and paints the page background, text color and body font from
tokens; `data-ki-color-scheme` forces a scheme on the page or on the surface
element alone — see
[Tokens & theming](../../packages/elements/docs/theming.mdx).

`createA2uiAdapter` also accepts `actions` (the declared action set),
`locale` (for `formatNumber`, `formatCurrency`, `pluralize`), `now` (the clock
for action timestamps), `budgets` (tighter render budgets),
`catalogSchemaVersion` (version-skew gate, forwarded to the renderer) and
`render` — an injection seam for the guarded renderer itself, which is how the
test suite proves every render call arrives at the guardrail and nothing
reaches the surface outside it.

## The message lifecycle

Every server message carries `"version"` and exactly one message key. The
adapter reads `version` first and validates the message against that version's
shapes only: `"1.0"` for A2UI 1.0, `"v0.9.1"` or `"v0.9"` (one
payload-compatible family) for A2UI 0.9.1. A surface accepts only the version
that created it. The examples below use v0.9.1; [A2UI 1.0](#a2ui-10) lists what
changes. Every `apply` result is an `A2uiApplyResult`:
`{ ok, diagnostics, degradations }`.

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
`ki-card`, `Column` becomes `ki-stack` and `Row` becomes `ki-stack direction="row"`.
Both stacks keep their children in order. `TextField` with `longText` becomes `ki-textarea`,
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

## A2UI 1.0

1.0 is the preferred version (`PREFERRED_A2UI_VERSION`). It keeps the same
basic-catalog components and the same mapping, so a 1.0 description renders
the same catalog components as its 0.9.1 equivalent. What changes on the wire:

```json
{ "version": "1.0", "createSurface": {
    "surfaceId": "checkout",
    "catalogId": "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json",
    "dataModel": { "order": { "total": "€42.00" } },
    "components": [
      { "id": "root", "component": "Card", "child": "confirm" },
      { "id": "confirm", "component": "Button", "child": "label",
        "action": { "event": { "name": "confirm-order",
          "userMessage": "Order confirmed",
          "context": { "total": { "@path": "/order/total" } } } } },
      { "id": "label", "component": "Text", "text": "Confirm order" }
    ] } }
```

- Bindings are `{ "@path": … }` and calls `{ "@call": … }`; component envelope
  keys are `@checks`, `@accessibility`, `@catalogId` and `@metadata`. The
  0.9.1 spellings are rejected on a 1.0 surface, and the reverse.
- `createSurface` may carry the components and data model; they apply
  atomically with the creation. `theme` is gone.
- `updateDataModel` needs a `value`; `null` removes the key.
- The `action` event is written with `"version": "1.0"` and the resolved
  `userMessage`; `sendDataModel` metadata arrives as `a2uiRendererDataModel`.
- In an action context a plain object is literal data (`@@type` unescapes to
  `@type`); an unknown `@` key anywhere is rejected (`reserved-key`).
- `{ "@call": "@index", "args": { "offset": 1 } }` numbers list-template
  items.
- Every `callRendererFunction` is refused with an `INVALID_FUNCTION_CALL`
  `rendererFunctionResponse` delivered to `onFunctionResponse`; the adapter
  never calls agent functions.

Advertise both versions from `A2UI_RENDERER_CAPABILITIES`, preferred first:
each entry names the transport metadata key (`a2uiRendererCapabilities` for
1.0, `a2uiClientCapabilities` for 0.9.1) and the value to attach.

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
| `version-mismatch` | A message for a surface created with the other A2UI version |
| `unsupported-catalog` | A catalog other than the basic catalog of the message's version (`createSurface`, a 1.0 `@catalogId` or function `catalogId`) |
| `unresolved-catalog` | A 1.0 component without `@catalogId` on a surface created without a default `catalogId` |
| `reserved-type` | A 1.0 component of the reserved type `Surface` |
| `reserved-key` | An unknown `@`-prefixed key in a 1.0 value |
| `invalid-function-call` | A 1.0 `callRendererFunction` (always refused) |
| `unexpected-message` | A 1.0 `agentFunctionResponse` (the adapter never calls agent functions) |
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
  protocol versions, the coverage matrix of each, lossy mappings and gaps.
- [The UI-spec format](./ui-spec.md) — the neutral document every message
  becomes.
- [Ship an MCP App with Kimen](./mcp-apps.md) — the same guardrail behind a
  different protocol.
