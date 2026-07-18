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

## Usage

```ts
import { createA2uiAdapter } from '@kimen/adapter-a2ui';

const adapter = createA2uiAdapter({
  surface: document.querySelector('#genui'),
  protocolVersion: '0.9.1',
  onUserAction: (event) => channelToAgent.send(event), // A2UI userAction round-trip
  onDegradation: (report) => log(report),              // unmapped-type gaps, as data
});

// A supported A2UI surface update renders as catalog components:
const result = adapter.apply({
  surfaceUpdate: {
    surfaceId: 'checkout',
    root: 'card',
    components: [
      { id: 'card', component: { Card: { children: { explicitList: ['confirm'] } } } },
      {
        id: 'confirm',
        component: {
          Button: { label: { literalString: 'Confirm order' }, action: { name: 'confirm-order' } },
        },
      },
    ],
  },
});
result.ok; // true — or false with inert diagnostics naming each offender
```

An A2UI message is data, never code. Unmapped component types degrade per node
to a fixed fallback (never carrying agent content); a type the matrix declares
`forbidden` (e.g. raw `html`) rejects the whole message; a message tagged with
an unsupported protocol version is rejected naming the supported set. Incremental
`surfaceUpdate` / `dataModelUpdate` messages revise the surface without
discarding it, and the surface's declared action set is frozen at first render
so no later update can bind an undeclared action.

Transport is caller-owned: the adapter consumes already-delivered A2UI
messages and emits `userAction` events to the supplied channel. `deleteSurface`
drops adapter state; the host owns teardown of its surface element.

See phase 5 of the [roadmap](../../docs/roadmap.md).
