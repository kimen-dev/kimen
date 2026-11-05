# @kimen/adapter-a2ui

The first Kimen protocol adapter (constitution Art. VIII, spec 029). It
translates declarative [A2UI](https://a2ui.org/) messages into Kimen's neutral
runtime catalog and renders every surface through the guarded renderer alone.
The catalog and the `ki-*` elements are the durable assets; this adapter is
**disposable by design** — the exact supported A2UI version(s) live in
[`COMPAT.md`](./COMPAT.md), protocol churn is absorbed here, and an
unabsorbable break retires the package without touching core.

## Why it is safe

The adapter owns no rendering path of its own. It builds a neutral
[`UiSpec`](../catalog/README.md) and hands it to `renderUiSpec` from
`@kimen/catalog`; the guardrail's four invariants (only catalog components
render, only declared actions dispatch, unknown props are rejected, no code
path executes from message data) are enforced there, once (Art. I). Two
complementary checks prove the adapter never opens a side channel: the static
`scope:adapter` module boundary (no other rendering library is importable) and
a runtime guarantee that every render call the adapter makes arrives at the
guarded renderer — verified by substituting an instrumented double (S12).

## When to use

Use this adapter when your host receives declarative A2UI messages and should
render them as Kimen components: it owns the A2UI-to-catalog translation, the
data model, the `action` round-trip and per-node degradation, so you never touch the
protocol shape yourself. If you control the spec format, skip the adapter and
use [`@kimen/catalog`](../catalog/README.md) directly; if your host speaks
MCP Apps, use [`@kimen/adapter-mcp-apps`](../adapter-mcp-apps/README.md).
Transport is caller-owned either way — this package consumes
already-delivered messages.

The end-to-end walkthrough — transport wiring, the `action` round-trip,
degradation handling and the COMPAT policy — is
[Build an A2UI host with Kimen](../../docs/guides/a2ui-host.md).

## Usage

```ts
import { createA2uiAdapter } from '@kimen/adapter-a2ui';

const adapter = createA2uiAdapter({
  surface: document.querySelector('#genui'),        // or (surfaceId) => element
  onAction: (event, metadata) => channelToAgent.send(event, metadata), // A2UI `action`
  onError: (error) => channelToAgent.send(error),   // A2UI `error` (VALIDATION_FAILED)
  onDegradation: (report) => log(report),           // fallback gaps, as data
});

// A2UI v0.9.1 messages, as delivered by your transport:
adapter.apply({
  version: 'v0.9.1',
  createSurface: {
    surfaceId: 'checkout',
    catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
  },
});
const result = adapter.apply({
  version: 'v0.9.1',
  updateComponents: {
    surfaceId: 'checkout',
    components: [
      { id: 'root', component: 'Card', child: 'confirm' },
      {
        id: 'confirm',
        component: 'Button',
        child: 'confirm-label',
        action: { event: { name: 'confirm-order', context: { total: { path: '/order/total' } } } },
      },
      { id: 'confirm-label', component: 'Text', text: 'Confirm order' },
    ],
  },
});
result.ok; // true — or false with inert diagnostics naming each offender
```

The adapter implements A2UI **v0.9.1** (`createSurface`, `updateComponents`,
`updateDataModel`, `deleteSurface`; envelope `version` `v0.9.1` or `v0.9`) over
the basic catalog. The surface's data model lives inside the adapter: `{ path }`
bindings, `updateDataModel` upserts and removals, `ChildList` templates with
relative paths and the pure formatting functions resolve here, so the catalog
never learns about data models. A user activation returns as an A2UI `action`
event (`name`, `surfaceId`, `sourceComponentId`, `timestamp`, resolved
`context`), with the `a2uiClientDataModel` metadata when the surface asked for
`sendDataModel`.

An A2UI message is data, never code. Basic-catalog types without a catalog
counterpart (Image, Icon, Modal…) degrade per node to a fixed fallback that
never carries agent content; a type the matrix declares `forbidden` (e.g. raw
`html`), a property the catalog does not declare, or a client function that
reaches a browser capability (`openUrl`) rejects the whole message; a message
with an unsupported `version` is rejected naming the supported set. The
surface's declared action set is fixed (pass `actions`, or it freezes at the
first render that binds one) so no later update can bind an undeclared action.
[`COMPAT.md`](./COMPAT.md) lists every mapping, the lossy ones and the declared
gaps (user input does not yet flow back into the data model; every update
re-renders the whole surface).

Transport is caller-owned: the adapter consumes already-delivered A2UI
messages and emits client messages to the supplied callbacks. `deleteSurface`
drops adapter state; the host owns teardown of its surface element.

See [Build an A2UI host with Kimen](../../docs/guides/a2ui-host.md) for the
full guide, and the [roadmap](../../docs/roadmap.md) for project context.
