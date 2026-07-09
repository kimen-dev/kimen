---

description: "Task list template for feature implementation (Kimen override)"
---

# Tasks: [FEATURE NAME]

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md with Gherkin scenarios (required), research.md, contracts/

**Tests**: MANDATORY, never optional (constitution Art. II/III). Tests are written
FIRST and verified failing for the right reason before any implementation. Every
scenario ID (S1..Sn) from feature.feature appears in at least one test
(traceability is a CI gate). Traceability convention: each test file declares the
feature it traces with a file-level marker comment `@spec:[###-feature-name]`
(e.g. `// @spec:007-ki-button`); bare S-IDs inside a marked file count toward
that feature only, so S1 of one feature never satisfies S1 of another
(scripts/gates/check-traceability.sh). Tests run in a REAL browser for
components, are deterministic (fake timers, seeded randomness, no live network)
and assert behavior through public APIs only.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions (Kimen monorepo)

- Components: `packages/elements/src/components/ki-[name]/` (created via Nx generator, never by hand)
- Tokens: `packages/tokens/` · Catalog & guardrail: `packages/catalog/` · Adapters: `packages/adapter-[protocol]/`
- Specs live in `specs/[###-feature-name]/`; component tests co-located with the component

<!--
  The tasks below are SAMPLE structure. The /speckit-tasks command MUST replace
  them with actual tasks derived from spec.md (user stories + scenario IDs),
  plan.md and contracts/. DO NOT keep sample tasks in the generated tasks.md.
-->

## Phase 1: Setup

- [ ] T001 Scaffold via Nx generator (structure + gate wiring reproducible, Art. X)
- [ ] T002 [P] Verify deterministic layer passes on scaffold (lint, typecheck, boundaries)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: shared infrastructure that MUST be complete before ANY user story

- [ ] T003 [Foundational work derived from plan.md]

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [What this story delivers]

**Independent Test**: [How to verify this story on its own]

### RED: failing tests first (MANDATORY, Art. III)

> Write these tests FIRST. Verify each fails FOR THE RIGHT REASON before implementing.

- [ ] T010 [P] [US1] Browser test covering S1, S2 (core behavior) in ki-[name].spec.ts
- [ ] T011 [P] [US1] Keyboard-path test covering S_ (tab order, activation, focus visible)
- [ ] T012 [P] [US1] Assistive-tech outcome test covering S_ (roles/names/states via accessibility tree)
- [ ] T013 [P] [US1] Form participation test covering S_ (ElementInternals: value, validity, form submit) — when applicable
- [ ] T014 [P] [US1] Theming test covering S_ (semantic token reassignment propagates)

### GREEN: implementation

- [ ] T015 [US1] Implement [component/logic] in packages/[...]
- [ ] T016 [US1] JSDoc complete on public API (description, default, when-to-use/when-NOT-to-use) — undocumented member = build failure (Art. I)

### Component quality gates (per story)

- [ ] T017 [US1] axe scan zero violations (floor, not proof — Art. V)
- [ ] T018 [US1] Manual APG walkthrough documented in PR — only for NEW interaction patterns (Art. V)
- [ ] T019 [US1] Regenerate machine surfaces (017): build regenerates docs-json (normalized) → generated/custom-elements.json → llms.txt; committed and verified by the surfaces-sync gate (Art. I; Zod catalog is Fase 3)
- [ ] T020 [US1] size-limit budget check: single-digit KB gzipped (Art. IV)
- [ ] T021 [US1] Mutation score ≥70% on changed core logic (Stryker incremental, Art. III)

**Checkpoint**: User Story 1 fully functional; all gates exit 0

---

[Add more user story phases as needed, following the same RED → GREEN → gates pattern]

---

## Phase N: Polish & Cross-Cutting

- [ ] TXXX [P] Docs regeneration verified (generated, never hand-edited — Art. I)
- [ ] TXXX Refactor pass (duplication rule: extract on third occurrence — Art. VII)
- [ ] TXXX RTL render check if layout-affecting (Art. IV)

---

## Dependencies & Execution Order

- Setup → Foundational → user stories (in priority order; parallel only across
  independent worktrees, single writer per feature — Workflow)
- Within each story: RED tests (verified failing) → implementation → gates.
  Tests before implementation is NON-NEGOTIABLE (Art. III)
- "Done" for any task group = deterministic gates exit 0, never self-assessment

## Notes

- [P] tasks = different files, no dependencies
- Every scenario ID S1..Sn MUST map to at least one test task (CI-gated)
- Bug fixes discovered mid-implementation: failing test reproducing the bug FIRST
- Commit after each task or logical group; no PR comment ever concerns formatting (Art. X)
