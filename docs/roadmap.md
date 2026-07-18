# Kimen roadmap (public overview)

High-level build order, without dates: phases overlap and the exit criteria
are quality gates, not deadlines.

## 1. Factory (integrity hardening)

The pnpm + Nx monorepo, deterministic gate suite, component generator,
release workflow and unattended-loop sandbox exist. Current work is closing
their enforcement gaps: protected-main rules, mutation gating, sandbox
credential containment, complete generator wiring and least-privilege
release separation. The `@kimen` npm organization is registered.

## 2. Tokens and theming (implemented, hardening)

`@kimen/tokens`: DTCG tokens compiled to CSS custom properties in three
layers (primitive → semantic → component). onmars is the default theme,
and a second reference theme proves in CI that any brand can re-theme by
reassigning the semantic layer alone. Token reference and layer-integrity
gates are still being added before publication.

## 3. Core components (implemented, pre-release)

The essential `<ki-*>` set for GenUI (forms, content, feedback: button,
input, select, checkbox, radio, switch, card, badge, alert, dialog, tooltip,
tabs, progress, list). The source includes Gherkin contracts, real-browser
tests, axe checks, size budgets, generated docs, a Custom Elements Manifest
and `llms.txt`. The runtime catalog does not exist yet.

## 4. Neutral catalog + guardrail renderer

`@kimen/catalog`: the schema of what agents may emit (components, props,
declared actions, when-to-use metadata) and the renderer that validates specs
and renders only catalog components. The guardrail is tested as a security
boundary; streaming/partial specs render progressively.

## 5. Protocol adapters

`@kimen/adapter-a2ui` first, then MCP Apps. Adapters are disposable by
design: each declares the exact protocol versions it supports and absorbs
protocol churn without touching the core.

## 6. v1.0.0

Published to npm with trusted publishing and signed provenance; catalog and
llms.txt versioned alongside the public API; docs site generated from the
single source of truth.

Follow progress through issues and pull requests.

<!-- kimen:capabilities:roadmap-status:start -->
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **planned** — A2UI, MCP Apps, AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:roadmap-status:end -->
