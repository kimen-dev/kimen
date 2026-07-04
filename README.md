# Kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

**The neutral, multi-protocol GenUI catalog in web components.** Agents emit
schema-constrained UI specs; Kimen validates them against a closed catalog and
renders them with standard web components (`<ki-*>`) that re-theme via design
tokens in a single step. Protocol adapters (A2UI, MCP Apps, AG-UI, json-render)
are disposable; the catalog is the durable asset.

**Status**: pre-v1 · Fase 0 (factory setup) · nothing published yet.

## Governance

This project is run as a one-person, AI-First operation under a binding
constitution: [`kimen-constitution.md`](./kimen-constitution.md). Agents
implement, deterministic gates verify, one founder approves. Start there;
everything else follows from it.

- Product strategy: [`docs/kimen-estrategia-producto.md`](./docs/kimen-estrategia-producto.md)
- Build roadmap: [`docs/kimen-roadmap.md`](./docs/kimen-roadmap.md)
- Automation harness design: [`docs/kimen-harness-speckit.md`](./docs/kimen-harness-speckit.md)
- Contributing: [`CONTRIBUTING.md`](./CONTRIBUTING.md) · Security: [`SECURITY.md`](./SECURITY.md)

## Planned packages

`@kimen/tokens` · `@kimen/elements` · `@kimen/catalog` · `@kimen/adapter-*` ·
generated wrappers (`@kimen/react`, ...)

## License

[Apache-2.0](./LICENSE) · Copyright 2026 Marcela Gotta
