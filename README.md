# Kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

[![ci](https://github.com/kimen-dev/kimen/actions/workflows/ci.yml/badge.svg)](https://github.com/kimen-dev/kimen/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

**An AI-first Web Components foundation for generative UI.** Kimen ships 29
standards-first `<ki-*>` components, a layered design-token system with two
complete themes, a neutral runtime catalog whose guarded renderer accepts or
rejects agent-emitted UI specs fail-closed, and protocol adapters for A2UI
and MCP Apps:

```
agent → JSON spec → validation → guarded renderer → <ki-*> components
```

**Status**: pre-v1. Everything above is implemented and gate-verified in CI;
nothing is published to npm yet. The commands below are the exact contract
the first release ships with, validated against packed tarballs on every
release dry run (`scripts/consumer-contract.mjs`).

**Explore**: [documentation site](https://kimen.dev/docs/) ·
[Storybook workshop](https://kimen.dev/storybook/) ·
[landing with live re-theming](https://kimen.dev/)

## Quickstart

```sh
pnpm add @kimen/elements @kimen/tokens
# or: npm install @kimen/elements @kimen/tokens
```

Register each component from its direct subpath, then load the token
stylesheet and the page contract once:

```ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css'; // design tokens: onmars theme, light + dark
import '@kimen/tokens/css/base'; // page contract: color-scheme + page colors

defineKiButton();
```

```html
<ki-button variant="primary">Save</ki-button>
```

`@kimen/tokens/css/base` is the **page contract**. A token stylesheet can
only carry custom properties, so it cannot declare `color-scheme`; the page
contract declares it and paints the page from the semantic tokens. Skipping
it is supported in the light scheme, but on a dark-scheme page the cost is
measured, not estimated: **14 of 29 components render text below 4.5:1
contrast** — the components paint their correct dark-scheme foreground while
the browser keeps a light canvas. Load it, or pin the page with
`data-ki-color-scheme="light"`; doing neither is the one combination the
library cannot render legibly.

## Themes and color schemes

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

Every visual value is a `--ki-*` custom property layered primitive → theme →
semantic → component; themes reassign tokens, never component CSS. Details in
the [`@kimen/tokens` README](./packages/tokens/README.md).

Imports from the package root (`import { KiButton } from '@kimen/elements'`)
are a deprecated compatibility facade: see
[`docs/migrations/root-imports.md`](./docs/migrations/root-imports.md).

## Generative UI

Runtime GenUI (A2UI, MCP Apps, AG-UI, json-render) injects agent-generated UI
into applications you don't control. Web components are the one component
technology that behaves identically in every host, and a closed, validated
catalog is safer than letting an agent emit open HTML. Kimen ships both
halves: `@kimen/catalog` validates agent-emitted UI specs against the
machine-generated catalog and renders them through one guarded path — only
catalog components render, only declared actions dispatch, no code path
executes from spec data — and the protocol adapters translate A2UI messages
and MCP Apps surfaces into that same path. Adapters are disposable by design;
the catalog and components are the durable assets.

## Packages

| Package | Status | What it is |
| --- | --- | --- |
| [`@kimen/elements`](./packages/elements) | Implemented, unpublished | 29 `<ki-*>` Stencil web components |
| [`@kimen/tokens`](./packages/tokens) | Implemented, unpublished | Design tokens (DTCG), primitive → theme → semantic → component |
| [`@kimen/catalog`](./packages/catalog) | Implemented, unpublished | Neutral catalog schema + guarded renderer (`validateUiSpec`, `renderUiSpec`, streaming) |
| [`@kimen/adapter-a2ui`](./packages/adapter-a2ui) | Implemented, unpublished | A2UI protocol adapter over the guarded renderer |
| [`@kimen/adapter-mcp-apps`](./packages/adapter-mcp-apps) | Implemented, unpublished | MCP Apps adapter: Kimen surfaces as self-contained `ui://` resources |
| `@kimen/react`, ... | Planned | Generated framework wrappers |
| [`kimen`](./packages/kimen) | Placeholder | Future CLI / meta package |

The current v1 publication contract covers exactly `@kimen/elements` and
`@kimen/tokens`; whether the catalog and adapters publish at v1 is an open
founder decision — see [`docs/releasing.md`](./docs/releasing.md).

## For agents

Kimen treats agent legibility as a deliverable. The repository root and
`@kimen/elements` ship [`llms.txt`](./llms.txt) — every component's
attributes, slots, parts, events, methods, CSS custom properties and
when-to-use / when-not-to-use guidance — and
`packages/elements/generated/custom-elements.json` is the machine-readable
Custom Elements Manifest. Both are generated from component JSDoc and token
sources, never hand-edited, and the `llms.txt` code examples are executed
against packed tarballs during release validation. Human-readable docs live
at the [documentation site](https://kimen.dev/docs/).

## Quality bar

Every component ships with real-browser tests (three engines at release),
zero axe-core violations (WCAG 2.2 AA + EN 301 549 target), a single-digit-KB
size budget, tokens-only styling (no hardcoded visual values), and RTL support
by construction. The whole repo is guarded by a deterministic gate suite that
runs identically locally and in CI: `bash scripts/gates/gates-suite.sh`.

## Governance

The repository operates under a constitution digest
([`.specify/memory/constitution.md`](./.specify/memory/constitution.md)):
generated artifacts are regenerated, never hand-edited; styling is
tokens-only; agent surfaces are versioned with the public API; the founder is
the only merge gate. Agents working in the repo start at
[`AGENTS.md`](./AGENTS.md).

## Roadmap

See [`docs/roadmap.md`](./docs/roadmap.md) for where the project is headed.

## Contributing

External contributions are welcome and pass exactly the same gates as
everything else: see [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security reports:
[`SECURITY.md`](./SECURITY.md).

## License

[Apache-2.0](./LICENSE) · Copyright 2026 Marcela Gotta

<!-- kimen:capabilities:root-readme-status:start -->
- **available** — Consumer catalog registration: your own components behind a JSON facade, validated and rendered through the same fail-closed guardrail
- **available** — Emitter kit: model-agnostic prompt, catalog-specialized JSON Schema and tool definition so any LLM emits valid specs, with a single-round repair loop
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:root-readme-status:end -->
