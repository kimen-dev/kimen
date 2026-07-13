# Tasks: Agent surfaces

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X. -->

**Input**: Design documents from `/specs/017-agent-surfaces/`

**Prerequisites**: plan.md, spec.md (S1–S6), research.md
(D1–D9), data-model.md, contracts/agent-surfaces-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. The test file carries the
file-level marker `// @spec:017-agent-surfaces`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh). NOTE: the
traceability gate only counts `*.spec.ts|*.spec.tsx|*.e2e.ts` under
`packages/` — do NOT use the tokens `*.test.mjs` pattern here (research D7).
Tests are deterministic: fixture inputs, tmpdirs, no network, no clock.

**Organization**: grouped by the spec's user stories. US1 = wire a component
from its manifest (P1, MVP: S1–S3), US2 = documentation completeness
enforcement (P2: S4), US3 = committed surfaces never drift (P2: S5, S6).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Migrate ki-button's guidance prose to the tag convention
      (FR-003, research D3): in
      `packages/elements/src/components/ki-button/ki-button.tsx` replace the
      class-JSDoc lines "When to use: … / When NOT to use: …" with
      `@whenToUse <same text>` and `@whenNotToUse <same text>` (verbatim
      content, prose prefix removed). Rebuild
      (`pnpm exec nx run @kimen/elements:build`) and verify
      `generated/docs.json` → `components[0].docsTags` now carries both
      tags. Commit source + regenerated docs.json together. Prop-level
      prose guidance stays as-is.
- [ ] T002 Scaffold the scripts test/analysis harness (research D7):
      create `packages/elements/vitest.node.config.ts` (node environment,
      `include: ['scripts/**/*.spec.ts']`),
      `packages/elements/scripts/tsconfig.json` (extends `../tsconfig.json`,
      `include: ["./**/*.ts"]`, `allowJs: true`, `noEmit: true`); chain the
      package test script:
      `"test": "vitest run && vitest run --config vitest.node.config.ts"`;
      add `tsc -p packages/elements/scripts --pretty false` to the root
      `typecheck` script (browser-tests precedent); extend the ESLint
      relax block's `files` in `eslint.config.mjs` with
      `'packages/*/scripts/**'`.
- [ ] T003 Verify the deterministic layer passes on the empty harness:
      `pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run deadcode`
      from the repo root (fail here = wiring bug; fix wiring, not rules).
      If knip flags anything, add the entry in the same change (Art. X).

---

## Phase 2: Foundational — docs.json normalization (FR-008; blocks every surface)

**Purpose**: the intermediate must be deterministic BEFORE any surface
derives from it, or the sync gate can never be born green (user-story-
independent; the observed defect: committed docs.json embeds a timestamp
and 4 absolute paths).

### RED first (Art. III)

- [ ] T004 Write the normalization suite in
      `packages/elements/scripts/agent-surfaces.spec.ts` (marker
      `// @spec:017-agent-surfaces`), with fixtures under
      `packages/elements/scripts/fixtures/`: S6 (partial — invariants)
      `normalizeDocs` removes the top-level `timestamp`, relativizes every
      `complexType.references.*.path` to a POSIX package-relative path,
      leaves already-relative `filePath`/`typeLibrary` untouched, and
      serializes to stable bytes (2-space JSON + single trailing LF; two
      runs → identical bytes). Run
      `pnpm --filter @kimen/elements exec vitest run --config vitest.node.config.ts`
      and record the failure reason (module `agent-surfaces.mjs` does not
      exist yet).

### GREEN

- [ ] T005 Implement `normalizeDocs` in
      `packages/elements/scripts/agent-surfaces.mjs` (pure; contract in
      data-model.md §1) and the CLI skeleton
      `packages/elements/scripts/build-surfaces.mjs` (reads
      `generated/docs.json`, writes it back normalized). Wire the build:
      `@kimen/elements` `"build": "stencil build && node scripts/build-surfaces.mjs"`;
      extend `nx.targets.build` in `packages/elements/package.json`:
      `outputs: ["{projectRoot}/dist", "{projectRoot}/generated", "{projectRoot}/llms.txt", "{workspaceRoot}/llms.txt"]`
      and `inputs` += `!{projectRoot}/llms.txt` (keep the existing
      `!{projectRoot}/generated/**` — the build's outputs must never feed
      its own cache hash, research D5). Rebuild and commit the normalized
      `generated/docs.json` (timestamp gone, zero absolute paths).

**Checkpoint**: `grep -c '/Users/' packages/elements/generated/docs.json`
returns 0; rebuilding twice leaves `git status` clean; Storybook still
renders autodocs from the normalized file.

---

## Phase 3: User Story 1 — An agent wires a component from its manifest (Priority: P1) 🎯 MVP

**Goal**: the build emits `generated/custom-elements.json` and `llms.txt`
(package + repo root) carrying every documented facet and the guidance
verbatim (S1, S2, S3; FR-001, FR-002, FR-003).

**Independent Test**: quickstart.md §Manual validation 1–3 and 8.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T006 [P] [US1] Extend `agent-surfaces.spec.ts` with the manifest
      suite: S1 `buildManifest` over the real committed docs.json describes
      ki-button's tag, all 7 properties (attributes + members with type
      text, default, `reflects`), 3 slots and 2 cssParts, with
      `schemaVersion "1.0.0"`, module path `src/components/ki-button/ki-button.tsx`,
      class name `KiButton` and both exports (contract §CEM); facet arrays
      always present (empty allowed, absent not). S3 the `whenToUse` /
      `whenNotToUse` declaration fields byte-equal the fixture's docsTags
      text. Verify failing (`buildManifest` not implemented).
- [ ] T007 [P] [US1] Extend `agent-surfaces.spec.ts` with the summary
      suite: S2 `buildLlmsTxt` output starts with `# @kimen/elements`,
      carries the package.json description as blockquote, contains the
      preamble template body verbatim (installation instruction included)
      and one `### ki-button` entry listing attributes/slots/parts per the
      contract's line format; S3 both guidance lines byte-equal the tag
      text; facets with no entries render `Events: none`. Verify failing.

### GREEN: implementation

- [ ] T008 [US1] Implement `buildManifest(docs)` in `agent-surfaces.mjs`
      per data-model.md §3 (field-by-field mapping; PascalCase(tag) class
      name; docs.json order preserved; no re-sorting; dropped fields listed
      there stay dropped).
- [ ] T009 [US1] Implement `buildLlmsTxt(docs, pkg, preamble)` per
      data-model.md §4 and author
      `packages/elements/scripts/llms-preamble.txt` (installation
      instruction, `defineCustomElement` registration snippet, tokens
      stylesheet + theming attributes note — the only editorial content,
      versioned as an input per FR-002).
- [ ] T010 [US1] Complete `build-surfaces.mjs`: emit
      `generated/custom-elements.json`, `packages/elements/llms.txt` and
      the byte-identical repo-root `llms.txt`; publication wiring in
      `packages/elements/package.json`:
      `"customElements": "generated/custom-elements.json"`, `files` +=
      `"generated/custom-elements.json"`, `"llms.txt"` (research D8).
      Rebuild, run `pnpm run packaging` (publint/attw stay green), and
      commit the three new artifacts — born green.

**Checkpoint**: US1 tests green; quickstart §1–3 pass by inspection;
`git status` clean after a rebuild.

---

## Phase 4: User Story 2 — The pipeline enforces documentation completeness (Priority: P2)

**Goal**: an undocumented public API member (or missing/empty guidance tag)
fails generation naming the member (S4; FR-004, and FR-003's missing-tag
edge case).

**Independent Test**: quickstart.md §Manual validation 4.

### RED

- [ ] T011 [US2] Extend `agent-surfaces.spec.ts` with the completeness
      suite over dedicated fixtures: S4 a fixture with one undocumented
      prop makes `validateDocs` report `ki-x.propName`; missing
      `@whenToUse` (or `@whenNotToUse`) reports the component and tag name;
      an empty-text docsTag, an undocumented event/method and an
      empty-docs slot/part each produce a violation; a fully documented
      fixture produces zero violations; and the CLI path exits non-zero
      printing every violation (assert via the exported validate +
      orchestrator function, not a subprocess, for determinism). Verify
      failing.

### GREEN

- [ ] T012 [US2] Implement `validateDocs(docs)` per data-model.md §2 and
      make `build-surfaces.mjs` run it between normalization and emission:
      any violation → print the contract's failure block → exit 1 (build
      failure, never a warning — Art. I).

**Checkpoint**: quickstart §4 reproduces the failure and names the member;
full build still green on the real (documented) tree.

---

## Phase 5: User Story 3 — Committed surfaces never drift (Priority: P2)

**Goal**: stale committed surfaces fail a deterministic gate; regeneration
is byte-identical from any checkout path (S5, S6; FR-005, FR-006).

**Independent Test**: quickstart.md §Manual validation 5–6.

### RED

- [ ] T013 [US3] Extend `agent-surfaces.spec.ts` with the drift/determinism
      suite: S6 (full) the complete pipeline run twice over fixture inputs
      identical except absolute-path prefix (`/Users/alice/...` vs
      `/home/ci/...`) and timestamp yields byte-identical outputs for all
      three surfaces, and the real regenerated outputs contain no
      absolute-path shape and no timestamp; S5 a staleness check over a
      tmpdir — write generated surfaces, mutate one byte of the committed
      copy, re-run the generation functions and assert the comparison
      names exactly the stale file; plus a wiring assertion that
      `scripts/gates/gates-suite.sh` contains a `surfaces-sync` gate
      covering `packages/elements/generated`, `packages/elements/llms.txt`
      and root `llms.txt` (the gate itself is the deployed oracle; the
      grep pins it deterministically). Verify failing (gate line absent).

### GREEN

- [ ] T014 [US3] Add the gate to `scripts/gates/gates-suite.sh` immediately
      after `tokens-sync` (research D5):
      `run_gate surfaces-sync git diff --exit-code -- packages/elements/generated packages/elements/llms.txt llms.txt`
      with the Art. I comment block; fix any determinism leak T013 exposed
      (locale-dependent sorting, env access, CRLF). Run the full suite:
      `bash scripts/gates/gates-suite.sh` exits 0.

**Checkpoint**: hand-editing any committed surface makes `surfaces-sync`
fail pointing at the file; quickstart §6 `cmp` runs exit 0.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T015 [P] FR-009 — update the machine-surfaces line in
      `.specify/templates/overrides/tasks-template.md` (currently
      `T019 [US1] Regenerate machine surfaces: docs-json → CEM → catalog → llms.txt, committed and diffed (Art. I)`)
      to name the delivered pipeline, e.g.:
      `T019 [US1] Regenerate machine surfaces (017): build regenerates docs-json (normalized) → generated/custom-elements.json → llms.txt; committed and verified by the surfaces-sync gate (Art. I; Zod catalog is Fase 3)`
      — so the 003–016 stories inherit a satisfiable obligation.
- [ ] T016 [P] FR-007 — update
      `tools/kimen-plugin/src/generators/component/files/__name__.tsx.template`:
      replace the "When to use: TODO(spec)" prose lines with
      `@whenToUse TODO(spec): agent-facing guidance (Art. I).` /
      `@whenNotToUse TODO(spec).` so a fresh scaffold passes FR-004
      mechanically (research D9). Validate via quickstart §7 (scratch
      component appears in both surfaces; delete it afterwards, never
      commit it).
- [ ] T017 [P] Documentation notes (hand-maintained files, small and
      factual): in `AGENTS.md`, note that manifests + llms.txt are now
      generated and sync-gated (AGENTS.md itself remains hand-maintained —
      generation still deferred per the spec's Assumptions); mention the
      `customElements` field/llms.txt in the root `README.md` if a
      machine-surfaces section exists. No generated file is hand-edited.
- [ ] T018 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes traceability (S1–S6 ↔
      `agent-surfaces.spec.ts`), format, build (which now emits the
      surfaces), the new `surfaces-sync`, lint, typecheck, deadcode (knip
      sees no dead export in `agent-surfaces.mjs`), packaging, budgets,
      test (node project chained) and test-browser.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 ─┐            (guidance tags + harness before anything)
                    ├─ Phase 2: T004 (RED) → T005 (normalize + build wiring)
                    ├─ Phase 3 (US1): T006, T007 (P, RED) → T008 → T009 → T010
                    ├─ Phase 4 (US2): T011 (RED) → T012        (after T005)
                    ├─ Phase 5 (US3): T013 (RED) → T014        (after T010: gate needs all artifacts)
                    └─ Phase 6: T015 ∥ T016 ∥ T017 → T018      (last)
```

- Single writer on `feat/agent-surfaces`; no parallel worktrees needed.
- Parallel opportunities: T006 ∥ T007 (independent suites in one file —
  coordinate or write sequentially); T015 ∥ T016 ∥ T017 (different files).
- RED before GREEN is NON-NEGOTIABLE: T004 before T005; T006/T007 before
  T008–T010; T011 before T012; T013 before T014. Each RED task records the
  failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–5 make the obligation enforceable;
  Phase 6 propagates it to 003–016.

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control: `normalizeDocs`,
  `validateDocs`, `buildManifest`, `buildLlmsTxt` are pure functions with
  exhaustive unit cases per branch (T004, T006, T007, T011, T013).
- Every S-ID S1–S6 maps to a test task: S1 → T006, S2 → T007, S3 →
  T006+T007, S4 → T011, S5 → T013, S6 → T004+T013 (CI-gated by
  check-traceability.sh).
- SC-001's agent eval is a scheduled eval, never merge-blocking (spec
  language); quickstart §8 documents the manual smoke.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
