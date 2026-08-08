# Build an A2UI host with Kimen

[A2UI](https://a2ui.org/) is a declarative protocol for agent-driven UI: the
agent sends messages describing a surface, the host renders it, and user
activation returns to the agent as a `userAction`. `@kimen/adapter-a2ui` is
the boundary where those untrusted messages become Kimen surfaces — every
message is translated into a neutral [UI spec](./ui-spec.md) and reaches the
DOM through the guarded renderer alone. The catalog and the `ki-*` elements
are the durable assets; the adapter is **disposable by design**: the exact
supported protocol version lives in
[`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md), protocol churn is
absorbed inside the package, and an unabsorbable break retires it without
touching core.

This guide builds a complete host: transport wiring, the message lifecycle,
the `userAction` round-trip, and the degradation policy.

## The pipeline

```
agent ──(your transport)──▶ adapter.apply(message)
                                │  validate envelope + protocol version
                                │  translate surface → neutral UI spec
                                ▼
                        guarded renderer (@kimen/catalog)
                                │  catalog validation, budgets, URL policy
                                ▼
                            host surface (ki-* elements)

user activates a bound control ──▶ onUserAction(userAction) ──▶ your transport ──▶ agent
```

Transport is deliberately caller-owned: the adapter consumes already-delivered
A2UI messages and emits `userAction` events to the channel you supply. It
works identically over WebSocket, SSE, or an in-process agent loop.

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

const adapter = createA2uiAdapter({
  surface: document.querySelector('#genui'), // the host-owned element every render targets
  protocolVersion: '0.9.1',                  // the session's negotiated A2UI version
  onUserAction: (event) => socket.send(JSON.stringify(event)),
  onDegradation: (report) => console.info('unmapped A2UI type', report),
});

socket.addEventListener('message', (message) => {
  const result = adapter.apply(JSON.parse(message.data));
  if (!result.ok) {
    // Machine-readable, inert data — render as text, or feed back to the
    // agent over your channel so it can correct itself.
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

`createA2uiAdapter` also accepts `budgets` (tighter render budgets),
`catalogSchemaVersion` (version-skew gate, forwarded to the renderer) and
`render` — an injection seam for the guarded renderer itself, which is how the
test suite proves every render call arrives at the guardrail and nothing
reaches the surface outside it.

## The message lifecycle

`apply` handles the four A2UI message kinds. Every result is an
`A2uiApplyResult`: `{ ok, diagnostics, degradations }`.

### 1. `beginRendering` names the root

```json
{ "beginRendering": { "surfaceId": "checkout", "root": "card" } }
```

Registers which component will be the surface's root. Nothing renders yet —
the surface renders when components arrive.

### 2. `surfaceUpdate` delivers components

A2UI describes a surface as a **flat adjacency list**: each component carries
a string `id` and wraps exactly one component-type key; containers reference
children by id. Values that vary bind to a separate data model through
`BoundValue` objects (`literalString` and/or a JSON-pointer-style `path`).

```json
{
  "surfaceUpdate": {
    "surfaceId": "checkout",
    "components": [
      { "id": "card", "component": { "Card": {
          "children": { "explicitList": ["title", "notes", "confirm"] } } } },
      { "id": "title", "component": { "Text": {
          "text": { "literalString": "Order #1042" } } } },
      { "id": "notes", "component": { "TextField": {
          "label": { "literalString": "Delivery notes" },
          "value": { "path": "/order/notes" } } } },
      { "id": "confirm", "component": { "Button": {
          "label": { "literalString": "Confirm order" },
          "value": "1042",
          "action": { "name": "confirm-order" } } } }
    ]
  }
}
```

The adapter translates this into one neutral spec — `Card` becomes `ki-card`,
`TextField` becomes `ki-input` (its `label` routed to the `label` prop),
`Button` becomes `ki-button` with its label as slotted text, `Text` becomes
inert text in the parent's slot — and hands it to the guarded renderer.
Properties flow through under their catalog names; the adapter invents no
allowlist of its own, so a property the catalog does not declare is rejected
*at the guardrail*, naming the offender.

A later `surfaceUpdate` merges by id: it adds or replaces the named
components (optionally renaming `root`) and re-renders. Previously delivered
components persist — an incremental update revises the surface without
discarding it.

### 3. `dataModelUpdate` revises bound values

```json
{ "dataModelUpdate": { "surfaceId": "checkout", "path": "/order/notes",
    "contents": "Ring the doorbell" } }
```

Sets the model at the path and re-renders; the `TextField` above now resolves
its `value` from the model. A pathless update replaces the whole model when
`contents` is an object. Path segments `__proto__`, `constructor` and
`prototype` are rejected before any assignment (`forbidden-key`), so a message
can never reach `Object.prototype` through the adapter — and bound-path
*reads* resolve against the model's own properties only, mirroring the same
guarantee on the read side.

### 4. `deleteSurface` drops adapter state

```json
{ "deleteSurface": { "surfaceId": "checkout" } }
```

The adapter forgets the surface. Teardown of the surface *element* is the
host's job — the adapter never mutates the DOM outside the guarded renderer.

### State commits only after a successful render

A `surfaceUpdate` or `dataModelUpdate` stages a candidate state, translates,
renders — and commits the candidate **only if the render succeeds**. A
rejected message therefore never poisons prior state: the previous surface
stays intact on screen and the previous components and model remain the base
for the next message.

## The `userAction` round-trip

When the user activates a control bound to a declared action, the adapter
emits an A2UI `userAction` to your `onUserAction` callback:

```json
{
  "userAction": {
    "name": "confirm-order",
    "surfaceId": "checkout",
    "sourceComponentId": "confirm",
    "context": { "value": "1042" }
  }
}
```

- `sourceComponentId` is the A2UI id of the component that fired — the
  adapter keeps the mapping from rendered nodes back to protocol ids across
  incremental updates.
- `context` carries the activated component's already-resolved scalar values.
- Any transport timestamp or session envelope is yours to add; the adapter
  emits the protocol event and nothing else.

The surface's **declared action set is frozen at first successful render**: a
later update binding a new action name is rejected at the guardrail
(`undeclared-action`), so an agent cannot smuggle `export-account-data` into a
surface that only ever declared `confirm-order`. Dispatch itself is the
guarded renderer's single data channel — activation suppresses native defaults
and no other callback or code path runs.

## Degradation and the COMPAT policy

The compatibility matrix
([`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md), machine-readable as
`A2UI_COVERAGE`) classifies every A2UI component type, and a test gate fails
if the two ever drift. Four classes, four behaviors:

| Class | Behavior |
| --- | --- |
| `mapped` (Card, Button, TextField, …) | Renders as its neutral `ki-*` counterpart |
| `inline` (Text, Heading) | No element of its own; its resolved string becomes inert text in the parent slot |
| `forbidden` (`html`, `RawHtml`, `script`, `iframe`) | The **whole message** is rejected (`forbidden-type`) — across every updated component, reachable from the root or not |
| unmapped (anything absent from the matrix) | Degrades **per node** to a fixed fallback and reports the gap |

The asymmetry between the last two is deliberate: an attacker gains nothing by
preferring a forbidden type over an unmapped one, because the soft path never
applies to forbidden types. And the soft path itself carries no agent content
— the fallback is a constant catalog node (`ki-badge`, `warning` tone, the
fixed label `Unsupported component`), so a hostile payload under an unmapped
type never rides it. Each degradation reaches `onDegradation` as data:

```ts
{ surfaceId: 'checkout', componentId: 'when', componentType: 'DatePicker' }
```

Report it back to the agent over your channel so it can re-emit with a
supported type; the rest of the surface renders normally.

Two more declared gaps degrade loudly rather than silently:

- **Protocol version.** A message tagged with a `protocolVersion` outside the
  supported set is rejected naming the versions the adapter supports
  (`unsupported-version`). The pinned set is exported as
  `SUPPORTED_A2UI_VERSIONS` and documented in `COMPAT.md`.
- **`template` children.** A2UI's dynamic data-driven list expansion is a
  declared v1 gap: a component using it is rejected as
  `unsupported-feature`, never dropped silently.

## Diagnostics reference

`diagnostics` entries are `{ path, rule, message, value? }` — inert data,
safe to display as text. Rules produced by the adapter itself:

| Rule | Cause |
| --- | --- |
| `malformed-message` | The envelope or a component body has the wrong shape (null payload, non-array component list, missing ids, a component wrapping zero or two type keys, a non-scalar non-`BoundValue` property) |
| `unsupported-version` | `protocolVersion` outside `SUPPORTED_A2UI_VERSIONS` |
| `forbidden-type` | A security-forbidden type anywhere in the update |
| `unknown-surface` | A `dataModelUpdate` for a surface no message created, or a render with no root component |
| `unknown-node` | A child id no `surfaceUpdate` ever delivered |
| `cycle` | A component reachable from itself through the component graph |
| `depth-budget` | Nesting beyond the 256-level translation budget |
| `forbidden-key` | A prototype-polluting data-model path segment |
| `unsupported-feature` | `template` children |

Everything the guarded renderer rejects — unknown components, undeclared
props, invalid prop values, undeclared actions, URL schemes, render budgets —
passes through with the renderer's own rule names; see
[the UI-spec guide](./ui-spec.md#failure-modes).

## Related

- [`@kimen/adapter-a2ui` README](../../packages/adapter-a2ui/README.md) —
  package reference and safety model.
- [`COMPAT.md`](../../packages/adapter-a2ui/COMPAT.md) — the supported
  protocol versions and the full coverage matrix.
- [The UI-spec format](./ui-spec.md) — the neutral document every message
  becomes.
- [Ship an MCP App with Kimen](./mcp-apps.md) — the same guardrail behind a
  different protocol.
