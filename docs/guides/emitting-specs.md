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
| No recursive schemas (grammar-compiled) | `target: 'anthropic-strict'` | Node tree unrolled to `maxDepth` (default 6) — schema bound only |

Combine prompt + schema for best results: the schema constrains SHAPE, the
prompt carries JUDGMENT (when to use which component). Both derive from
the same entries, so they cannot drift.

Large catalogs: pass `{ components: [...] }` to subset. If a strict
target's documented provider limits are exceeded, derivation fails naming
the largest-contributing component — the kit never silently truncates the
model's world.

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
