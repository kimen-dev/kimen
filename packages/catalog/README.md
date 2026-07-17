# @kimen/catalog

**Status**: planned — not implemented, not published. Today the package is a
placeholder entry point that only anchors the deterministic gates.

This package will be the neutral, schema-constrained catalog at the heart of
Kimen's GenUI layer: the machine-readable schema of what agents may emit
(components, props, declared actions, when-to-use metadata) and the guarded
renderer that validates incoming JSON specs and renders only catalog
components. The guardrail is treated as a security boundary — agents never
emit open HTML — and streaming or partial specs will render progressively.

Protocol adapters (A2UI first, then MCP Apps) are deliberately disposable;
the catalog and the `<ki-*>` components are the durable assets. The real
implementation enters through the Spec Kit flow with its own approved spec.

See phase 4 of the [roadmap](../../docs/roadmap.md).

<!-- kimen:capabilities:catalog-readme-status:start -->
- **planned** — Schema-constrained guarded renderer planned
- **hardening** — Changed-core mutation quality gate in hardening
- **planned** — A2UI, MCP Apps, AG-UI and json-render protocol adapters planned
- **planned** — Neutral runtime component catalog planned
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:catalog-readme-status:end -->
