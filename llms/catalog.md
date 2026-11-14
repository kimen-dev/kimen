# @kimen/catalog

> Kimen neutral catalog and guardrail boundary: schema-constrained specs rendered from a closed component catalog. The durable asset (constitution Art. VIII).

## When to use

Any boundary where agent-emitted JSON must become Kimen UI: validate specs standalone, render them with the guardrail enforced, stream them progressively, or keep a long-lived surface current with id-addressed batches. Both protocol adapters and any custom transport build on it.

## When not to use

Hand-authored pages that never render agent output — use @kimen/elements directly.

## Entry points

- `validateUiSpec(input, options?) => ValidationReport`: Accepts or rejects an agent-emitted UI spec against the catalog in use — the built-in generated catalog, or a registered one passed as options.catalog — before anything renders. The report lists every issue with a code (unknown-component, unknown-prop, invalid-prop-type, unknown-slot, undeclared-action, invalid-id, duplicate-id, forbidden-key, size-budget, depth-budget, malformed-spec), a path into the spec document and the offending value.
- `renderUiSpec(input, options) => RenderResult`: Validates and renders a spec into options.surface through the guarded renderer: only components of the catalog in use render (options.catalog selects it; absent, the built-in catalog applies), only actions declared in the spec dispatch (delivered as data to options.onAction), unknown props are rejected and no code path executes from spec data. Failures come back as diagnostics naming rule, path and value; nothing attaches on failure.
- `createStreamingRenderer(options) => StreamingRenderer`: Progressive rendering over a streamed spec: each push(node) validates one top-level subtree and attaches it only when fully valid; an invalid node fails closed while previously attached content remains, and the render budgets bind the accumulated stream. The catalog in use is fixed at creation via options.catalog.
- `createLiveSurface(options) => LiveSurface`: A long-lived surface changed through atomic batches of insert, set, text, remove and replace ops addressed by stable node ids: apply(batch) validates the whole batch and the state it would produce (purity wall, per-batch budgets, optional ifRevision, catalog, guards, state budgets) before any DOM write, rejects it whole with diagnostics while the surface stays live, and otherwise touches only the attributes, text and subtrees it names so focus, typed values and scroll survive. No set, replace or remove overwrites or discards checked/value/open the user changed unless forced and allowed by the host. Action events carry id, current path, revision and live data; snapshot() returns deep-frozen plain data.
- `createCatalog(definition, options?) => CatalogCreationResult`: Registers your own components behind a data-only JSON facade — the exact entry shape of the generated catalog (tag, usage guidance, typed prop constraints, slots, events) — and returns a deeply frozen catalog that validateUiSpec and both renderers accept via options.catalog. The definition is untrusted input: it crosses the same purity wall as UI specs, tags must be conservative custom-element names, collisions with the extended catalog fail closed, usage guidance is mandatory, and every rejection is a RegistrationIssue naming code, path and offender. Pass { extend: catalogData } to compose with the built-in components, or omit it for a standalone catalog.
- `DEFAULT_RENDER_BUDGETS`: The declared render budgets (maxDepth 32, maxNodes 512, maxBytes 262144). A spec exactly at a budget passes; one beyond it is rejected before any node attaches. Hosts may tighten them via options.budgets; the renderer never renders past them. Standalone validation has its own ceilings, VALIDATION_MAX_BYTES (262144 UTF-8 bytes, overridable per call with maxBytes) and VALIDATION_MAX_DEPTH (256).
- `catalogData`: The generated catalog document itself: one entry per published ki-* element with typed props, events, slots and when-to-use guidance, plus the elements version it derives from. Its schema version is exported as CATALOG_SCHEMA_VERSION.
