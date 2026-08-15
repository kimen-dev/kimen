# Implementation Plan: Emitter kit

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's fast quality path. -->

**Branch**: `feat/033-emitter-kit` (stacked on `feat/032-catalog-registration`) | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/033-emitter-kit/spec.md`.

## Summary

New package `@kimen/emitter`: five pure functions deriving model-guidance
artifacts and ingest helpers from any `Catalog` value — `catalogPrompt`,
`uiSpecJsonSchema` (targets `draft-2020-12` default / `openai-strict` /
`anthropic-strict` with bounded unroll), `uiSpecTool`, `normalizeEmission`,
`repairPrompt`. JSON Schema documents are constructed DIRECTLY from catalog
data (no Zod, no z.toJSONSchema): full control over dialect and lowering,
zero runtime dependencies beyond `@kimen/catalog`, deterministic output.
Result-object error style mirrors `createCatalog` (032). Design per the
research synthesis and the emitter-patterns report (provider subsets
verified 2026-08).

## Technical Context

**Language/Version**: TypeScript strict (TS 6, `tsc -b`), ESM-only

**Primary Dependencies**: runtime: `@kimen/catalog` (workspace) only. Dev: `vitest`, `fast-check` 4.9.0, `ajv` (2020-12 validator for schema-behavior tests), `@types/node`

**Storage**: N/A

**Testing**: Vitest 4 node environment (no DOM needed — pure data), fast-check seeded properties, ajv as the independent JSON Schema oracle; traceability `// @spec:033-emitter-kit` + S-IDs in titles

**Target Platform**: any JS runtime (no DOM/network/model calls)

**Project Type**: new workspace package `packages/emitter`, Nx tag `scope:emitter`

**Performance Goals**: derivation is one-shot integration-time work; determinism (S11) matters more than speed; no hot path

**Constraints**: no runtime dep beyond catalog; no protocol vocabulary; provider limits enforced with named offenders (never silent truncation); one-round repair fixed

**Scale/Scope**: catalogs of ~10² components; 15 scenarios S1–S15

## Constitution Check

- **Art. I — AI-First, one source of truth**: the kit derives every artifact from the catalog value — the same single source the boundary uses; guidance flows verbatim; determinism (FR-008) is the reproducibility bar. New public members ship complete JSDoc. `docs/genui-surfaces.json` gains the package block so the root `llms.txt` covers it (regenerated, surfaces-sync sealed).
- **Art. II — Proportionate contracts (NON-NEGOTIABLE)**: `specs/033-emitter-kit/feature.feature` (15 scenarios, lint-green, pre-plan PASS) — new public package surface, squarely mandatory.
- **Art. III — Test-first (NON-NEGOTIABLE)**: RED per scenario group before each module exists; ajv is the independent oracle for schema behavior; seeded fast-check agreement property (SC-002); deterministic (no time, no randomness without seed).
- **Art. IV — Web standards & lightness**: no component, no DOM; package budget via existing size-limit machinery; ZERO new runtime dependency (schema built by hand — justification: full dialect control + no version coupling; ajv stays devDependency-only as test oracle).
- **Art. V — Accessibility (NON-NEGOTIABLE)**: N/A — nothing renders.
- **Art. VI — Closed tokens**: N/A — no visual values; artifacts carry no styling surface (027 FR-006 upheld).
- **Art. VII — Simplicity & anti-abstraction**: five functions, one options bag, fixed one-round repair policy, no plugin hooks, no provider SDK wrappers; REJECTED: z.toJSONSchema pipeline (drags zod + post-processing for less control), partial-JSON healing (deferred, demand-gated), A2UI export (adapter territory), configurable retry policies.
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol vocabulary (provider TARGET names are model-provider dialects, not GenUI protocols; they live in the emitter precisely so catalog/adapters stay clean); the kit adds no enforcement path — advisory tooling with the disclaimer contract (FR-011); consistency with the boundary is property-tested, not assumed.
- **Art. IX — Public API stability**: first release of a new package surface; artifact shapes and option names are public API; catalog-version skew refused fail-closed (FR-007); packaging correctness via publint/attw machinery at release.
- **Art. X — Deterministic 20/80 automation (NON-NEGOTIABLE)**: covered by existing gates (typecheck, lint, boundaries, tests, size-limit, surfaces-sync, capabilities); no new repo-wide gate.
- **Art. XI — Operational security (NON-NEGOTIABLE)**: interactive founder-mandated implementation; no credentials; no network.

**Definition of done (Art. III)**: `bash scripts/gates/gates-suite.sh` exits 0
and the founder accepts the change.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): a NEW package (first release): prompt, schema, tool, normalization and repair derivations plus their option and artifact types. No change to any existing package's surface; `@kimen/catalog` gains a consumer, not an export.
- **Bundle budget** (Art. IV): no runtime dependency beyond the catalog package (schema documents are constructed directly from catalog data); size measured by the existing size-limit machinery for the new package.
- **Accessibility** (Art. V): N/A — no rendered surface.
- **Tokens** (Art. VI): none; artifacts carry no styling surface.
- **Catalog/agent legibility** (Art. I): the kit IS agent legibility as a product: one source (the catalog) derives every model-facing artifact; guidance flows verbatim; determinism is contract (S11).
- **Guardrail/security boundary** (Art. VIII): the kit touches no enforcement path and adds none; S8/S13 pin consistency WITH the boundary and FR-011 pins the advisory disclaimer. The agreement between schema and validator is tested (SC-004) so the two can never drift silently.

Mapping: API delta → contracts/emitter-api.md; budget → zero-dep constraint + size-limit task; legibility → surfaces block + JSDoc tasks; boundary consistency → agreement-property + self-consistency test tasks.

## Project Structure

### Documentation (this feature)

```text
specs/033-emitter-kit/
├── spec.md · feature.feature · plan.md · research.md
├── data-model.md · quickstart.md · contracts/emitter-api.md · tasks.md
```

### Source Code (repository root)

```text
packages/emitter/
├── package.json           # @kimen/emitter, deps: @kimen/catalog; ESM-only; sideEffects false
├── tsconfig.json / tsconfig.lib.json  # mirror packages/catalog
├── vitest.config.ts       # node environment (no DOM)
├── src/
│   ├── index.ts           # public exports + package JSDoc
│   ├── issues.ts          # EmitterIssue codes + DerivationResult
│   ├── schema.ts          # uiSpecJsonSchema: default dialect + lowerings + limits
│   ├── prompt.ts          # catalogPrompt (guidance verbatim + validated example)
│   ├── tool.ts            # uiSpecTool (wraps schema.ts)
│   └── emission.ts        # normalizeEmission + repairPrompt
└── tests/
    ├── schema.spec.ts     # S1-S6, S10-S12, S15 (+ajv oracle, agreement property)
    ├── prompt.spec.ts     # S7, S8, S10, S11
    └── emission.spec.ts   # S9, S13, S14
```

Workspace wiring: `pnpm-workspace.yaml` already globs `packages/*`; Nx tag
`scope:emitter` added to `eslint.config.mjs` module-boundary depConstraints
(`scope:emitter` → may depend on `scope:catalog` only); size-limit and knip
pick the package up per existing repo conventions (verified during
implementation; wired where registration is explicit).

**Structure Decision**: new leaf package beside the catalog; the catalog
package is untouched (no new exports needed — `Catalog`,
`CATALOG_SCHEMA_VERSION`, `validateUiSpec`, `catalogData` already public).

## Complexity Tracking

No violations. (Hand-built JSON Schema is less machinery than the Zod
conversion path, not more; ajv is test-only.)
