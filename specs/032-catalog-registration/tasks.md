# Tasks: Consumer catalog registration

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X. -->

**Input**: Design documents from `/specs/032-catalog-registration/`
(spec.md, feature.feature, plan.md, research.md, data-model.md,
contracts/registration-api.md, quickstart.md)

**Tests**: MANDATORY, written FIRST and verified failing for the right
reason. Traceability: new test files carry the file-level marker
`// @spec:032-catalog-registration`; every S1–S16 appears in ≥1 test title
in a marked file (`scripts/gates/check-traceability.sh`).

## Phase 1: Setup

- [X] T001 Verify baseline: `pnpm --filter @kimen/catalog test` and `pnpm exec nx run @kimen/catalog:build` green on the branch before any change (records the SC-003 reference state)

## Phase 2: Foundational (Blocking Prerequisites)

*(none — the existing `packages/catalog` infrastructure suffices; the
`Catalog` type extraction happens inside US1's GREEN step to keep RED first)*

---

## Phase 3: User Story 1 - Register components behind a JSON facade (Priority: P1) 🎯 MVP

**Goal**: `createCatalog` produces a catalog that `validateUiSpec` accepts
explicitly; standalone + extend modes; default path unchanged.

**Independent Test**: quickstart.md §1 runs green from the public API alone.

### RED: failing tests first (MANDATORY, Art. III)

- [X] T002 [US1] Create packages/catalog/tests/register.spec.ts with marker `// @spec:032-catalog-registration` and failing tests for S1 (standalone catalog validates acme-kpi-card spec), S2 (extend catalogData, ki-card + acme-kpi-card composition accepted), S3 (no catalog option → "acme-kpi-card" rejected as outside the catalog). Verify each fails for the right reason (createCatalog does not exist; catalog option unknown).

### GREEN: implementation

- [X] T003 [US1] Extract public `Catalog` type and add `createCatalog` happy path (standalone + `extend` option, collision-free merge, snapshot + deep freeze, `CatalogCreationResult`) in packages/catalog/src/register.ts per contracts/registration-api.md
- [X] T004 [US1] Thread catalog-in-use through validation: `validateUiSpec(input, { maxBytes?, catalog? })`, `validatePlainData(data, catalog?)`, `checkNode` entry lookup from parameter in packages/catalog/src/validate.ts (default = built-in `catalogData`; no behavior change without the option)
- [X] T005 [US1] Export new surface from packages/catalog/src/index.ts with complete JSDoc on every member (Art. I: undocumented member = build failure)

**Checkpoint**: S1–S3 green; existing validate.spec.ts untouched and green.

---

## Phase 4: User Story 2 - The definition is hostile input (Priority: P1)

**Goal**: every hostile-definition class rejected fail-closed with named
offenders; created catalogs immutable.

**Independent Test**: the adversarial battery of quickstart.md §3 plus
property test P1.

### RED: failing tests first (MANDATORY, Art. III)

- [X] T006 [P] [US2] Failing tests in packages/catalog/tests/register.spec.ts for S4 (ki-button collision), S5 ("AcmeCard" invalid tag; plus reserved-name and no-hyphen cases), S6 (missing whenToUse), S7 (enum without values), S8 outline (`__proto__`/`constructor`/`prototype` + pollution-free assertion), S9 (function value in constraint), S10 (post-creation mutation attempt does not change validation outcomes)
- [X] T007 [P] [US2] fast-check property test in packages/catalog/tests/register.spec.ts: ∀ arbitrary JSON-like payloads, `createCatalog` either rejects with ≥1 coded issue or returns a deeply frozen catalog whose entries satisfy the entry contract (never throws, never partially registers)

### GREEN: implementation

- [X] T008 [US2] Full definition validation in packages/catalog/src/register.ts: purity-wall crossing via existing `toPlainData` (byte/depth budgets, forbidden keys, non-data), strict entry schema (guidance required, constraint grammar, key≡tag, empty definition), tag rule (conservative custom-element pattern + SVG/MathML reserved names), collision detection (definition-internal shadow + extend base), `RegistrationIssue` codes per data-model.md

**Checkpoint**: S4–S10 + property P1 green; no `Object.freeze` gaps
(mutation test in S10 passes in strict mode).

---

## Phase 5: User Story 3 - Guardrail parity over registered catalogs (Priority: P2)

**Goal**: validation AND render invariants hold identically with an explicit
catalog; version skew and streaming included.

**Independent Test**: quickstart.md §2–§3 render paths; the 028 adversarial
classes parameterized over a registered catalog.

### RED: failing tests first (MANDATORY, Art. III)

- [X] T009 [P] [US3] Failing tests in packages/catalog/tests/register.spec.ts for S11 (unknown prop on acme-kpi-card named) and S12 (acme-invoice-table outside a standalone catalog named)
- [X] T010 [P] [US3] Create packages/catalog/tests/render-registered.spec.ts with marker `// @spec:032-catalog-registration` and failing tests for S13 (happy-dom surface contains acme-kpi-card with projected attributes), S14 (javascript: URL on registered component rejected, surface untouched), S15 (unsupported catalogSchemaVersion fails closed with registered catalog), S16 (streaming push of registered component attaches after validation; invalid chunk halts)
- [X] T011 [P] [US3] fast-check property test in packages/catalog/tests/render-registered.spec.ts: ∀ generated valid specs over an extended catalog, rendered output contains only catalog-member tags and dispatches only declared actions

### GREEN: implementation

- [X] T012 [US3] Thread catalog-in-use through render in packages/catalog/src/render.ts: `RenderOptions.catalog`, `prepare`/`versionDiagnostic` compare against catalog-in-use version, `buildNode` type-pinning reads catalog-in-use, `createStreamingRenderer` captures the catalog at creation (FR-011: never half-applied)

**Checkpoint**: S11–S16 + property P2 green; existing render.spec.ts
untouched and green.

---

## Phase 6: Polish & Cross-Cutting

- [X] T013 [P] Timing sanity check in packages/catalog/tests/render-registered.spec.ts: validation over an extended catalog is not measurably slower than built-in (guards D6's no-cache decision with data)
- [X] T014 [P] Add `consumer-catalog-registration` capability claim (state `available`, evidence: register + render-registered suites) to docs/capabilities.json and regenerate status blocks (018 S13 contract; run the capabilities check gate)
- [X] T015 [P] Document the definition format and registration flow: packages/catalog/README.md section "Registering your own components" (JSON facade example, security model, collision rules, immutability), sync docs/guides/ui-spec.md
- [X] T016 Regenerate machine surfaces (llms.txt via `packages/elements/scripts/build-surfaces.mjs` pipeline) if the catalog README/docs feed them; verify surfaces-sync gate
- [X] T017 Full suite: `bash scripts/gates/gates-suite.sh` EXIT 0 (definition of done, Art. III); confirm check-traceability green for S1–S16 and pre-existing suites unmodified (SC-003)

## Dependencies & Execution Order

- T001 → (T002 → T003 → T004 → T005) → (T006/T007 → T008) → (T009/T010/T011
  → T012) → T013–T017
- US1 before US2's GREEN (T008 refactors the T003 happy path); US3's render
  threading is independent of US2 but its RED tests reuse `createCatalog`,
  so US3 runs after US1. Single writer, one branch — no cross-worktree
  parallelism needed.
- "Done" = consolidated fast quality exits 0 (T017).

## Notes

- Every S1–S16 maps to a test task: S1–S3→T002, S4–S10→T006/T007,
  S11–S12→T009, S13–S16→T010/T011.
- Mutation (daily) will pick up register.ts + validate/render deltas as
  changed core logic; surviving mutants there are findings (Art. VIII).
- Commit after each phase checkpoint.
