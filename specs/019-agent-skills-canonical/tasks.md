# Tasks: Canonical agent skills

<!-- KIMEN OVERRIDE of tasks-template. Constitutional basis: Arts. I–III, VII, X, XI. -->

**Input**: Design documents from `/specs/019-agent-skills-canonical/`

**Prerequisites**: approved synchronized spec/Gherkin marker v2, plan.md,
research.md, data-model.md, contracts/, quickstart.md

**Tests**: MANDATORY and written first. `scripts/tests/agent-skills.test.mjs`
declares `// @spec:019-agent-skills-canonical`; executable test names cover
S1–S9. The complete S1–S9 suite MUST be observed failing for the missing
topology/validator before T015 or any later implementation task begins.

## Phase 1: Setup and evidence baseline

- [x] T001 Record the current 27-skill/eight-conflict baseline from `main:.claude/skills` and local `.agents/skills` in `specs/019-agent-skills-canonical/contracts/migration-inventory-v1.md`
- [x] T002 [P] Verify the local Nx generator inventory has no applicable agent-skill generator and preserve the decision in `specs/019-agent-skills-canonical/research.md`
- [x] T003 [P] Verify `.gitignore`, `.specify/integrations/claude.manifest.json`, `NOTICE`, `AGENTS.md`, `CLAUDE.md`, `.specify/extensions.yml` and all skill-internal path references against `specs/019-agent-skills-canonical/contracts/agent-skill-topology-v1.md`
- [x] T004 Run `bash scripts/gates/pre-implement-check.sh specs/019-agent-skills-canonical` and hard-stop unless the approved dual-hash marker remains current

**Checkpoint**: approved baseline and implementation topology are reproducible.

---

## Phase 2: Complete cross-story RED contract (Blocking prerequisite)

**Purpose**: write every S1–S9 behavior test and observe the suite fail before
the canonical directory, symlink, validator or gate exists. No GREEN task may
start until T005–T014 are complete.

- [x] T005 [US3] Write S5 migration-inventory tests for identical, unique, conflicting and omitted artifacts in `scripts/tests/agent-skills.test.mjs`
- [x] T006 [P] [US1] Write S1 canonical discovery, required-entrypoint, tracked-content and real-repository assertions in `scripts/tests/agent-skills.test.mjs`
- [x] T007 [P] [US1] Write S7 fresh-clone and no-user-installation fixtures, including the 27-skill real-repository expectation, in `scripts/tests/agent-skills.test.mjs`
- [x] T008 [P] [US2] Write S2 exact Claude symlink, target, Git-mode, skill-parity and real-repository tests in `scripts/tests/agent-skills.test.mjs`
- [x] T009 [P] [US2] Write S3 one-edit propagation, write-through and no-copy tests in `scripts/tests/agent-skills.test.mjs`
- [x] T010 [P] [US4] Write S4 independent-directory duplicate-source tests, including byte-identical content, in `scripts/tests/agent-skills.test.mjs`
- [x] T011 [P] [US4] Write S6 missing, broken, absolute, escaping, cyclic and wrong-target link tests in `scripts/tests/agent-skills.test.mjs`
- [x] T012 [P] [US4] Write S8 repository/vendor tooling write-location and S9 ownership-guidance tests, including real CLI/gates-core expectations, in `scripts/tests/agent-skills.test.mjs`
- [x] T013 [P] Add S1–S9 mutation cases for inventory, enumeration, path normalization, link containment, stable findings and guidance ownership in `scripts/mutation-tests/agent-skill-catalog.spec.mjs`
- [x] T014 Run the complete focused S1–S9 suite before implementation, record the expected missing topology/validator failures in `specs/019-agent-skills-canonical/quickstart.md`, and verify traceability already recognizes every S-ID

**Checkpoint**: every approved behavior has a verified RED test; implementation is now allowed to begin.

---

## Phase 3: User Story 3 - Migration preserves validated knowledge (Priority: P1)

**Goal**: preserve the complete 27-skill union and resolve all eight conflicts
from validated `main` before canonical ownership moves.

**Independent Test**: S5 fixtures account for every source artifact, retain
validated conflict bytes and reject any omission or unapproved conflict.

### GREEN: migration and inventory logic

- [x] T015 [US3] Implement deterministic catalog/inventory normalization and conflict findings in `scripts/lib/agent-skill-catalog.mjs`
- [x] T016 [US3] Move the validated 27-skill tree from `.claude/skills/` to canonical `.agents/skills/` and replace `.claude/skills` with the exact relative symlink `../.agents/skills`
- [x] T017 [US3] Populate final artifact counts, conflict hashes and zero-omission evidence in `specs/019-agent-skills-canonical/contracts/migration-inventory-v1.md`
- [x] T018 [US3] Run focused S5 tests green and verify every vendored license/provenance artifact remains under `.agents/skills/`

**Checkpoint**: one canonical catalog exists and migration evidence accounts for all bytes.

---

## Phase 4: User Story 1 - Any agent discovers canonical skills (Priority: P1) 🎯 MVP

**Goal**: generic agents discover every repository skill through the
vendor-neutral canonical catalog in a fresh clone.

**Independent Test**: S1/S7 fixtures with no user-level skills enumerate all
canonical skills, require every `SKILL.md`, and reject missing, ignored or
untracked content.

### GREEN: canonical discovery

- [x] T019 [US1] Implement canonical directory, skill enumeration, `SKILL.md`, tracked-content and ignore-visibility validation in `scripts/lib/agent-skill-catalog.mjs`
- [x] T020 [US1] Run all prewritten S1/S7 fixture and real-repository tests green and record exact 27-skill/tracking evidence in `specs/019-agent-skills-canonical/quickstart.md`
- [x] T021 [US1] Run the prewritten S1/S7 mutation subset green and verify `git status` exposes canonical additions/removals rather than hiding `.agents/skills/`

**Checkpoint**: generic discovery works independently from Claude compatibility.

---

## Phase 5: User Story 2 - Claude remains compatible (Priority: P1)

**Goal**: Claude resolves identical canonical bytes through its conventional
path without a second writable catalog.

**Independent Test**: prewritten S2/S3 fixtures prove exact symlink type/target,
byte parity, write-through and one-edit propagation.

### GREEN: compatibility validation

- [x] T022 [US2] Implement compatibility link type, stored-target, resolved-target, containment, Git-mode and parity rules in `scripts/lib/agent-skill-catalog.mjs`
- [x] T023 [US2] Run all prewritten S2/S3 fixture and real-repository tests green and record `readlink`, Git mode `120000` and write-through evidence in `specs/019-agent-skills-canonical/quickstart.md`
- [x] T024 [US2] Run the prewritten S2/S3 mutation subset green and prove writes through `.claude/skills` land only under `.agents/skills`

**Checkpoint**: Claude compatibility is green with one content owner.

---

## Phase 6: User Story 4 - Deterministic gates prevent drift (Priority: P2)

**Goal**: every unsafe topology or stale ownership statement fails before
merge with a stable, actionable finding.

**Independent Test**: prewritten S4/S6 negative fixtures and S8/S9 tooling/
guidance fixtures fail or pass only according to the topology contract.

### GREEN: gate, guidance and integration

- [x] T025 [US4] Complete stable finding codes, deterministic sorting and sanitized remediation output in `scripts/lib/agent-skill-catalog.mjs`
- [x] T026 [US4] Implement Git/filesystem fact collection and the fail-closed CLI in `scripts/gates/check-agent-skills.mjs`
- [x] T027 [US4] Wire `check-agent-skills.mjs` as an early `agent-skills` gate in `scripts/gates/gates-core.sh`
- [x] T028 [US4] Update canonical/compatibility ownership guidance in `AGENTS.md`, `CLAUDE.md`, `NOTICE` and `.specify/extensions.yml` while retaining `.specify/integrations/claude.manifest.json` as compatibility metadata
- [x] T029 [US4] Update every repository-owned canonical path reference found after migration, including `.agents/skills/agentic-actions-auditor/LICENSE-NOTICE.md`, `.agents/skills/requesting-code-review/SKILL.md`, `.agents/skills/requesting-code-review/scripts/review-package.sh` and `scripts/tests/review-package.test.mjs`
- [x] T030 [US4] Run all prewritten S4/S6/S8/S9 CLI, gates-core and guidance fixture tests green
- [x] T031 [US4] Run the complete prewritten S1–S9 suite and `node scripts/gates/check-agent-skills.mjs` green
- [x] T032 [US4] Run an allowlisted `rg` audit proving remaining `.claude/skills` references are only compatibility contracts, historical approved specs or `.specify/integrations/claude.manifest.json`

**Checkpoint**: topology drift and unsafe links are merge-blocking and actionable.

---

## Phase 7: Cross-cutting verification and review

- [x] T033 Run `bash scripts/gates/check-spec-contracts.sh specs/019-agent-skills-canonical` and `bash scripts/gates/check-traceability.sh specs/019-agent-skills-canonical`
- [x] T034 [P] Run formatting, lint, typecheck, workflow policy and `git diff --check` over all changed agent surfaces
- [x] T035 Run node mutation for `scripts/lib/agent-skill-catalog.mjs` and achieve at least 70% without weakening mutants or scope
- [x] T036 Exercise the clean-clone quickstart in a disposable clone and record exact topology, count and negative-fixture evidence in `specs/019-agent-skills-canonical/quickstart.md`
- [x] T037 Run `bash scripts/gates/gates-suite.sh` to exit 0 with the new `agent-skills` gate in the authoritative evidence
- [x] T038 Run `/speckit-converge` and append any real remaining work to `specs/019-agent-skills-canonical/tasks.md`
- [x] T039 Build a clean-context review packet from the exact reviewed SHA using `.agents/skills/requesting-code-review/scripts/review-package.sh`
- [ ] T040 Address at most two actionable review rounds, re-run full gates, and present final evidence plus the founder-only merge action without merging or publishing npm

---

## Dependencies & Execution Order

```text
Setup T001–T004
  → all-story RED contract T005–T014
    → US3 migration T015–T018
      → US1 generic discovery T019–T021
        → US2 Claude compatibility T022–T024
          → US4 deterministic drift prevention T025–T032
            → verification/review T033–T040
```

- T005–T014 are a hard constitutional barrier: all S1–S9 tests must exist and
  have failed for the expected missing behavior before T015 or T016.
- US3 precedes discovery because it establishes the sole content owner.
- US1 and US2 retain independent tests even though they share the migrated
  catalog.
- US4 depends on the valid topology so each negative fixture isolates one
  invariant.
- Within every phase: prewritten RED test → GREEN implementation → focused
  gates. No behavior is first described by implementation.

## Parallel Opportunities

- T002 and T003 inspect independent evidence surfaces.
- T005–T013 may be authored across independent test sections/files before any
  implementation; single-writer discipline still applies to the worktree.
- T034 is parallel only after implementation files stabilize.
- `[P]` means independent evidence/files, never concurrent mutation of the
  same worktree.

## Implementation Strategy

1. Lock every approved scenario into a verified RED suite.
2. Preserve and migrate validated bytes (US3).
3. Deliver generic vendor-neutral discovery (US1 MVP).
4. Restore Claude compatibility without ownership duplication (US2).
5. Make the topology self-enforcing and update every canonical path reference
   (US4).
6. Close only with traceability, mutation, full gates and clean-context review.

## Notes

- No Nx generator applies; the native Git symlink and deterministic gate are
  the simplest approved design, not hand-scaffolded UI.
- `.agents/skills` is versioned source and must never be added to `.gitignore`
  or local excludes as part of this feature.
- The old dirty checkout is preserved outside this worktree until the feature
  is merged; cleaning it is a separate operational action.
- “Done” means the full gate suite exits 0. Founder merge is the second human
  gate and is never performed by implementation automation.
