# Kimen roadmap (public overview)

High-level build order, without dates: phases overlap and the exit criteria
are quality gates, not deadlines.

## 1. Factory (done)

Monorepo (pnpm + Nx), the deterministic gate suite (format, lint, typecheck,
boundaries, dead code, packaging, budgets, real-browser tests with axe,
security scanning), Nx generators so every component is scaffolded the same
way, hardened CI, a release pipeline with npm trusted publishing (dry-run
verified), and the sandboxed unattended-loop environment, exercised end to
end. The `@kimen` npm organization is registered.

## 2. Tokens and theming (current)

`@kimen/tokens`: DTCG tokens compiled to CSS custom properties in three
layers (primitive → semantic → component). Mars ships as the default theme,
and a second reference theme proves in CI that any brand can re-theme by
reassigning the semantic layer alone. Dark mode via tokens; RTL rendered in CI.

## 3. Core components

The essential `<ki-*>` set for GenUI (forms, content, feedback: button,
input, select, checkbox, radio, switch, card, badge, alert, dialog, tooltip,
tabs, progress, list). Each one: five Gherkin scenario families, real-browser
suite, zero axe violations, size budget, generated docs/manifest/catalog
entries.

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
