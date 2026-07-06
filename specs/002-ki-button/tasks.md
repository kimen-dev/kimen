# Tasks: ki-button

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/002-ki-button/`

**Prerequisites**: plan.md, spec.md (approved, S1–S11), research.md (D1–D7),
data-model.md, contracts/button-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Both test files carry the
file-level marker `// @spec:002-ki-button`; S-IDs appear on code lines (test
titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = trigger an
action (P1, MVP), US2 = form participation (P2), US3 = re-theming (P2),
US4 = agent legibility & robustness (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-button --spec
      002-ki-button`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-button/{ki-button.tsx,ki-button.css,ki-button.spec.tsx}`
      and `packages/elements/browser-tests/ki-button.browser.spec.ts` with
      traceability markers wired.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer (blocks all component CSS)

**Purpose**: `--ki-button-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D4; user-story-independent).

- [ ] T003 [P] Author `packages/tokens/tokens/component/button.tokens.json`:
      geometry per size (height, padding-inline, gap, radius, font-size,
      line-height, icon-size, min-target for xs–xl) and the onmars color
      matrix `--ki-button-{variant}-{tone}-{state}-{bg|fg|border}` plus
      `--ki-button-{variant}-{state}-shadow`, and the focus ring
      `--ki-button-focus-ring-{color|width|offset}` (no dedicated semantic
      focus token exists; reference `ki.outline.{family}-high-em` +
      primitives), every value a reference into the semantic layer
      (`ki.surface.{family}.{emphasis}-em`, `ki.text.*`, `ki.outline.*`,
      `ki.elevation.*`, `ki.corner.control`, `ki.space.*`/`ki.radius.*`
      primitives for geometry).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/button.material3.tokens.json`:
      material3 overrides for the same token names (full-round radius,
      M3 state-layer colors, elevated shadow), mirroring how
      `tokens/semantic/material3.tokens.json` overrides the semantic layer.
- [ ] T005 Wire the component layer into
      `packages/tokens/style-dictionary.config.mjs` (+ `build.mjs` if a new
      output step is needed), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` and `size`, and commit the
      regenerated `dist/css` (tokens-sync gate contract: generated,
      committed, diffable).

**Checkpoint**: `--ki-button-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; token budgets and contrast gate green.

---

## Phase 3: User Story 1 — Trigger an action (Priority: P1) 🎯 MVP

**Goal**: activation parity with the native button: pointer, keyboard and
assistive tech each trigger exactly one activation; disabled is inert and
exposed.

**Independent Test**: quickstart.md §Manual validation 1 and 3 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T006 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-button/ki-button.spec.tsx`
      (marker `// @spec:002-ki-button`): S1 click dispatches exactly one
      activation, S2 disabled renders inert internal button, S11 unknown
      `variant`/`tone`/`size` values render default markup/attributes.
      Run `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T007 [P] [US1] Write browser suite
      `packages/elements/browser-tests/ki-button.browser.spec.ts`
      (marker `// @spec:002-ki-button`), consuming the BUILT
      `../dist/components/ki-button.js`: S1 real-click single activation;
      S3 Tab reaches the button with a visible focus indication (computed
      outline/box-shadow changes on :focus-visible); S4 Enter AND Space
      each activate exactly once; S5 accessibility tree exposes role
      button with accessible name from the slotted label; S6 disabled
      exposed as unavailable; axe zero violations across the full
      variant × tone × size matrix; RTL: `start`/`end` slots follow
      writing direction under `dir="rtl"`. Verify failing.

### GREEN: implementation

- [ ] T008 [US1] Implement anatomy per research D1/D3 in
      `packages/elements/src/components/ki-button/ki-button.tsx`: shadow
      `<button part="button" type="button">` with `start`/default(label
      wrapped in `part="label"`)/`end` slots, `delegatesFocus: true`,
      reflected `variant`/`tone`/`size` props (typed unions, defaults
      secondary/neutral/md), `disabled` wired to the internal button.
      CSS in `ki-button.css`: tokens-only (`--ki-button-*`), logical
      properties, base = defaults + per-known-value `:host([...])`
      overrides (fallback by construction), `:focus-visible` ring from
      semantic focus/outline tokens, `min-inline-size` from
      `--ki-button-{size}-min-target`, transitions inside
      `@media (prefers-reduced-motion: no-preference)`.
- [ ] T009 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/button-contract.md §Agent-facing metadata) — an
      undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T010 [US1] axe zero violations across the matrix (already asserted in
      T007; run `pnpm --filter @kimen/elements run test-browser` green) and
      draft the manual APG button walkthrough for the PR description
      (first interaction pattern in the repo, Art. V).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S6 + S11 pass.

---

## Phase 4: User Story 2 — Participate in a form (Priority: P2)

**Goal**: native-parity form behavior through ElementInternals.

**Independent Test**: quickstart.md §Manual validation 4.

### RED

- [ ] T011 [US2] Extend the browser suite with form scenarios: S7 a
      `type="submit"` button submits its form and the submitted form data
      carries the button's `name`/`value` plus the field's entry (assert
      via intercepted submit + `new FormData(form, submitter)` semantics);
      S8 `type="button"` never submits; `type="reset"` restores field
      defaults. Verify failing.

### GREEN

- [ ] T012 [US2] Implement form participation per research D2 in
      `ki-button.tsx`: `formAssociated: true`, `@AttachInternals()`,
      activation dispatch by `type` (native-submitter proxy for submit,
      `internals.form.reset()` for reset, no-op for button), `name`/`value`
      props, `formDisabledCallback` propagating `fieldset[disabled]` to the
      internal button. Keep the dispatch logic a small pure function with
      exhaustive unit cases in T006's file (mutation-gap compensating
      control, plan.md Art. III).

**Checkpoint**: S7–S8 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming proven on a real component.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T013 [US3] Extend the browser suite with theming scenarios following
      the 001 pattern (inject built token stylesheets): S9 declaring
      `data-ki-theme="material3"` restyles the button (assert at least one
      resolved custom property per variant × tone cell — 15 cells — takes
      its material3 value, per SC-002's full-matrix promise);
      S10 `data-ki-color-scheme="dark"` under onmars resolves dark values.
      Verify failing (tokens exist from Phase 2; failure must come from
      component CSS not consuming them — if Phase 3 already turns these
      green, record that instead and keep the assertions as regression
      tests).

### GREEN

- [ ] T014 [US3] Close any gap the S9/S10 tests expose in `ki-button.css`
      token consumption; `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S9–S10 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — Agent legibility & robustness (Priority: P3)

**Goal**: the generated contract answers when-to-use; malformed values are
safe (S11 already tested in US1).

- [ ] T015 [US4] Verify the regenerated `packages/elements/generated/docs.json`
      carries the JSDoc contract (when-to-use/when-NOT-to-use, defaults,
      union types) for every `ki-button` member, and that
      `src/components.d.ts` exposes the typed unions. Commit regenerated
      artifacts (never hand-edited, Art. I).

---

## Phase 7: Polish & Cross-Cutting

- [ ] T016 Remove ki-hello (FR-014, research D5): delete
      `packages/elements/src/components/ki-hello/` and
      `packages/elements/browser-tests/ki-hello.browser.spec.ts`, swap the
      export in `packages/elements/src/index.ts`, replace both size-limit
      entries in `packages/elements/package.json` with ki-button
      equivalents (same 9 KB marginal / 25 KB worst-case caps).
- [ ] T017 Rebuild and commit regenerated machine surfaces
      (`src/components.d.ts`, `generated/docs.json`, `dist` outputs);
      verify no ki-hello orphan remains (`grep -ri ki-hello packages/ --include='*.ts*' --include='*.json'`
      returns only historical spec/lock entries, none in live code).
- [ ] T018 Run `pnpm exec nx run-many -t size` — ki-button marginal ≤ 9 KB
      gzipped, worst case ≤ 25 KB (Art. IV budget, SC-004).
- [ ] T019 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes traceability (S1–S11 ↔
      tests), tokens-sync, contrast, styles, deadcode (knip sees no dead
      export), packaging, budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004 (P) → T005 ─┤ (tokens before any component CSS)
             ├─ Phase 3 (US1): T006, T007 (P, RED) → T008 → T009 → T010
             ├─ Phase 4 (US2): T011 (RED) → T012      (after US1 GREEN)
             ├─ Phase 5 (US3): T013 (RED) → T014      (after Phase 2 + T008)
             ├─ Phase 6 (US4): T015                    (after T009 + build)
             └─ Phase 7: T016 → T017 → T018 → T019    (last)
```

- Single writer on `feat/ki-button`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 (different token files); T006 ∥ T007
  (different test files). Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T006/T007 before T008; T011 before
  T012; T013 before T014. Each RED task records the failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001). Compensating control lives in T012 (pure dispatch
  logic with exhaustive unit cases). Wiring Stryker is a factory chore
  outside this spec.
- Every S-ID S1–S11 maps to a test task: S1/S2/S11 → T006+T007, S3–S6 →
  T007, S7/S8 → T011, S9/S10 → T013 (CI-gated by check-traceability.sh).
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
