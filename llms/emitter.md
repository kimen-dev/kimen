# @kimen/emitter

> Kimen emitter kit: model-agnostic guidance artifacts (prompt, catalog-specialized JSON Schema with provider lowerings, tool definition) plus emission ingest helpers, derived deterministically from the neutral catalog. Advisory reliability tooling — validation and the guarded renderer remain the only enforcement points (spec 033).

## When to use

Configure ANY LLM to emit valid Kimen UI specs: derive a system prompt, a catalog-specialized JSON Schema (with provider-strict lowerings) or a tool definition from the catalog in use — built-in or registered — and close the reliability loop with normalization and a single-round repair message.

## When not to use

Enforcement: the artifacts are advisory. Validation and rendering stay in @kimen/catalog; hosts that already emit valid specs need nothing from this package.

## Entry points

- `catalogPrompt(catalog, options?) => Derivation<string>`: Model-facing prompt: format rules, usage, prop and composition rules plus a validated example. Use { components, icons, verbosity: 'compact' } for shorter guidance and the host's exact glyph vocabulary. Register the glyphs and pass the same list to selectSpecIcons in the renderer realm. The universal fallback — works with any model, no structured-output support required.
- `uiSpecJsonSchema(catalog, options?) => Derivation<JsonSchema>`: The neutral UI-spec format specialized to the catalog as a JSON Schema document: one branch per component, closed props and enums, closed objects everywhere. Targets: draft-2020-12 (default) and openai-strict (all-required closed objects, recursion via $ref, only the keywords the provider documents, its published limits enforced with named offenders). Pass icons to close all glyph props over the host vocabulary. With openai-strict, collect maps named button actions to exact data-key lists; map values are field node IDs. Derivation rejects invalid options and exceeded limits.
- `uiSpecTool(catalog, options?) => Derivation<UiSpecTool>`: Provider-neutral tool definition { name: 'emit_ui', description, inputSchema } wrapping exactly the lowered schema for the same options; maps mechanically onto any provider's tool or function surface.
- `normalizeEmission(value) => unknown`: Strips the placeholders strict-mode all-required schemas force a model to emit (null-valued props, null action bindings and null events of a binding per event, null node ids, null collection maps, empty props containers) and touches nothing else. Pure cleanup over a fresh clone; output is untrusted until validateUiSpec passes.
- `repairPrompt(report) => string | null`: Formats a failed ValidationReport into ONE corrective message naming every issue's code, path and offender, or null when the report is ok. The single-round-then-fail-closed policy is fixed.
