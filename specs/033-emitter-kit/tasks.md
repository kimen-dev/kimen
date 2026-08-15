# Tasks: Emitter kit

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X. -->

**Input**: Design documents from `/specs/033-emitter-kit/`

**Tests**: MANDATORY, first, verified failing for the right reason.
Traceability: `// @spec:033-emitter-kit` file markers; S1–S15 in test titles.

## Phase 1: Setup

- [ ] T001 Scaffold packages/emitter (package.json `@kimen/emitter` deps `@kimen/catalog` workspace, ESM, sideEffects false, private:true pending release decision; tsconfig + vitest node env mirroring catalog; devDeps vitest/fast-check 4.9.0/ajv exact pins); wire Nx tag `scope:emitter` + module-boundary depConstraint (emitter → catalog only) in eslint.config.mjs; verify typecheck/lint/knip/size-limit pick the package up

## Phase 2: Foundational

- [ ] T002 src/issues.ts: EmitterIssue/EmitterIssueCode/Derivation<T> + shared guards (skew check vs CATALOG_SCHEMA_VERSION, subset resolution) — shared by every user story; complete JSDoc

---

## Phase 3: US1 - Any model gets valid specs from the catalog (P1) 🎯 MVP

### RED (Art. III)

- [ ] T003 [US1] tests/schema.spec.ts (`@spec:033-emitter-kit`): failing S1 (ajv-2020 accepts valid ki-card+ki-badge spec), S2 (rejects acme-invoice-table), S3 (tone enum closed, "sparkly" rejected), S4 (subset with unknown component → unknown-component), S10 (schema $id carries catalog schema version), S11 (byte-identical double derivation), S12 (skewed catalog refused naming both versions)
- [ ] T004 [P] [US1] tests/prompt.spec.ts: failing S7 (guidance verbatim incl. registered acme-kpi-card via createCatalog extend), S8 (embedded example validates via validateUiSpec), S10/S11 for the prompt artifact

### GREEN

- [ ] T005 [US1] src/schema.ts: default-dialect builder (root/version const/actions/node $defs per component, closed objects, child anyOf, version-stamped $id) + guards from T002
- [ ] T006 [US1] src/prompt.ts: deterministic prompt builder (rules + per-entry blocks + example built from the catalog's first entries, validated in tests)
- [ ] T007 [US1] src/index.ts exports with complete JSDoc

**Checkpoint**: S1–S4, S7–S8, S10–S12 green.

---

## Phase 4: US2 - Provider-strict modes (P1)

### RED

- [ ] T008 [US2] tests/schema.spec.ts: failing S5 (openai-strict: every object additionalProperties:false + full required), S6 (anthropic-strict: no ref cycles, depth bound declared), S15 (synthetic enum-heavy catalog → provider-limit naming component)
- [ ] T009 [P] [US2] tests/emission.spec.ts (`@spec:033-emitter-kit`): failing S13 (null-prop emission normalizes then validates)

### GREEN

- [ ] T010 [US2] src/schema.ts: openai-strict lowering (all-required + null unions, limits table with named offenders) + anthropic-strict lowering (bounded unroll node1..nodeN, leaf text-only, bound in description/$comment)
- [ ] T011 [US2] src/emission.ts: normalizeEmission (strip null props + empty optional containers, non-placeholder values untouched)

**Checkpoint**: S5, S6, S13, S15 green.

---

## Phase 5: US3 - Reliability loop closes (P2)

### RED

- [ ] T012 [US3] tests/emission.spec.ts: failing S9 (uiSpecTool wraps exact schema for same options; name+description+version stamp), S14 (repair message names every code/path/offender, requests exactly one corrected emission; null on ok)
- [ ] T013 [P] [US3] tests/schema.spec.ts: seeded fast-check agreement property (SC-002): generated specs accepted by ajv(schema) are accepted by validateUiSpec or rejected only by schema-inexpressible rules

### GREEN

- [ ] T014 [US3] src/tool.ts (uiSpecTool) + src/emission.ts repairPrompt (single-round wording fixed)

**Checkpoint**: S9, S14 + agreement property green.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T015 [P] packages/emitter/README.md (integration flows per provider mode, reliability loop, SECURITY MODEL disclaimer per FR-011) + docs/guides/emitting-specs.md + link from ui-spec guide
- [ ] T016 [P] docs/genui-surfaces.json: emitter package block (entryPoints verified against src/index.ts); docs/capabilities.json: `emitter-kit` claim available with evidence; regenerate capabilities + llms.txt (elements build)
- [ ] T017 Full `bash scripts/gates/gates-suite.sh` EXIT 0; traceability S1–S15 green

## Dependencies

T001 → T002 → (T003/T004 → T005/T006/T007) → (T008/T009 → T010/T011) →
(T012/T013 → T014) → T015–T017. Single writer, stacked branch.
