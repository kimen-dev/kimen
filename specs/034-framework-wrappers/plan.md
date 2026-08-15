# Implementation Plan: Framework wrappers

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI and
     Art. III's fast quality path. -->

**Branch**: `feat/034-framework-wrappers` (off `main`, independent of the in-flight 032/033 PRs) | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

## Summary

Three generated wrapper packages via Stencil's official output targets,
wired into `packages/elements/stencil.config.ts` and emitted into sibling
packages: `@kimen/react` (react-output-target 1.6.2, @lit/react-based
runtime, `'use client'`, typed event props), `@kimen/vue`
(vue-output-target 0.14.1, `componentModels` for v-model over the
components' re-dispatched native `input`/`change` events), `@kimen/angular`
(angular-output-target 1.4.1, `outputType: 'standalone'`, value accessors,
ng-packagr 22 / Angular 22 build — the TS 6.0.3 alignment). Generated
sources committed and drift-gated via a new `wrappers` group in the
existing generated-sync mechanism. Client-side only (no hydrate options).
All facts research-pinned (research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 strict; ESM-only

**Primary Dependencies**: `@stencil/react-output-target` 1.6.2, `@stencil/vue-output-target` 0.14.1, `@stencil/angular-output-target` 1.4.1 (exact pins, devDeps of elements; react target also a runtime dep of @kimen/react); framework peers: react/react-dom `^18 || ^19`, vue `>=3.4.38`, @angular/core+forms `^22`; build tooling: tsc (react/vue), ng-packagr 22.1.1 (angular)

**Storage**: N/A

**Testing**: behavioral scenarios in REAL Chromium (frontend-qa: happy-dom lies about shadow DOM/custom elements) via per-package vitest browser configs reusing the elements Playwright provider pattern; structural/determinism/packaging scenarios in node; Angular S6 via TestBed + zone.js under vitest browser, with a documented directive-level fallback if the TestBed path proves flaky

**Target Platform**: evergreen browsers, client-side only (SSR/DSD deferred — no hydrateModule anywhere)

**Project Type**: three new workspace packages `packages/{react,vue,angular}`, Nx tags `scope:wrapper` (may depend on `scope:elements` only)

**Performance Goals**: wrappers are thin bindings; no new budgets on elements (dist-custom-elements config untouched — see D6)

**Constraints**: elements' existing public surface byte-compatible except additive exports entry (`./components/*.js`); generated sources committed + drift-gated; no hand-edits to generated files; camelCase-mapping risk on the three dash-cased events verified empirically (D8)

**Scale/Scope**: 29 components × 3 frameworks; 12 scenarios S1–S12

## Constitution Check

- **Art. I — one source of truth**: wrappers ARE the constitution's named generated artifacts; generation runs inside the elements build; committed, diffable, and drift-gated by a new `wrappers` group in `scripts/gates/check-generated-sync.mjs` (same mechanism as catalog/surfaces — no new gate class, an extension of the existing one).
- **Art. II (NON-NEGOTIABLE)**: `specs/034-framework-wrappers/feature.feature` (12 scenarios, lint-green, pre-plan PASS).
- **Art. III (NON-NEGOTIABLE)**: RED first per scenario group; behavioral tests in real Chromium; determinism and coverage tests deterministic in node; traceability `@spec:034-framework-wrappers`.
- **Art. IV**: wrappers are the article's own mandate ("generated framework wrappers"); no ARIA/semantic surface added; elements' budgets untouched (D6).
- **Art. V**: N/A — no new interaction surface (wrapped components own their contracts).
- **Art. VI**: N/A — no visual values.
- **Art. VII**: three packages generated from config — near-zero hand-written code; REJECTED: hand-written wrapper helpers, Svelte/Solid wrappers (native path documented instead), SSR options (deferred bet), per-framework demo apps in-repo.
- **Art. VIII**: untouched; wrappers do not enter catalog/renderer paths (boundary tags enforce: `scope:wrapper` cannot import catalog).
- **Art. IX**: three new packages, first release; wrapper versions track elements'. Elements gains only an additive exports entry. Packaging validated mechanically (publint/attw for react/vue; APF via ng-packagr for angular).
- **Art. X (NON-NEGOTIABLE)**: existing gates cover (typecheck, lint, boundaries, tests, sync); wrappers-sync joins the existing generated-sync gate run; no new repo-wide gate class.
- **Art. XI (NON-NEGOTIABLE)**: interactive founder-mandated implementation; no new credentials.

**Definition of done (Art. III)**: `bash scripts/gates/gates-suite.sh` exits 0
and the founder accepts the change.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): three NEW packages (first release), each a generated projection of the elements' API; wrapper SemVer tracks the elements' SemVer. No change to any existing package surface.
- **Bundle budget** (Art. IV): wrappers are thin generated bindings; the per-component budget continues to bind the elements. Wrapper runtime overhead is bounded and measured at plan time.
- **Accessibility** (Art. V): unchanged — produced by the wrapped components; wrappers add no interaction surface.
- **Tokens** (Art. VI): none; wrappers carry no styling.
- **Catalog/agent legibility** (Art. I): wrappers are named generated artifacts; committed, diffable, sync-gated. `llms.txt`/docs gain the wrapper usage surface.
- **Guardrail/security boundary** (Art. VIII): untouched — wrappers do not interact with the catalog or renderer paths.

## Project Structure

### Documentation (this feature)

```text
specs/034-framework-wrappers/
├── spec.md · feature.feature · plan.md · research.md · tasks.md
```

### Source Code (repository root)

```text
packages/elements/stencil.config.ts   # + three output targets (only elements change besides exports map)
packages/elements/package.json        # + "./components/*.js" exports entry (additive)
packages/react/
├── package.json                      # deps: @stencil/react-output-target, @kimen/elements; peers react(+dom) ^18||^19
├── tsconfig.json                     # moduleResolution bundler (target requirement), tsc build
├── src/components.ts                 # GENERATED ('use client', createComponent per element)
├── src/index.ts                      # re-export (hand-written shell, minimal)
└── tests/                            # browser: S1, S2, S7, S11 · node: S4 (tsc fixture), S8, S10
packages/vue/
├── package.json                      # deps: @stencil/vue-output-target, @kimen/elements; peers vue >=3.4.38 (+ vue-router types dev)
├── src/index.ts                      # GENERATED proxies (esModules per-component)
└── tests/                            # browser: S3, S5, S11-analog · node: S8, S10
packages/angular/
├── package.json                      # peers @angular/core+forms ^22; build ng-packagr 22
├── ng-package.json · tsconfig.lib.json
├── src/directives/{proxies.ts,index.ts}  # GENERATED (standalone components + value accessors)
├── src/index.ts
└── tests/                            # S6 (TestBed under vitest, zone.js; fallback documented) · S8
scripts/gates/check-generated-sync.mjs # + wrappers group (react/vue/angular generated files)
```

**Structure Decision**: Ionic's sibling-package pattern; flat ng-packagr
library for Angular (no @angular/cli workspace — Ionic precedent). Build
order elements → wrappers via Nx `dependsOn`. Wrapper tests copy the
elements browser-mode harness (Playwright provider) per package.

## Complexity Tracking

| Concern | Why accepted | Simpler alternative rejected because |
|---|---|---|
| Angular toolchain (ng-packagr 22 + @angular devDeps) | APF is the only correct Angular library format (Ionic precedent; raw tsc fights the CLI) | tsc-only Angular package would break AOT/partial-Ivy consumers |
| Per-package browser test configs | happy-dom lies about shadow DOM; behavioral scenarios need real Chromium (frontend-qa [Always]) | node-only tests would assert wrapper glue against a fake DOM |
