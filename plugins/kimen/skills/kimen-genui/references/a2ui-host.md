# Path: your agent speaks A2UI

A2UI is Google's declarative agent-to-UI protocol: the agent streams
messages that create a surface, update its components and data model, and
receive the person's actions back. `@kimen/adapter-a2ui` turns those messages
into a Kimen UI spec and renders it through the guarded renderer. Transport
(WebSocket, SSE, A2A, in-process) is yours. Full guide:
<https://kimen.dev/docs/guides/a2ui/>.

## Wiring (browser)

```ts
import { createA2uiAdapter, A2UI_RENDERER_CAPABILITIES } from '@kimen/adapter-a2ui';
import { defineCustomElements } from '@kimen/elements/loader';
import '@kimen/tokens/css';

defineCustomElements();

const send = (message: unknown) => socket.send(JSON.stringify(message));

const adapter = createA2uiAdapter({
  surface: (surfaceId) => document.querySelector(`[data-surface="${surfaceId}"]`),
  onAction: (event, metadata) => send({ ...event, metadata }), // A2UI `action`
  onError: (error) => send(error),                           // A2UI `error` (VALIDATION_FAILED)
  onFunctionResponse: (response) => send(response),          // 1.0: renderer functions are refused
  onDegradation: (report) => console.info(report),           // components shown as a fallback
});

socket.addEventListener('message', (event) => {
  const result = adapter.apply(JSON.parse(event.data));
  if (!result.ok) console.warn(result); // inert diagnostics naming each offender
});
```

Advertise what the renderer supports when the session starts, preferred
version first: attach `A2UI_RENDERER_CAPABILITIES` to your transport's
client metadata so the agent picks a supported version and catalog.

## Versions and catalogs

- Accepted envelope `version`s: `1.0` (preferred), `v0.9.1` and `v0.9`.
  v0.8 messages (`beginRendering`, `surfaceUpdate`) are rejected.
- A surface may only use A2UI's **basic catalog** for its version:
  `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json` (1.0) or
  `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json` (0.9.x).
  Any other `catalogId` is rejected.
- The basic catalog's 18 types map to Kimen components (Text → `ki-markdown`,
  Button → `ki-button`, Card → `ki-card`, Row/Column → `ki-stack`,
  TextField → `ki-input`/`ki-textarea`, ChoicePicker → radio, checkbox group
  or combobox, Modal → `ki-button` + `ki-dialog`, …). `Video` shows a fixed
  fallback; `html`, `RawHtml`, `script` and `iframe` reject the message.
- Kimen components outside the basic catalog (badges, alerts, progress,
  tables, …) are not reachable through A2UI yet. If you need them, use the
  catalog path instead.

## Behaviour to plan around

- The adapter keeps the data model: bindings (`{ "path": … }` in 0.9.x,
  `{ "@path": … }` in 1.0), `updateDataModel` and list templates resolve
  inside it.
- Two-way binding: what the person commits in a bound text field, checkbox,
  slider or single-selection picker is written to its data-model path before
  the next action, so action contexts and `sendDataModel` carry it. Bind the
  inputs (`{ "@path": "/form/email" }`) and read the same paths in the
  button's action context. Multiple-selection pickers and date or time
  inputs still keep their edits local.
- Every update re-renders the whole surface (focus and scroll reset).
- The declared action set freezes at the first render that binds one,
  unless you pass `actions` up front; a later update binding a new name is
  rejected.
- `openUrl` and every renderer function call are refused; client functions
  that need a browser capability never run.
- The exact matrix is `packages/adapter-a2ui/COMPAT.md` in the Kimen
  repository.
