# Implementation Plan: Consumer catalog registration

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's fast quality path.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Branch**: `feat/032-catalog-registration` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/032-catalog-registration/spec.md`.

## Summary

Open the closed neutral catalog through one pure, fail-closed registration
entry point: `createCatalog(definition, options?)` validates a data-only
consumer definition through the existing purity wall plus a strict schema,
snapshots and deep-freezes the result (standalone, or merged over a base
catalog with hard collision rejection), and returns an immutable `Catalog`
value. The validation boundary (`validateUiSpec`) and both renderers
(`renderUiSpec`, `createStreamingRenderer`) gain an explicit optional
`catalog` and resolve every catalog-derived behavior — membership, prop
constraints, `type`-pinning, version skew — from the catalog in use,
defaulting to the built-in generated catalog with byte-identical behavior.
Design follows the research synthesis (pure functional value, no mutable
registry, entries-as-contracts, registration as trust barricade).

## Technical Context

**Language/Version**: TypeScript strict (TS 6, `tsc -b`), ESM-only (matches package `type: module`)

**Primary Dependencies**: `zod@4.4.3` (already the declared boundary bet; no new runtime dependency)

**Storage**: N/A

**Testing**: Vitest 4 (`vitest run` in `packages/catalog`, happy-dom for render surfaces), fast-check for property tests (already a workspace devDependency via the declared bets); traceability via `@spec:032-catalog-registration` file headers + S-IDs in test titles

**Target Platform**: framework-agnostic ESM library; render path client-side DOM (happy-dom in tests, evergreen browsers in production)

**Project Type**: catalog (guardrail/GenUI boundary package `packages/catalog`, Nx tag `scope:catalog`)

**Performance Goals**: catalog resolution stays O(1) map lookup per node; registration cost is one-time (snapshot + freeze); no measurable regression in `validateUiSpec`/`renderUiSpec` hot paths on the default catalog (asserted by keeping the existing suites green and a timing sanity check in the new suite)

**Constraints**: no new runtime dependency; no mutable module state; no code-execution path from definition data; default-path behavior byte-identical (SC-003); protocol-neutral surface (FR-009)

**Scale/Scope**: definitions up to the existing validation byte budget (262 144 bytes); catalogs of ~10² entries; 16 scenarios S1–S16

## Constitution Check

- **Art. I — AI-First, one source of truth**: no generated artifact changes shape; the generated catalog stays the single derivation of built-in entries, and `createCatalog` reuses the SAME entry contract (`CatalogEntry`) rather than introducing a second format. Every new public API member ships complete JSDoc (undocumented member = build failure). `llms.txt` regenerates via the existing surfaces pipeline when the catalog README/docs change.
- **Art. II — Proportionate behavior contracts (NON-NEGOTIABLE)**: `specs/032-catalog-registration/feature.feature` (16 scenarios, lint-green, pre-plan gate PASS) is the contract; this is a public API + security-boundary change, squarely inside Art. II's mandatory band. Entire scenario set flagged for founder gate-1 attention.
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED first — the S1–S16 traced tests land failing before `register.ts` exists; the adversarial battery (S4–S10) plus property tests (fast-check) are part of the suite, not an afterthought; mutation (daily) will cover `register.ts` and the parametrized validate/render paths as changed core logic.
- **Art. IV — Web standards & lightness**: no component, no ARIA surface; KB impact confined to `@kimen/catalog` (one new module, no new deps); no barrel-file change beyond adding exports to the existing entry point.
- **Art. V — Accessibility (NON-NEGOTIABLE)**: N/A — no rendered surface of its own; registered components' accessibility is their author's contract (documented limitation in spec + docs).
- **Art. VI — Closed tokens, layered customization**: N/A — no visual values; the spec format still exposes no styling surface (027 FR-006 unchanged).
- **Art. VII — Simplicity & anti-abstraction**: one entry point, one options bag, result-object error reporting matching `validateUiSpec`'s existing style; REJECTED: mutable global registry, per-component validator callbacks/hooks, unregister/override, build-time CEM CLI (deferred), precompiled per-entry Zod prop schemas (the hand-rolled `checkProp` is already O(1) and branch-light; a cache is speculative until a benchmark demands it — recorded in research.md).
- **Art. VIII — Neutral catalog, disposable adapters**: this IS a guardrail change; the plan preserves every invariant (enumerated in research.md §security-invariants) and adds the registration door at the same bar: purity wall + strict schema + deep freeze + fail-closed named rejections. No protocol vocabulary enters the package; adapters are untouched.
- **Art. IX — Public API stability**: additive MINOR on `@kimen/catalog`'s (pre-1.0) surface: `createCatalog`, `Catalog`, `CatalogDefinition`, `RegistrationIssue`/result types, `catalog` option on `validateUiSpec`/`RenderOptions`. No existing signature changes shape; default behavior identical (SC-003). Packaging correctness re-validated by the existing packaging gate at release.
- **Art. X — Deterministic 20/80 automation (NON-NEGOTIABLE)**: covered by the existing gate suite (typecheck, lint, tests, catalog-sync, public-API check, module boundaries). No new repository-wide gate: the new adversarial classes live as regression tests inside the catalog suite, which the consolidated quality workflow already runs.
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: interactive implementation in this session (founder-mandated), no unattended loop; no new credential surface; no permission bypass.

**Definition of done (Art. III)**: `bash scripts/gates/gates-suite.sh` exits 0
and the founder accepts the change. Mutation is daily; packaging and the full
browser matrix are release checks.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): additive — a registration entry point, the definition format, and a catalog option on the validation and render surfaces. No existing signature changes shape; default-path behavior is byte-for-byte compatible. MINOR under the package's SemVer; this spec supersedes the closed-catalog *assumption* of 027 S5 while preserving its behavior on the default path (S3).
- **Bundle budget** (Art. IV): no new runtime dependency (existing Zod at the boundary suffices); KB impact of the registration module measured at plan time against the catalog package's budget.
- **Accessibility** (Art. V): no rendered surface of its own. Registered components' accessibility is their author's contract; the catalog transports guidance verbatim (documented limitation).
- **Tokens** (Art. VI): none introduced; the spec format still exposes no styling surface, so token-layer theming remains the only appearance channel for registered components too.
- **Catalog/agent legibility** (Art. I): guidance fields are mandatory for registered entries (FR-003); the definition format itself is documented to the "an agent can author it from the docs alone" bar (FR-010).
- **Guardrail/security boundary** (Art. VIII): the entire spec IS a guardrail change: registration opens the catalog without weakening any invariant (FR-002, FR-007, FR-008). All sixteen scenarios require explicit founder confirmation at gate 1; S4–S10 are the new adversarial surface, S11–S16 are the parity proof.

Each obligation maps to plan work: API delta → contracts/registration-api.md;
budget → no-new-deps constraint + existing packaging gate; legibility → JSDoc
+ docs task; guardrail → research.md invariants + the S4–S16 test categories
in tasks.md.

## Project Structure

### Documentation (this feature)

```text
specs/032-catalog-registration/
├── spec.md              # Behavior contract (approved shape)
├── feature.feature      # 16 scenarios, lint-green
├── plan.md              # This file
├── research.md          # Phase 0: decisions + rationale + rejected alternatives
├── data-model.md        # Phase 1: entities (Catalog, CatalogDefinition, issues)
├── quickstart.md        # Phase 1: end-to-end validation guide
├── contracts/
│   └── registration-api.md  # Phase 1: public API contract
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/catalog/
├── src/
│   ├── index.ts         # + createCatalog, Catalog, CatalogDefinition, RegistrationIssue exports
│   ├── register.ts      # NEW: definition schema, purity-wall crossing, collision/name checks, snapshot+freeze
│   ├── validate.ts      # checkNode/validatePlainData/validateUiSpec parametrized by catalog-in-use
│   ├── render.ts        # RenderOptions.catalog; versionDiagnostic/buildNode/prepare read catalog-in-use
│   └── generated/catalog.ts  # UNCHANGED (still the built-in derivation; never hand-edited)
└── tests/
    ├── register.spec.ts          # NEW: S1–S12 (+ property tests, negative battery)
    ├── render-registered.spec.ts # NEW: S13–S16 (render parity over registered catalogs)
    ├── validate.spec.ts          # UNCHANGED (SC-003 default-path proof)
    ├── render.spec.ts            # UNCHANGED (SC-003)
    └── catalog.spec.ts           # UNCHANGED
```

**Structure Decision**: everything lands inside `packages/catalog` (Nx tag
`scope:catalog`); no new package, no boundary change. The generated artifact
and its generator are untouched — registration is a runtime surface beside
the build-time derivation, sharing the entry contract types from
`validate.ts`.

## Complexity Tracking

No constitutional violations to justify. (The one candidate — a second Zod
schema for definitions — is not a violation: Zod is the declared bet at this
exact boundary, and the definition schema guards a new trust door.)
