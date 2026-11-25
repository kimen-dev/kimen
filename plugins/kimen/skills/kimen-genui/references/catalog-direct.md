# Path: you call the model and own the page

Use `@kimen/emitter` to tell the model what it may build and
`@kimen/catalog` to judge and render what it built. This path reaches every
catalog component, and it is the only one with streaming and live updates.
Full guides: <https://kimen.dev/docs/guides/emitting-specs/> and
<https://kimen.dev/docs/guides/ui-spec/>.

## 1. Constrain the model (server or client)

```ts
import { catalogData } from '@kimen/catalog';
import { catalogPrompt, uiSpecTool, uiSpecJsonSchema } from '@kimen/emitter';

// Only the components this surface needs: the whole catalog is ~200 KB.
const components = ['ki-card', 'ki-button', 'ki-input', 'ki-badge', 'ki-alert', 'ki-stack', 'h2', 'p'];

const prompt = catalogPrompt(catalogData, { components }); // system prompt text
const tool = uiSpecTool(catalogData, { components });      // { name: 'emit_ui', description, inputSchema }
const strict = uiSpecJsonSchema(catalogData, { components, target: 'openai-strict' }); // provider-strict schema

for (const derivation of [prompt, tool, strict]) {
  if (!derivation.ok) throw new Error(JSON.stringify(derivation.issues)); // fail closed, never truncated
}
```

Pick one mode per provider:

- **Tool call** (any provider with tools): register `tool.artifact` as a
  tool and read the spec from the tool input.
- **Structured output**: pass `uiSpecJsonSchema` (`openai-strict` for
  OpenAI strict mode, the default draft 2020-12 elsewhere).
- **Prompt only** (any model): use `prompt.artifact` as the system prompt and
  parse the answer as JSON.

The derivations are advisory: they make valid output likely, never
guaranteed. Validation below is what decides.

## 2. Validate, repair once

```ts
import { validateUiSpec } from '@kimen/catalog';
import { normalizeEmission, repairPrompt } from '@kimen/emitter';

// parse() is yours: JSON.parse the text answer, or take the tool call's input object.
// normalizeEmission drops the null placeholders strict structured output forces
// (null props, null action, null id) and leaves every real mistake for validation.
let spec = normalizeEmission(parse(modelOutput));
let report = validateUiSpec(spec);
if (!report.ok) {
  const repair = repairPrompt(report);     // one message naming every issue
  if (repair !== null) {
    spec = normalizeEmission(parse(await askModelAgain(repair)));
    report = validateUiSpec(spec);
  }
}
if (!report.ok) {
  // Show a fixed fallback, log report.issues. Do not render, do not loop.
}
```

## 3. Render in the browser

```ts
import { renderUiSpec } from '@kimen/catalog';
import { defineCustomElements } from '@kimen/elements/loader';
import '@kimen/tokens/css';

defineCustomElements(); // agent output can name any catalog tag

const result = renderUiSpec(spec, {
  surface: document.querySelector('#genui')!,
  onAction: ({ action, data, id, path }) => {
    // action: a declared name; id: the node's id, when it has one;
    // data: the control's props and live value, plus the collected fields.
    // Untrusted input: validate before acting.
  },
});
if (!result.ok) console.warn(result.diagnostics); // nothing attached; previous content intact
```

`renderUiSpec` is atomic: it validates everything before the first DOM
write, so a rejected spec leaves the surface untouched. In a React
component, mount it as `react.md` shows.

## Streaming and live surfaces

- `createStreamingRenderer({ surface, actions, onAction })` then
  `push(node)` per top-level child as the model streams: each subtree
  attaches only when it is fully valid. Declare `actions` up front.
- `createLiveSurface({ surface, actions, onAction })` then `apply(batch)` with
  id-addressed `insert`, `set`, `text`, `remove`, `replace` and `reset`
  operations: the whole batch is validated first, and only the named nodes
  change, so focus, typed values and scroll survive. Give nodes stable `id`s
  in the first spec. Check `ok` on every result: a rejection is returned, not
  thrown, and leaves earlier batches applied. When a batch removes the row
  that had focus, name the next row's control in the batch's `focus`.
- After a create, empty the add form with `{ op: 'reset', id }` per field.
  It needs no `force`; it is rejected as `unsent-user-input` when the person
  typed again after the action, and then the form is left alone.

## Your own components

`createCatalog(definition, { extend: catalogData })` registers your own
custom elements behind the same JSON facade (typed props, slots, events,
mandatory when-to-use guidance). Pass the result as `options.catalog` to
validation, rendering and the emitter. The definition is treated as
untrusted input and validated like a spec.

## Server-side checks

Where there is no DOM (an API route, an MCP server), use
`preflightUiSpec(spec)`: it runs exactly the renderer's preparation, so
"valid" means "the renderer will paint it". `validateUiSpec` alone accepts
some specs the renderer's tighter budgets refuse.
