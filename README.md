# Kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

**A neutral, multi-protocol GenUI catalog in web components.** An agent emits
a schema-constrained UI spec; Kimen validates it against a closed catalog and
renders it with standard web components (`<ki-*>`). Because it is built on web
standards, the same components work in any host, whatever the framework, and
re-theme to any brand by reassigning one layer of design tokens.

```
agent → JSON spec → guardrail (validate against the catalog) → <ki-*> render
```

**Status**: pre-v1, under active construction. Nothing is published yet;
star/watch the repo to follow along.

**Site**: [kimen-dev.github.io/kimen](https://kimen-dev.github.io/kimen/) —
landing with live re-theming, and the component workshop under
[/storybook/](https://kimen-dev.github.io/kimen/storybook/).

## Why

Runtime GenUI (A2UI, MCP Apps, AG-UI, json-render) injects agent-generated UI
into applications you don't control. Web components are the one component
technology that behaves identically in every host, and a closed, validated
catalog is safer than letting an agent emit open HTML. Kimen puts those two
ideas together: protocol adapters are disposable by design; the catalog and
the components are the durable assets.

## Packages

| Package | What it is |
| --- | --- |
| `@kimen/elements` | The `<ki-*>` Stencil web components |
| `@kimen/catalog` | The neutral catalog schema + guardrail renderer |
| `@kimen/tokens` | Design tokens (DTCG), primitive → semantic → component |
| `@kimen/adapter-*` | Protocol adapters (A2UI first), each with a compatibility matrix |
| `@kimen/react`, ... | Generated framework wrappers |
| `kimen` | CLI / meta package (name placeholder today) |

## Quality bar

Every component ships with real-browser tests (three engines at release),
zero axe-core violations (WCAG 2.2 AA + EN 301 549 target), a single-digit-KB
size budget, tokens-only styling (no hardcoded visual values), and RTL support
by construction. The whole repo is guarded by a deterministic gate suite that
runs identically locally and in CI: `bash scripts/gates/gates-suite.sh`.

## Roadmap

See [`docs/roadmap.md`](./docs/roadmap.md) for where the project is headed.

## Contributing

External contributions are welcome and pass exactly the same gates as
everything else: see [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security reports:
[`SECURITY.md`](./SECURITY.md).

## License

[Apache-2.0](./LICENSE) · Copyright 2026 Marcela Gotta
