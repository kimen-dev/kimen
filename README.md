# Kimen

> *Kimen* (Norwegian/Danish): the seed, the germ from which something grows.

[![ci](https://github.com/kimen-dev/kimen/actions/workflows/ci.yml/badge.svg)](https://github.com/kimen-dev/kimen/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

**An AI-first Web Components foundation for generative UI.** Kimen ships
standards-first `<ki-*>` components, a layered design-token system with two
complete themes, a neutral runtime catalog whose guarded renderer accepts or
rejects agent-emitted UI specs fail-closed, and protocol adapters for A2UI
and MCP Apps:

```
agent → JSON spec → validation → guarded renderer → <ki-*> components
```

**Status**: pre-v1, published on npm. Every `@kimen/*` package releases at
one shared version through npm trusted publishing with Sigstore provenance;
before 1.0.0 a minor release may break the public API. The commands below are
validated against the packed tarballs of every release run, dry runs
included (`scripts/consumer-contract.mjs`).

**Explore**: [documentation site](https://kimen.dev/docs/) ·
[Storybook workshop](https://kimen.dev/storybook/) ·
[landing with live re-theming](https://kimen.dev/)

## Quickstart

```sh
pnpm add @kimen/elements @kimen/tokens
# or: npm install @kimen/elements @kimen/tokens
```

Register each component from its direct subpath, then load the token core
once, one token sheet for each component, and the page contract:

```ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css/core'; // design tokens + color-scheme: onmars theme, light + dark
import '@kimen/tokens/css/ki-button'; // the tokens of each ki-* tag the page uses
import '@kimen/tokens/css/base'; // page contract: page background, text color, body font, layout before registration

defineKiButton();
```

```html
<ki-button variant="primary">Save</ki-button>
```

The core and the tag sheets are the only requirement. Besides the shared
`--ki-*` tokens, the core declares the `color-scheme` they resolve from, so
the browser paints the canvas, scrollbars and native controls in the same
scheme as the components: a page that loads nothing else stays legible in
light and in dark (measured over every component under a dark system
preference). That declaration is a zero-specificity default — a
`color-scheme` your own CSS sets on the page wins, and the tokens follow it.
Each tag's sheet, named like the element import, carries the component tokens
that tag needs, including those of the components it renders.

The simple alternative is `@kimen/tokens/css` in place of the core and the tag
sheets: every token in one stylesheet, 20.7 KB brotli against 8.1 KB for a
page with one `ki-button`. Use it when a page uses most of the catalog or
renders tags it cannot list in advance, such as agent-generated UI.

`@kimen/tokens/css/base` is the **page contract**, which pages load with the
tokens: it paints the page itself from the semantic tokens — background, text
color and body font — and declares no color scheme. Until the elements
register, it also lays out the items of Kimen groups one per line, so their
labels do not run together.

## Themes and color schemes

The token stylesheets ship the default onmars theme and follow the system
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

Runtime GenUI (A2UI and MCP Apps, which AG-UI streams also carry) injects agent-generated UI
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
| [`@kimen/elements`](./packages/elements) | Published on npm | `<ki-*>` Stencil web components |
| [`@kimen/tokens`](./packages/tokens) | Published on npm | Design tokens (DTCG), primitive → theme → semantic → component |
| [`@kimen/mcp-server`](./packages/mcp-server) | Published on npm | MCP server over stdio: agents list the catalog, validate specs and render them as MCP Apps surfaces |
| [`@kimen/catalog`](./packages/catalog) | Published on npm | Neutral catalog schema + guarded renderer (`validateUiSpec`, `renderUiSpec`, streaming) |
| [`@kimen/emitter`](./packages/emitter) | Published on npm | Emitter kit: prompt, provider-lowered JSON Schema and tool definition from any catalog, plus normalize + single-round repair |
| [`@kimen/adapter-a2ui`](./packages/adapter-a2ui) | Published on npm | A2UI protocol adapter over the guarded renderer |
| [`@kimen/adapter-mcp-apps`](./packages/adapter-mcp-apps) | Published on npm | MCP Apps adapter: Kimen surfaces as self-contained `ui://` resources |
| [`@kimen/react`](./packages/react) | Published on npm | Generated React bindings: typed props, event callbacks, controlled forms |
| [`@kimen/vue`](./packages/vue) | Published on npm | Generated Vue 3 bindings with v-model on the form components |
| [`@kimen/angular`](./packages/angular) | Published on npm | Generated Angular standalone components + ControlValueAccessors (APF, Angular ^22) |
| [`kimen`](./packages/kimen) | Placeholder, private | Future CLI / meta package; npm refuses the unscoped name |

The ten `@kimen/*` packages publish together at one fixed version, and their
dependencies on each other are exact: the emitter and both adapters depend
on `@kimen/catalog` of their own version, and the framework wrappers on
`@kimen/elements`. Install every `@kimen/*` package an application uses at
that same version; the catalog describes the components of its own
`@kimen/elements` release. See [`docs/releasing.md`](./docs/releasing.md).

## For agents

Kimen treats agent legibility as a deliverable. The repository root and
`@kimen/elements` ship [`llms.txt`](./llms.txt), a short index in the
[llms.txt](https://llmstxt.org/) shape: what Kimen is, how to load it, when
to use each component, and a link per component to one Markdown document
with its attributes, slots, parts, events, methods, CSS custom properties,
examples and when-to-use / when-not-to-use guidance.
[`llms-full.txt`](./llms-full.txt), at the repository root and on the site
(the package ships the per-component documents instead), is all of it in one
file, and `packages/elements/generated/custom-elements.json` is the
machine-readable Custom Elements Manifest. All of them are generated from component JSDoc and
token sources, never hand-edited, and the code examples of the packaged
`llms.txt` are executed against packed tarballs during release validation.
Human-readable docs live at the
[documentation site](https://kimen.dev/docs/).

Coding agents can also connect to Kimen directly: the
[`kimen`](./plugins/kimen) plugin carries two agent skills
(`kimen-components` for ordinary pages, `kimen-genui` for the generative UI
layer), and the [`kimen-mcp`](./packages/mcp-server) server lets an agent
list the catalog, validate UI specs and render them. In Claude Code:

```sh
claude plugin marketplace add kimen-dev/kimen
claude plugin install kimen@kimen
```

Setup for Claude Code, Claude Desktop, Codex, Antigravity, OpenCode and
other clients is in
[Connect your agent](https://kimen.dev/docs/guides/connect-agents/).

## Quality bar

Every component ships with real-browser tests (three engines at release),
zero axe-core violations (WCAG 2.2 AA + EN 301 549 target), a single-digit-KB
size budget, tokens-only styling (no hardcoded visual values), and RTL support
by construction. Run `bash scripts/gates/gates-suite.sh` for full local checks
before a pull request. CI requires visual and cross-filesystem checks as part
of the quality and release gates. It runs the part of the suite a change can
affect, and the complete suite for shared infrastructure and nightly on
`main` (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

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
- **available** — Live surface: a long-lived surface stays current through atomic, id-addressed batches validated by the same guardrail, so focus, typed text and scroll survive
- **available** — Kimen MCP server: over stdio, agents list and describe the catalog, validate UI specs with correctable issues and render them as MCP Apps surfaces through the guarded renderer
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:root-readme-status:end -->
