# @kimen/adapter-a2ui

> Kimen adapter for A2UI: disposable by design (constitution Art. VIII). Translates declarative A2UI messages into the neutral catalog and renders them only through the guarded renderer. Supported protocol versions live in COMPAT.md, versioned with the adapter.

## When to use

Your agent runtime speaks the A2UI protocol and its surfaces should render as Kimen components with the guardrail enforced.

## When not to use

The agent can emit neutral Kimen UI specs directly (use @kimen/catalog alone), or the host is an MCP Apps client (use @kimen/adapter-mcp-apps).

## Entry points

- `createA2uiAdapter(options) => A2uiAdapter`: Creates the translation boundary: adapter.apply(message) turns A2UI v0.9.1 messages (createSurface, updateComponents, updateDataModel, deleteSurface) into neutral UI specs rendered only through the guarded renderer, resolving the surface data model inside the adapter. User interactions return through options.onAction as A2UI action events, rejected messages through options.onError as VALIDATION_FAILED errors; unmapped basic-catalog types degrade to a fixed fallback reported through options.onDegradation.
- `SUPPORTED_A2UI_VERSIONS`: The exact A2UI envelope versions this adapter accepts (v0.9.1 and v0.9, per the A2UI v0.9.1 schema), versioned with the adapter in COMPAT.md.
- `A2UI_COVERAGE`: Machine-readable coverage table declaring how each A2UI basic-catalog component type is handled: mapped to catalog components, rendered inline, flattened as layout, degraded as unmapped, or forbidden.
