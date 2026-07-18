# kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

**This is a legitimate name placeholder.** The implemented Kimen foundation
is a set of standards-first web components (`<ki-*>`), design tokens and
machine-readable contracts. The neutral catalog, guarded renderer and
multi-protocol adapters are planned; this package will eventually expose the
CLI / meta entry point for that system.

The project is pre-v1 and nothing is published yet. Implemented package
sources live under the [`@kimen` scope](https://www.npmjs.com/org/kimen) as
`@kimen/elements` and `@kimen/tokens`; `@kimen/catalog` and
`@kimen/adapter-*` are roadmap packages.

Follow the build: https://github.com/kimen-dev/kimen

Apache-2.0 · Copyright 2026 Marcela Gotta

<!-- kimen:capabilities:kimen-readme-status:start -->
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:kimen-readme-status:end -->
