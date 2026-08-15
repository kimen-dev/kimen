# Tasks: Framework wrappers

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X. -->

**Input**: Design documents from `/specs/034-framework-wrappers/`

**Tests**: MANDATORY, first, verified failing for the right reason.
Traceability: `// @spec:034-framework-wrappers` markers; S1–S12 in test
titles. Behavioral scenarios run in REAL Chromium (frontend-qa).

## Phase 1: Setup

- [ ] T001 Install exact-pinned output targets as elements devDeps (@stencil/react-output-target 1.6.2, @stencil/vue-output-target 0.14.1, @stencil/angular-output-target 1.4.1); add `"./components/*.js"` additive exports entry to packages/elements/package.json (D6)
- [ ] T002 Scaffold packages/react, packages/vue, packages/angular per plan structure (package.json with peers/deps per D2–D4, tsconfigs, ng-package.json + Angular 22/ng-packagr 22.1.1 devDeps for angular, vitest configs: browser per elements pattern + node); Nx tag `scope:wrapper` + boundary depConstraint (wrapper → elements only) in eslint.config.mjs; tests/tsconfig.json per package

## Phase 2: Foundational — generation wired (blocking)

- [ ] T003 Add the three output targets to packages/elements/stencil.config.ts exactly per research D2–D4 (no hydrate options); run the elements build; commit generated sources (S8 precondition)
- [ ] T004 EMPIRICAL CHECK (D5): inspect generated React components for the three dash-cased events (ki-dismiss/ki-close/ki-change) — record verdict in research.md; if the mapping is malformed, apply fallback (b) (unmapped + documented) without hand-editing generated files

**Checkpoint**: three wrapper packages hold committed generated sources; elements build green.

---

## Phase 3: US1 - Idiomatic typed usage (P1)

### RED (Art. III)

- [ ] T005 [P] [US1] packages/react/tests/react.browser.spec.tsx (`@spec:034-framework-wrappers`): failing S1 (render KiButton variant→attribute), S2 (dash-cased custom event through callback prop — per T004 verdict, or ref+addEventListener documented path), S11 (import only KiButton → registry defines ki-button, not ki-dialog)
- [ ] T006 [P] [US1] packages/vue/tests/vue.browser.spec.ts: failing S3 (KiBadge tone→attribute)
- [ ] T007 [P] [US1] packages/react/tests/types.spec.ts (node): S4 — tsc --noEmit fixture with @ts-expect-error on an out-of-union enum prop value

### GREEN

- [ ] T008 [US1] Make the browser harnesses run (register via generated per-component imports; fix config, not generated code); hand-written shells (src/index.ts re-exports) complete with JSDoc

**Checkpoint**: S1–S4 + S11 green in Chromium/node.

---

## Phase 4: US2 - Form idiom round trips (P1)

### RED

- [ ] T009 [P] [US2] packages/vue/tests: failing S5 (v-model on ki-input: dispatch composed input event → model updates; set model → element value updates)
- [ ] T010 [P] [US2] packages/react/tests: failing S7 (controlled ki-input via onInput + value state round trip)
- [ ] T011 [US2] packages/angular/tests: failing S6 (TestBed + zone.js under vitest: reactive form + ki-checkbox accessor round trip; fallback per research D8 if TestBed path is flaky — document which path ran)

### GREEN

- [ ] T012 [US2] componentModels / valueAccessorConfigs tuning until round trips pass (config-level only; regenerate)

**Checkpoint**: S5–S7 green.

---

## Phase 5: US3 - Generation, drift, packaging (P2)

### RED

- [ ] T013 [P] [US3] Node tests (any wrapper package or scripts test dir): failing S8 (every CEM custom element exported by each wrapper — parse generated sources per package), S10 (regeneration in a temp checkout byte-identical to committed sources)
- [ ] T014 [US3] Extend scripts/gates/check-generated-sync.mjs with the `wrappers` group (generated file lists of the three packages) + wire into gates-core; S9 test per 027 precedent (hand-edit → gate names the artifact)

### GREEN

- [ ] T015 [US3] S12: publint + attw green on packed @kimen/react and @kimen/vue; ng-packagr build green for @kimen/angular with APF shape assertions (fesm + types + partial-Ivy flag); wire wrapper builds into Nx (dependsOn elements)

**Checkpoint**: S8–S12 green; drift gate live.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T016 [P] Docs: packages/{react,vue,angular}/README.md (usage, form idiom, peer ranges, zoneless note, client-side-only disclaimer, no-wrapper native path); update packages/elements/docs/frameworks.mdx + site frameworks.mdx from "planned" to real usage; root README package table rows; roadmap wrapper mention
- [ ] T017 [P] docs/capabilities.json: `framework-wrappers` claim available with evidence + regenerate status blocks; genui-surfaces untouched (wrappers are not GenUI surface)
- [ ] T018 Full `bash scripts/gates/gates-suite.sh` EXIT 0; traceability S1–S12 green

## Dependencies

T001 → T002 → T003 → T004 → (T005/T006/T007 → T008) → (T009/T010/T011 →
T012) → (T013/T014 → T015) → T016–T018. Single writer, one branch.
