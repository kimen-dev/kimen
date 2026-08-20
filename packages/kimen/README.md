# kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

**This is a legitimate name placeholder.** The implemented Kimen foundation
is 29 standards-first web components (`<ki-*>`), a layered design-token
system, a neutral runtime catalog with a guarded renderer for agent-emitted
UI specs, and protocol adapters for A2UI and MCP Apps. This package will
eventually expose the CLI / meta entry point for that system.

The project is pre-v1 and nothing is published yet. Implemented package
sources live under the [`@kimen` scope](https://www.npmjs.com/org/kimen):
`@kimen/elements`, `@kimen/tokens`, `@kimen/catalog`, `@kimen/adapter-a2ui`
and `@kimen/adapter-mcp-apps`.

Follow the build: https://github.com/kimen-dev/kimen
Documentation: https://kimen.dev/docs/

Apache-2.0 · Copyright 2026 Marcela Gotta

<!-- kimen:capabilities:kimen-readme-status:start -->
- **available** — Consumer catalog registration: your own components behind a JSON facade, validated and rendered through the same fail-closed guardrail
- **available** — Generated framework wrappers: @kimen/react, @kimen/vue and @kimen/angular with typed props, native events and each framework form idiom, drift-gated
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:kimen-readme-status:end -->
