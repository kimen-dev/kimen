# Emitting specs with any LLM

How to configure a model — any provider, any mode — to emit valid Kimen UI
specs, using `@kimen/emitter` (spec 033). The kit derives everything from
the same catalog value your runtime validates and renders against
([`@kimen/catalog`](../../packages/catalog/README.md)), including your own
registered components
([registration guide](../../packages/catalog/README.md#registering-your-own-components)).

## Pick your integration mode

| Your provider supports | Use | Notes |
|---|---|---|
| Nothing special (any chat model) | `catalogPrompt(catalog)` as a system-prompt block | The universal fallback; carries guidance + a validated example |
| Structured outputs / response schemas | `uiSpecJsonSchema(catalog, { target })` | `openai-strict` for all-required closed-object modes; `draft-2020-12` elsewhere |
| Tool / function calling | `uiSpecTool(catalog, { target })` | `{ name, description, inputSchema }`, provider-neutral |
| A strict mode without recursive schemas (Anthropic strict tools) | `draft-2020-12` on a regular, non-strict tool | No strict target exists: that subset cannot hold a catalog-specialized schema |

Combine prompt + schema for best results: the schema constrains SHAPE, the
prompt carries JUDGMENT (when to use which component). Both derive from
the same entries, so they cannot drift.

Large catalogs: pass `{ components: [...] }` to subset. If a strict
target's documented provider limits are exceeded, derivation fails naming
the largest-contributing component — the kit never silently truncates the
model's world.

## Configure the cart surface

Use the same glyph list in the renderer realm and in every emitter artifact.
Pass a component subset and `verbosity: 'compact'` to shorten the system
prompt. Omit `verbosity` for the standard guidance.

```ts
import { catalogData, selectSpecIcons } from '@kimen/catalog';
import { catalogPrompt, uiSpecTool } from '@kimen/emitter';
import '@kimen/elements/icons/shopping-bag';
import '@kimen/elements/icons/tag';
import '@kimen/elements/icons/search';

const icons = ['shopping-bag', 'tag', 'search'] as const;
selectSpecIcons(icons);

const components = [
  'ki-card', 'ki-icon', 'ki-button', 'ki-input',
  'ki-select', 'ki-option', 'ki-textarea', 'ki-table',
];
const prompt = catalogPrompt(catalogData, { components, icons, verbosity: 'compact' });
const tool = uiSpecTool(catalogData, {
  components,
  icons,
  target: 'openai-strict',
  collect: { save: ['customerName', 'region', 'notes'], preview: ['region'] },
});
if (!prompt.ok || !tool.ok) throw new Error(JSON.stringify([...prompt.issues, ...tool.issues]));
```

If the model binds a `ki-button` to `save`, its `collect` is either `null` or
`{ "customerName": "f-name", "region": "f-region", "notes": "f-notes" }`.
Give the fields those node IDs and include `save` in the spec's top-level
`actions`. After normalization and validation, activating the button reports
the current field values to the host. The host chooses how to authorize
and handle that report.

The icon list can include custom registered names. An empty list, a blank
name or a vocabulary incompatible with a catalog prop returns
`invalid-option`. For a surface with no glyphs, leave `ki-icon` out of
`components` and omit `icons`. For a custom MCP Apps document, derive
artifacts from `surface.catalog` with `icons: surface.icons`.

## Always validate — the loop

```text
model output
  → normalizeEmission(...)        strip strict-mode null placeholders
  → validateUiSpec(spec, {catalog})
      ok → renderUiSpec / createStreamingRenderer (the guardrail renders)
      not ok → repairPrompt(report) → model, ONCE → re-validate → fail closed
```

Provider "guaranteed JSON" modes do not replace validation: cross-field
rules (declared actions), budgets, the URL scheme allowlist and the purity
wall are boundary-only, and constrained decoding degrades on hard schemas.
The emitter is reliability tooling; the boundary is the law.

## Version skew

Every artifact embeds the catalog schema version. A catalog whose version
the kit does not support is refused at derivation — the same fail-closed
posture the renderer applies at render time.
