# Tasks: ki-input

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/003-ki-input/`

**Prerequisites**: plan.md, spec.md with S1–S28, research.md (D1–D10),
data-model.md, contracts/input-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:003-ki-input`; S-IDs appear on code lines (test
titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = enter text the
page can read (P1, MVP), US2 = participate in a form (P1), US3 = re-theme
without touching markup (P2), US4 = an agent generates a valid field (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-input --spec
      003-ki-input`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-input/{ki-input.tsx,ki-input.css,ki-input.spec.tsx}`
      and `packages/elements/browser-tests/ki-input.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer (blocks all component CSS)

**Purpose**: `--ki-input-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D8; user-story-independent).

- [ ] T003 [P] Author `packages/tokens/tokens/component/input.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure tokens (single scale, NO size axis —
      `height`, `min-target`, `padding-inline`, `gap`, `label-gap`,
      `radius`, `icon-size`, `font-size`, `font-weight`, `line-height`,
      `label-font-size`, `label-font-weight`, `label-line-height`); border
      widths per logical side (`border-width` +
      `border-{block-start|block-end|inline-start|inline-end}-width`, each
      per-side value a reference to `{ki.input.border-width}` so a theme
      can express outlined OR bottom-only filled enclosures); state color
      matrix `--ki-input-{rest|hover|focus|disabled|readonly|invalid}-{bg|fg|border|label-fg|placeholder-fg}`
      (6 × 5 = 30); focus ring `--ki-input-focus-ring-{color|width|offset}`.
      Every value a reference into the 001 semantic layer
      (`ki.surface.*`, `ki.text.*`, `ki.outline.*`, `ki.space.*`,
      `ki.radius.*`, `ki.typography.*`) — ~51 tokens (data-model.md).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/input.material3.tokens.json`:
      material3 overrides for the same token names — its chosen M3
      enclosure via the per-side border-width tokens, M3 state inks
      (focus label = primary, invalid inks = error family), mirroring how
      `button.material3.tokens.json` overrides the button layer.
- [ ] T005 Wire both files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/input.tokens.json` to `LAYERS` and
      `tokens/component/input.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` and
      `pnpm --filter @kimen/tokens size` (stylesheets stay ≤ their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable).

**Checkpoint**: `--ki-input-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; token budgets and contrast gate green.

---

## Phase 3: User Story 1 — Enter text the page can read (Priority: P1) 🎯 MVP

**Goal**: native-input parity for entry: typing, events, per-kind
semantics, disabled/readonly behavior, visible label, keyboard focus and a
correctly exposed accessibility tree.

**Independent Test**: quickstart.md §Manual validation 1, 3 and 4 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T006 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-input/ki-input.spec.tsx`
      (marker `// @spec:003-ki-input`): S6 unknown `type` value renders the
      internal input with `type="text"`; S19 the `label` attribute renders
      visible text wired to the input via `for`/`id`; S20 programmatic
      `value` assignment replaces the rendered value and dispatches no
      change event; anatomy assertions (parts `field`/`input`/`label`,
      `start`/`end` slots, no default slot); exhaustive unit cases for
      `normalizeKiInputType` — every allowed value plus unknown/`number`
      branches (research D6, mutation-gap compensating control). Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T007 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-input.browser.spec.ts`
      (marker `// @spec:003-ki-input`), consuming the BUILT
      `../dist/components/ki-input.js` and injecting `@kimen/tokens/css`
      (002 pattern): S1 real typing via `userEvent` updates `value` and
      fires composed input events during entry; S2 committing an edit
      (blur) fires exactly one composed change with the final value; S3 a
      disabled input accepts no entry; S4 a readonly input keeps
      "KMN-0042" under edit attempts; S5 password entry is displayed
      obscured while `value` returns the plain text; S6 unknown type
      behaves as a plain text field. Verify failing.
- [ ] T008 [P] [US1] Write the keyboard section of the browser suite:
      S7 Tab reaches the field and the focus indication is visible
      (computed outline/box-shadow on the `field` enclosure changes under
      `:focus-within`); S22 a readonly field is reached by Tab with the
      same visible focus. Verify failing.
- [ ] T009 [P] [US1] Write the assistive-tech section of the browser
      suite: S9 accessibility tree exposes a text field with accessible
      name "Email"; S10 required exposed; S11 disabled exposed as
      unavailable; S23 with a placeholder set, the accessible name is
      still the label; S24 readonly exposed as read-only; S25 the internal
      entry control carries the forwarded `autocomplete="email"` (entry
      purpose programmatically exposed — SC 1.3.5); axe zero violations
      across the type × state matrix. Verify failing.

### GREEN: implementation

- [ ] T010 [US1] Implement anatomy and core behavior per research D1/D2/
      D5/D6 in `packages/elements/src/components/ki-input/ki-input.tsx` +
      `ki-input.form.ts`: shadow `<label part="label" htmlFor>` +
      `<div part="field">` wrapping `start` slot, native
      `<input part="input">`, `end` slot; `delegatesFocus: true`;
      reflected props `type` (normalized via pure
      `normalizeKiInputType` in `ki-input.form.ts`), `label`,
      `placeholder`, `name`, `required`, `readonly`, `disabled`,
      `autocomplete` (forwarded verbatim); non-reflected mutable `value`
      prop with dirty-value semantics (attribute = default, property =
      live value, programmatic set silent); composed `change` re-dispatch
      from the host (native `change` is not composed). CSS in
      `ki-input.css`: tokens-only via the `--_ki-input-*` indirection
      layer on `:host` (002 pattern) — base = rest inks, swapped under
      `:host(:hover)`, `:host(:focus-within)` (+ focus ring from
      `--ki-input-focus-ring-*`), `:host([disabled])`,
      `:host([readonly])`, `:host(:state(user-invalid))`; logical
      properties only; per-side border widths from
      `--ki-input-border-*-width`; `min-block-size` from
      `--ki-input-min-target` (≥24 px, FR-013); no intrinsic transitions
      (FR-016).
- [ ] T011 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/input-contract.md §Agent-facing metadata) — an
      undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T012 [US1] Per-story gates: axe zero violations across the matrix
      (asserted in T009; `pnpm --filter @kimen/elements run test-browser`
      green); add BOTH ki-input entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-input.js` ignoring `@stencil/core`, limit 9 KB;
      worst case: same path with runtime, limit 25 KB — mirror the
      ki-button entries, which stay) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Note: CEM/llms.txt llegan con
      017-agent-surfaces (en curso); catálogo Zod diferido a Fase 3
      (decisión founder 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S7, S9–S11,
S19, S20, S22–S25 pass.

---

## Phase 4: User Story 2 — Participate in a form (Priority: P1)

**Goal**: full ElementInternals form participation: submission, implicit
Enter submission, reset, fieldset disabling and native-parity constraint
validation (required + kind mismatch, readonly exemption, user-invalid
appearance).

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T013 [US2] Extend the browser suite with real-`<form>` scenarios:
      S12 submitted FormData contains `email=ada@example.com`; S8 Enter
      inside the focused field submits the form; S13 reset restores the
      attribute-declared initial value after edits; S14 an empty required
      field blocks submission and reports invalid; S21 the invalid
      appearance (`:state(user-invalid)` styling) is absent on first
      render of an empty required field and appears only after the blocked
      submission attempt; S15 a disabled fieldset removes the entry from
      FormData; S26 a readonly field still submits its value; S27 an empty
      readonly required field does not block submission; S28
      `type="email"` with value "not-an-email" blocks submission and
      reports invalid. Verify failing.

### GREEN

- [ ] T014 [US2] Implement form participation per research D2/D3/D4/D7 in
      `ki-input.tsx`: `formAssociated: true`, `@AttachInternals()`;
      `internals.setFormValue(value)` on every value change;
      `internals.setValidity(input.validity, input.validationMessage,
      input)` mirroring on every validity-affecting change (required/type
      forwarded so valueMissing/typeMismatch compute natively; readonly
      exemption falls out of the native barring); Enter keydown (no
      modifiers, not composing) → `internals.form?.requestSubmit()`;
      `formResetCallback` restoring the attribute default and clearing
      dirty; `formDisabledCallback` propagating `fieldset[disabled]` to
      the internal input; user-invalid custom state via
      `internals.states` (set on host `invalid` event or invalid user
      commit, cleared when valid or on reset). Keep any extractable value/
      validity rules as small pure functions in `ki-input.form.ts` with
      exhaustive unit cases in T006's file (mutation-gap compensating
      control, plan.md Art. III).

### Component quality gates (US2)

- [ ] T015 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/003-ki-input`; if the
      public surface changed, rebuild and re-commit `generated/docs.json`.

**Checkpoint**: S8, S12–S15, S21, S26–S28 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming proven on the first form control, including
the enclosure-is-a-theme-decision claim; adornments follow writing
direction.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T016 [US3] Extend the browser suite with theming scenarios following
      the 001/002 pattern (inject built token stylesheets): S16 declaring
      `data-ki-theme="material3"` restyles the field — assert resolved
      `--ki-input-*` values change across states, including the per-side
      border-width tokens that switch the enclosure (SC-004); S17 forced
      dark under onmars resolves dark ink values (follow the 002 split
      into `packages/elements/browser-tests/ki-input.dark.browser.spec.ts`
      with its own `// @spec:003-ki-input` marker if the forced-dark
      context needs isolation, as ki-button did); S18 under `dir="rtl"`
      with icons slotted `start`/`end`, the start content leads and the
      end content trails the entry area (compare inline positions).
      Verify failing (tokens exist from Phase 2; failure must come from
      component CSS not consuming them — if Phase 3 already turns any of
      these green, record that instead and keep the assertions as
      regression tests).

### GREEN

- [ ] T017 [US3] Close any gap the S16/S17/S18 tests expose in
      `ki-input.css` token consumption (every ink and border width through
      `--_ki-input-*` → `--ki-input-*`, logical properties only);
      `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S16–S18 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent generates a valid field (Priority: P3)

**Goal**: the generated contract answers when-to-use; malformed values are
safe (S6 already tested in US1).

- [ ] T018 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use, defaults, union types, label-mandatory
      and placeholder-is-not-a-label guidance) for every `ki-input`
      member, and that `src/components.d.ts` exposes the typed unions.
      Commit regenerated artifacts (never hand-edited, Art. I). Machine
      surfaces note: CEM/llms.txt llegan con 017-agent-surfaces (en
      curso); catálogo Zod diferido a Fase 3 (decisión founder
      2026-07-08) — this task's scope is docs.json completeness only.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T019 [P] Write
      `packages/elements/src/components/ki-input/ki-input.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration): `Playground` (every prop as a control)
      plus one story per axis — `Types` (the six kinds side by side),
      `WithPlaceholder`, `Required`, `Disabled`, `Readonly`, `Adornments`
      (start/end slotted icons/affixes). No axis for size/variant/tone —
      they do not exist on ki-input.
- [ ] T020 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      label alignment, slot order, paddings — logical properties only,
      Art. IV; S18 already automated in T016). Manual APG walkthrough: N/A
      — native text-field pattern, no new APG interaction pattern (plan.md
      Art. V; charter flags dialog/tooltip/tabs/select only).
- [ ] T021 Run `pnpm exec nx run-many -t size` — ki-input marginal ≤ 9 KB
      gzipped, worst case ≤ 25 KB, ki-button entries unaffected, token
      stylesheets within caps (Art. IV budget, SC-006).
- [ ] T022 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes constitution,
      traceability (S1–S28 ↔ tests), tokens-sync, contrast, lint, styles,
      typecheck, deadcode (knip sees no dead export), packaging, budgets,
      mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004 (P) → T005 ─┤ (tokens before any component CSS)
             ├─ Phase 3 (US1): T006–T009 (P, RED) → T010 → T011 → T012
             ├─ Phase 4 (US2): T013 (RED) → T014 → T015   (after US1 GREEN)
             ├─ Phase 5 (US3): T016 (RED) → T017          (after Phase 2 + T010)
             ├─ Phase 6 (US4): T018                        (after T011 + build)
             └─ Phase 7: T019, T020 (P) → T021 → T022     (last)
```

- Single writer on `feat/ki-input`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 (different token files); T006 ∥ T007
  ∥ T008 ∥ T009 (different files/sections written independently, merged
  into the two test files before running); T019 ∥ T020. Everything else is
  ordered.
- RED before GREEN is NON-NEGOTIABLE: T006–T009 before T010; T013 before
  T014; T016 before T017. Each RED task records the failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control lives in T006/T014 (pure
  `ki-input.form.ts` logic with exhaustive unit cases per branch). Wiring
  Stryker is a factory chore outside this spec.
- Every S-ID S1–S28 maps to a test task (CI-gated by
  check-traceability.sh):
  - S6, S19, S20 → T006 (S6 also in T007)
  - S1, S2, S3, S4, S5 → T007
  - S7, S22 → T008
  - S9, S10, S11, S23, S24, S25 → T009
  - S8, S12, S13, S14, S15, S21, S26, S27, S28 → T013
  - S16, S17, S18 → T016
- FR coverage: FR-001 → T003/T007(S5)/T010; FR-002 → T006(S19)/T009(S9)/
  T010; FR-003 → T009(S23); FR-004 → T006(S20)/T007(S1,S2)/T010;
  FR-005 → T007(S3)/T009(S11)/T013(S15); FR-006 → T007(S4)/T008(S22)/
  T009(S24)/T013(S26,S27); FR-007 → T013/T014; FR-008 → T013(S14,S21,S28)/
  T014; FR-009 → T010/T016(S18); FR-010 → T003–T005/T010/T017;
  FR-011 → T010/T013(S21)/T014; FR-012 → T006/T007(S6); FR-013 →
  T008(S7)/T010; FR-014 → T006/T010; FR-015 → T011/T018; FR-016 → T010;
  FR-017 → T009(S25)/T010.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
