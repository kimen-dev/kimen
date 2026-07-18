# Kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

**An AI-first Web Components foundation for generative UI.** Kimen currently
ships the source for standards-first `<ki-*>` components, design tokens and
machine-readable component contracts. The neutral catalog, guarded renderer
and protocol adapters described below are the planned GenUI layer; they are
not implemented or published yet.

```
planned: agent → JSON spec → guardrail → neutral catalog → <ki-*> renderer
```

**Status**: pre-v1, under active construction. Nothing is published yet;
star/watch the repo to follow along.

**Site**: [kimen-dev.github.io/kimen](https://kimen-dev.github.io/kimen/) —
landing with live re-theming, and the component workshop under
[/storybook/](https://kimen-dev.github.io/kimen/storybook/).

## Quickstart

> Not published to npm yet: these are the exact commands the first release
> will ship with, already validated in CI against packed tarballs on every
> release dry run (`scripts/consumer-contract.mjs`).

```sh
pnpm add @kimen/elements @kimen/tokens
# or: npm install @kimen/elements @kimen/tokens
```

Register each component from its direct subpath and load the token stylesheet
once:

```ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css';

defineKiButton();
```

```html
<ki-button variant="primary">Save</ki-button>
```

`@kimen/tokens/css` ships the default onmars theme and follows
`prefers-color-scheme`. To opt into the Material 3 reference theme, also load
its stylesheet and select it on the document root; `data-ki-color-scheme`
(`light` / `dark`) overrides the OS scheme for any theme:

```ts
import '@kimen/tokens/css/material3';
```

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```

Imports from the package root (`import { KiButton } from '@kimen/elements'`)
are a deprecated compatibility facade: see
[`docs/migrations/root-imports.md`](./docs/migrations/root-imports.md).

## Why

Runtime GenUI (A2UI, MCP Apps, AG-UI, json-render) injects agent-generated UI
into applications you don't control. Web components are the one component
technology that behaves identically in every host, and a closed, validated
catalog is safer than letting an agent emit open HTML. Kimen is building
toward those two ideas together: protocol adapters will be disposable by
design; the catalog and components will be the durable assets.

## Packages

| Package | Status | What it is |
| --- | --- | --- |
| `@kimen/elements` | Implemented, unpublished | The `<ki-*>` Stencil web components |
| `@kimen/tokens` | Implemented, unpublished | Design tokens (DTCG), primitive → semantic → component |
| `@kimen/catalog` | Planned | Neutral catalog schema and guarded renderer |
| `@kimen/adapter-*` | Planned | Protocol adapters (A2UI first), each with a compatibility matrix |
| `@kimen/react`, ... | Planned | Generated framework wrappers |
| `kimen` | Placeholder | Future CLI / meta package |

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

<!-- kimen:capabilities:root-readme-status:start -->
- **planned** — Schema-constrained guarded renderer planned
- **hardening** — Changed-core mutation quality gate in hardening
- **planned** — A2UI, MCP Apps, AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:root-readme-status:end -->
