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
stylesheet once — and, optionally, the page contract:

```ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css'; // design tokens + color-scheme: onmars theme, light + dark
import '@kimen/tokens/css/base'; // optional page contract: page background, text color, body font

defineKiButton();
```

```html
<ki-button variant="primary">Save</ki-button>
```

`@kimen/tokens/css` is the only requirement. Besides every `--ki-*` token
it declares the `color-scheme` they resolve from, so the browser paints the
canvas, scrollbars and native controls in the same scheme as the components:
a page that loads nothing else stays legible in light and in dark (measured
over all 29 components under a dark system preference). That declaration is
a zero-specificity default — a `color-scheme` your own CSS sets on the page
wins, and the tokens follow it.

`@kimen/tokens/css/base` is the opt-in **page contract**: it paints the page
itself from the semantic tokens — background, text color and body font — and
declares no color scheme.

## Themes and color schemes

`@kimen/tokens/css` ships the default onmars theme and follows the system
color scheme. To opt into the Material 3 reference theme, also load its
stylesheet and select it with `data-ki-theme`; `data-ki-color-scheme`
(`light` / `dark`) overrides the OS scheme for any theme. Both attributes
work on the document root or on any element:

```ts
import '@kimen/tokens/css/material3';
```

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```

Every visual value is a `--ki-*` custom property layered primitive → theme →
semantic → component; themes reassign tokens, never component CSS. Details in
the [`@kimen/tokens` README](./packages/tokens/README.md).

### Onmars color and surfaces

Onmars v2, Calma, pairs a paper ivory canvas with warm charcoal in dark mode.
Ink anchors the primary action. Terracotta marks links, focus and selection.
Crimson signals errors. Opaque fills, hairline borders and soft shadows give
surfaces their depth.

### Onmars typography

Instrument Sans leads the UI and body stack. Newsreader leads the display
and serif stacks. The tokens specify the font families and fallbacks.

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

The boundary is open on both sides: `createCatalog` registers an
application's own components behind a data-only JSON facade (validated as
hostile input, deep-frozen, composable with the built-ins), and
`@kimen/emitter` derives from any catalog the guidance an LLM integration
needs — a system prompt with the usage guidance verbatim, a
catalog-specialized JSON Schema with provider-strict lowerings, and a
provider-neutral tool definition — plus the normalize-and-repair helpers
that close the reliability loop. Emitter artifacts are advisory; validation
and the guarded renderer stay the only enforcement points.

## Packages

| Package | Status | What it is |
| --- | --- | --- |
| [`@kimen/elements`](./packages/elements) | Implemented, unpublished | 29 `<ki-*>` Stencil web components |
| [`@kimen/tokens`](./packages/tokens) | Implemented, unpublished | Design tokens (DTCG), primitive → theme → semantic → component |
| [`@kimen/catalog`](./packages/catalog) | Implemented, unpublished | Neutral catalog schema + guarded renderer (`validateUiSpec`, `renderUiSpec`, streaming) |
| [`@kimen/adapter-a2ui`](./packages/adapter-a2ui) | Implemented, unpublished | A2UI protocol adapter over the guarded renderer |
| [`@kimen/adapter-mcp-apps`](./packages/adapter-mcp-apps) | Implemented, unpublished | MCP Apps adapter: Kimen surfaces as self-contained `ui://` resources |
| [`@kimen/mcp-server`](./packages/mcp-server) | Implemented, unpublished | MCP server over stdio: agents list the catalog, validate specs and render them as MCP Apps surfaces |
| [`@kimen/emitter`](./packages/emitter) | Implemented, unpublished | Emitter kit: prompt, provider-lowered JSON Schema and tool definition from any catalog, plus normalize + single-round repair |
| [`@kimen/react`](./packages/react) | Implemented, unpublished | Generated React bindings: typed props, event callbacks, controlled forms |
| [`@kimen/vue`](./packages/vue) | Implemented, unpublished | Generated Vue 3 bindings with v-model on the form components |
| [`@kimen/angular`](./packages/angular) | Implemented, unpublished | Generated Angular standalone components + ControlValueAccessors (APF, Angular ^22) |
| [`kimen`](./packages/kimen) | Placeholder | Future CLI / meta package |

The current v1 publication contract covers exactly `@kimen/elements` and
`@kimen/tokens`; whether the catalog and adapters publish at v1 is an open
founder decision — see [`docs/releasing.md`](./docs/releasing.md).

## For agents

Kimen treats agent legibility as a deliverable. The repository root and
`@kimen/elements` ship [`llms.txt`](./llms.txt), a short index in the
[llms.txt](https://llmstxt.org/) shape: what Kimen is, how to load it, when
to use each component, and a link per component to one Markdown document
with its attributes, slots, parts, events, methods, CSS custom properties,
examples and when-to-use / when-not-to-use guidance.
[`llms-full.txt`](./llms-full.txt) is all of it in one file, and
`packages/elements/generated/custom-elements.json` is the machine-readable
Custom Elements Manifest. All of them are generated from component JSDoc and
token sources, never hand-edited, and the code examples of the packaged
`llms.txt` are executed against packed tarballs during release validation.
Human-readable docs live at the
[documentation site](https://kimen.dev/docs/).

## Quality bar

Every component ships with real-browser tests (three engines at release),
zero axe-core violations (WCAG 2.2 AA + EN 301 549 target), a single-digit-KB
size budget, tokens-only styling (no hardcoded visual values), and RTL support
by construction. Run `bash scripts/gates/gates-suite.sh` for full local checks
before a pull request. CI requires visual and cross-filesystem checks as part
of the quality and release gates.

For a quicker local pass, run `bash scripts/gates/gates-suite.sh --affected`.
Nx selects projects and their dependents from committed, staged, unstaged and
untracked changes since the merge base with `origin/main`. It runs their builds,
unit tests, size checks, Chromium tests and browser wrapper tests where those
targets exist. Set `NX_BASE` to use a different base. Changes to shared inputs,
such as root configuration or gate scripts, trigger the full suite. Affected
runs provide local feedback only.

On a non-Linux host the local browser suite reports how many visual specs it
skips. Set `KIMEN_RUN_VISUALS=1` to run them with your host's baselines. The local
cross-filesystem documentation test skips if `TMPDIR` does not point to a
writable directory on a different filesystem. To exercise that boundary on
macOS, run `bash scripts/gates/cross-device-tmpdir.sh -- bash scripts/gates/gates-suite.sh`.
A local skip contributes no release evidence.

### Share local caches across worktrees

The default cache is private to each worktree under `reports/cache`. To share
Nx task outputs, the pnpm store and Playwright binaries across local worktrees,
set `KIMEN_CACHE_ROOT` to one private directory outside your home. For example,
on macOS add `export KIMEN_CACHE_ROOT="/Users/Shared/kimen-cache-$UID"` to your
shell startup file. The wrapper creates and validates the directory. It rejects
symlink components and group- or world-writable cache directories. Nx project
graph state, Vite state and gate evidence have separate worktree directories.

Use the wrapper when provisioning the shared store and Chromium binaries. Run
the install in each worktree when switching it to the shared store.

```bash
bash scripts/gates/cache-env.sh -- pnpm install --frozen-lockfile
bash scripts/gates/cache-env.sh -- pnpm --filter @kimen/elements exec playwright install chromium
```

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
- **available** — Generated framework wrappers: @kimen/react, @kimen/vue and @kimen/angular with typed props, native events and each framework form idiom, drift-gated
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **available** — Kimen MCP server: over stdio, agents list and describe the catalog, validate UI specs with correctable issues and render them as MCP Apps surfaces through the guarded renderer
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:root-readme-status:end -->
