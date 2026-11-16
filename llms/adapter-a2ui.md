# @kimen/adapter-a2ui

> Kimen adapter for A2UI: disposable by design (constitution Art. VIII). Translates declarative A2UI messages into the neutral catalog and renders them only through the guarded renderer. Supported protocol versions live in COMPAT.md, versioned with the adapter.

## When to use

Your agent runtime speaks the A2UI protocol and its surfaces should render as Kimen components with the guardrail enforced.

## When not to use

The agent can emit neutral Kimen UI specs directly (use @kimen/catalog alone), or the host is an MCP Apps client (use @kimen/adapter-mcp-apps).

## Entry points

- `createA2uiAdapter(options) => A2uiAdapter`: Creates the translation boundary: adapter.apply(message) turns A2UI 1.0 and v0.9.1 messages (createSurface, updateComponents, updateDataModel, deleteSurface) into neutral UI specs rendered only through the guarded renderer, resolving the surface data model inside the adapter. Each message is validated against the version its envelope declares, and a surface accepts only the version that created it. User interactions return through options.onAction as A2UI action events in the surface's version, rejected messages through options.onError as VALIDATION_FAILED errors; unmapped basic-catalog types degrade to a fixed fallback reported through options.onDegradation, and every A2UI 1.0 callRendererFunction is refused through options.onFunctionResponse.
- `SUPPORTED_A2UI_VERSIONS`: The exact A2UI envelope versions this adapter accepts: 1.0 (preferred) plus v0.9.1 and v0.9 (one payload-compatible family), each pinned to an upstream commit in A2UI_PROTOCOLS and versioned with the adapter in COMPAT.md.
- `A2UI_COVERAGE`: Machine-readable coverage table declaring how each A2UI 0.9.1 basic-catalog component type is handled: mapped to catalog components, rendered inline, flattened as layout, degraded as unmapped, or forbidden. A2UI_V1_COVERAGE is the A2UI 1.0 counterpart.
- `A2UI_RENDERER_CAPABILITIES`: The renderer capabilities a host transport attaches for each supported A2UI version, preferred version (1.0) first: the metadata key (a2uiRendererCapabilities or a2uiClientCapabilities) and its value naming the basic catalog of that version.
