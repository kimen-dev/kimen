# Tasks: ki-textarea

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/004-ki-textarea/`

**Prerequisites**: plan.md, spec.md with S1–S25 (gate-1 approval pending —
the pre-implement gate blocks execution until the `.approved` marker
exists; the default-`rows` [NEEDS CLARIFICATION] resolves at gate 1),
research.md (D1–D12; 003 decisions adopted by citation), data-model.md,
contracts/textarea-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:004-ki-textarea`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = capture
long-form text (P1, MVP), US2 = participate in a form (P2), US3 = re-theme
without touching markup (P2), US4 = an agent places the right field (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-textarea
      --spec 004-ki-textarea`, then
      `pnpm exec nx run @kimen/elements:build && pnpm run format`. Creates
      `packages/elements/src/components/ki-textarea/{ki-textarea.tsx,ki-textarea.css,ki-textarea.spec.tsx}`
      and `packages/elements/browser-tests/ki-textarea.browser.spec.ts`
      with traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast sweep (blocks all component CSS)

**Purpose**: `--ki-textarea-*` must exist and ship in both themes BEFORE
any component CSS consumes it (research D9), and the contrast gate must
actually see the new matrix (research D10 — today
`packages/tokens/scripts/check-contrast.mjs` sweeps ki-button ONLY; its
own comment mandates per-component extension, so extending it is part of
this feature's token work, never a deferred chore).

- [ ] T003 [P] Author
      `packages/tokens/tokens/component/textarea.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json` / 003's planned `input.tokens.json`): structure
      tokens, single scale, NO size axis and NO height token —
      `padding-inline`, `padding-block` (multiline delta: vertical rhythm
      is padding + rows × line-height, research D7/D9), `label-gap`,
      `radius`, `min-target`, `font-size`, `font-weight`, `line-height`
      (load-bearing: gives `rows` its meaning), `label-font-size`,
      `label-font-weight`, `label-line-height`; border widths per logical
      side (`border-width` +
      `border-{block-start|block-end|inline-start|inline-end}-width`, each
      per-side value a reference to `{ki.textarea.border-width}` so a
      theme can express outlined OR bottom-only filled enclosures); state
      color matrix
      `--ki-textarea-{rest|hover|focus|disabled|readonly|invalid}-{bg|fg|border|label-fg|placeholder-fg}`
      (6 × 5 = 30, state keys aligned with `--ki-input-*`); focus ring
      `--ki-textarea-focus-ring-{color|width|offset}`. Every value a
      reference into the 001 semantic layer (`ki.surface.*`, `ki.text.*`,
      `ki.outline.*`, `ki.space.*`, `ki.radius.*`, `ki.typography.*`) —
      ~49 tokens (data-model.md). No `gap`/`icon-size` (no slots, D1).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/textarea.material3.tokens.json`:
      material3 overrides for the same token names — its chosen M3
      enclosure via the per-side border-width tokens, M3 state inks (focus
      label = primary, invalid inks = error family), mirroring how
      `button.material3.tokens.json` overrides the button layer.
- [ ] T005 Wire both files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/textarea.tokens.json` to `LAYERS` and
      `tokens/component/textarea.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens size` (stylesheets stay ≤ their
      9 KB caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable).
- [ ] T006 Extend the contrast gate to the textarea matrix (research D10;
      Art. X — the rule ships with the surface): in
      `packages/tokens/scripts/check-contrast.mjs`, add a
      `--ki-textarea-{rest|hover|focus|readonly|invalid}-bg` sweep pattern
      (disabled exempt, WCAG 1.4.3) deriving per matched state
      `{state}-fg` on `{state}-bg` AND `{state}-placeholder-fg` on
      `{state}-bg`, plus `{state}-label-fg` against `--ki-surface-s0` (the
      label renders on the page surface, outside the enclosure); make the
      zero-match guard PER PATTERN so the button matches cannot mask a
      drifted textarea pattern; extend
      `packages/tokens/scripts/check-contrast.test.mjs` for the new
      derivation; run `pnpm --filter @kimen/tokens contrast` — if AA
      arithmetic forces semantic-layer deltas (placeholder inks are the
      likely pressure point), declare them explicitly for founder sign-off
      at the merge gate (002 precedent, anticipated by the spec's Tokens
      surface).

**Checkpoint**: `--ki-textarea-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; token budgets green; the contrast gate
sweeps and passes the full textarea matrix.

---

## Phase 3: User Story 1 — Capture long-form text (Priority: P1) 🎯 MVP

**Goal**: native multiline parity: typing with line-break fidelity, Enter
inserts a line and never submits, `rows` fixes the height (no resize
handle), events, disabled/readonly behavior, visible label, keyboard focus
and a correctly exposed accessibility tree.

**Independent Test**: quickstart.md §Manual validation 1, 3 and 4 on a
page with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-textarea/ki-textarea.spec.tsx`
      (marker `// @spec:004-ki-textarea`): S6 `rows="tall"` renders the
      internal textarea with the default `rows="2"`; anatomy assertions
      (parts `field`/`textarea`/`label`, label wired via `for`/`id`, NO
      slot elements in the shadow root, light-DOM text children do not
      render and do not become the value); exhaustive unit cases for
      `normalizeKiTextareaRows` — positive integers pass through, floats
      floor, `NaN`/non-numeric/zero/negatives → 2 (research D6,
      mutation-gap compensating control). Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T008 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-textarea.browser.spec.ts`
      (marker `// @spec:004-ki-textarea`), consuming the BUILT
      `../dist/components/ki-textarea.js` and injecting `@kimen/tokens/css`
      (002/003 pattern): S1 real typing via `userEvent` updates `value`
      and fires composed input events during entry; S2 entering two lines
      yields a value with the two lines separated by `\n`; S3 a `rows="6"`
      field's entry area is six line-heights tall (assert against a
      `rows="2"` baseline: height delta = 4 × resolved
      `--ki-textarea-line-height`) and shows no resize handle
      (`resize: none` resolved on the textarea part); S4 a readonly
      textarea keeps "No refunds after 30 days" under edit attempts; S5 a
      disabled textarea stays empty and never receives focus; S19 the
      placeholder is shown while empty and gone after typing
      (`:placeholder-shown` flips); S20 committing an edit (blur) fires
      exactly one composed change with the final value; S6 unknown rows
      value renders at the default height. Verify failing.
- [ ] T009 [P] [US1] Write the keyboard section of the browser suite:
      S7 Tab reaches the field and the focus indication is visible
      (computed outline/box-shadow on the `field` enclosure changes under
      `:focus-within`); S8 with the textarea focused inside a real
      `<form>`, pressing Enter inserts a line break into the value and the
      form does NOT submit (submit listener flag stays false — the
      regression pin for research D4's deliberate no-forward, the inverse
      of ki-input); S21 Tab from a focused textarea holding "Ring twice"
      moves focus to the next interactive element without inserting a
      character. Verify failing.
- [ ] T010 [P] [US1] Write the assistive-tech section of the browser
      suite: S9 accessibility tree exposes a multiline text field with
      accessible name "Delivery notes"; S10 required exposed; S11 disabled
      exposed as unavailable; S22 readonly exposed as read-only; S25 the
      internal entry control carries the forwarded
      `autocomplete="street-address"` (entry purpose programmatically
      exposed — SC 1.3.5); axe zero violations across the state matrix.
      Verify failing.

### GREEN: implementation

- [ ] T011 [US1] Implement anatomy and core behavior per research
      D1/D2/D5/D6/D7 in
      `packages/elements/src/components/ki-textarea/ki-textarea.tsx` +
      `ki-textarea.form.ts`: shadow `<label part="label" htmlFor>` +
      `<div part="field">` wrapping a native `<textarea part="textarea">`;
      NO slots; `delegatesFocus: true`; reflected props `label`,
      `placeholder`, `name`, `rows` (normalized via pure
      `normalizeKiTextareaRows` in `ki-textarea.form.ts`, forwarded to the
      internal textarea), `required`, `readonly`, `disabled`,
      `autocomplete` (forwarded verbatim); non-reflected mutable `value`
      prop with dirty-value semantics (attribute = default, property =
      live value written to the internal textarea via ref/watcher — never
      JSX children —, programmatic set silent); composed `change`
      re-dispatch from the host (native `change` is not composed); NO
      Enter keydown handler (research D4 — the absence IS the behavior S8
      pins). CSS in `ki-textarea.css`: tokens-only via the
      `--_ki-textarea-*` indirection layer on `:host` (002/003 pattern) —
      base = rest inks, swapped under `:host(:hover)`,
      `:host(:focus-within)` (+ focus ring from
      `--ki-textarea-focus-ring-*`), `:host([disabled])`,
      `:host([readonly])`, `:host(:state(user-invalid))`; logical
      properties only; per-side border widths from
      `--ki-textarea-border-*-width`; `resize: none` on the textarea part
      (keyword, outside the stylelint strict-value list);
      `line-height: var(--_ki-textarea-line-height)` on the textarea part
      (S3's line unit); `min-block-size` from `--ki-textarea-min-target`
      on the field (Art. V ≥24 px); no intrinsic transitions (static
      label, no motion surface).
- [ ] T012 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use plus the two agent notes per
      contracts/textarea-contract.md §Agent-facing metadata: value
      attribute vs element content, Enter-never-submits inverse of
      ki-input) — an undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T013 [US1] Per-story gates: axe zero violations across the matrix
      (asserted in T010; `pnpm --filter @kimen/elements run test-browser`
      green); add BOTH ki-textarea entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-textarea.js` ignoring `@stencil/core`, limit
      9 KB; worst case: same path with runtime, limit 25 KB — mirror the
      ki-button entries, which stay) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Nota superficies máquina:
      CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
      Fase 3 (founder 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S11, S19–S22,
S25 pass (S8's no-submit pin included).

---

## Phase 4: User Story 2 — Participate in a form (Priority: P2)

**Goal**: full ElementInternals form participation: submission with line
breaks intact, reset, required blocking with native-parity constraint
validation, readonly submission + exemption, disabled/fieldset exclusion.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T014 [US2] Extend the browser suite with real-`<form>` scenarios:
      S12 submitted FormData contains `comments=Great service` (and a
      multiline variant preserving `\n` through FormData — FR-004); S13
      reset restores the attribute-declared initial text after edits; S14
      an empty required textarea blocks submission and reports a missing
      value, and the invalid appearance (`:state(user-invalid)` styling)
      is absent on first render, appearing only after the blocked attempt
      (FR-012); S15 typing inside a disabled fieldset leaves the text
      unchanged; S16 a disabled textarea's entry is absent from FormData;
      S23 a readonly textarea still submits its text — assert alongside it
      that an empty readonly required field does NOT block submission
      (FR-006 native exemption, research D3). Verify failing.

### GREEN

- [ ] T015 [US2] Implement form participation per research D2/D3/D4/D8 in
      `ki-textarea.tsx`: `formAssociated: true`, `@AttachInternals()`;
      `internals.setFormValue(value)` on every value change;
      `internals.setValidity(textarea.validity, textarea.validationMessage,
      textarea)` mirroring on every validity-affecting change (`required`
      forwarded so `valueMissing` computes natively; readonly exemption
      falls out of the native barring); `formResetCallback` restoring the
      attribute default and clearing dirty; `formDisabledCallback`
      propagating `fieldset[disabled]` to the internal textarea;
      user-invalid custom state via `internals.states` (set on host
      `invalid` event or invalid user commit, cleared when valid or on
      reset). Explicitly NO `requestSubmit` forward (research D4). Keep
      any extractable value/validity rules as small pure functions in
      `ki-textarea.form.ts` with exhaustive unit cases in T007's file
      (mutation-gap compensating control, plan.md Art. III).

### Component quality gates (US2)

- [ ] T016 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/004-ki-textarea`; if
      the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S12–S16, S23 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming proven on the multiline control, including
the enclosure-is-a-theme-decision claim; label and text follow the writing
direction.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T017 [US3] Extend the browser suite with theming scenarios following
      the 001/002 pattern (inject built token stylesheets): S17 declaring
      `data-ki-theme="material3"` restyles the textarea — assert resolved
      `--ki-textarea-*` values change across states, including the
      per-side border-width tokens that switch the enclosure (SC-002); S18
      forced dark under onmars resolves dark ink values (follow the
      002/003 split into
      `packages/elements/browser-tests/ki-textarea.dark.browser.spec.ts`
      with its own `// @spec:004-ki-textarea` marker if the forced-dark
      context needs isolation, as ki-button did); S24 under `dir="rtl"`
      with a labeled textarea holding text, the label starts at the inline
      start edge and the entered text follows the right-to-left direction
      (compare inline positions / computed direction on the textarea
      part). Verify failing (tokens exist from Phase 2; failure must come
      from component CSS not consuming them — if Phase 3 already turns any
      of these green, record that instead and keep the assertions as
      regression tests).

### GREEN

- [ ] T018 [US3] Close any gap the S17/S18/S24 tests expose in
      `ki-textarea.css` token consumption (every ink and border width
      through `--_ki-textarea-*` → `--ki-textarea-*`, logical properties
      only); `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S17, S18, S24 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent places the right field (Priority: P3)

**Goal**: the generated contract answers when-to-use both ways
(ki-textarea vs ki-input); malformed values are safe (S6 already tested in
US1).

- [ ] T019 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      for every `ki-textarea` member: when-to-use/when-NOT-to-use
      (long-form vs single-line — the ki-input contrast in both
      directions), defaults (`rows` = 2 with fallback-on-invalid
      documented), the two agent notes (initial text via `value`
      attribute, element content ignored; Enter inserts a line, never
      submits — inverse of ki-input), label-mandatory guidance; and that
      `src/components.d.ts` exposes the typed props. Commit regenerated
      artifacts (never hand-edited, Art. I). Nota superficies máquina:
      CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
      Fase 3 (founder 2026-07-08) — this task's scope is docs.json
      completeness only.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T020 [P] Write
      `packages/elements/src/components/ki-textarea/ki-textarea.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration): `Playground` (every prop as a control)
      plus one story per axis — `Rows` (2/4/8 side by side),
      `WithPlaceholder`, `Required`, `Disabled`, `Readonly`,
      `LongContent` (overflow scrolls inside the fixed-height field). No
      axis for size/variant/tone and no slot stories — they do not exist
      on ki-textarea.
- [ ] T021 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      label alignment, text direction, paddings — logical properties only,
      Art. IV; S24 already automated in T017). Manual APG walkthrough: N/A
      — native multiline-textbox pattern, no new APG interaction pattern
      (plan.md Art. V; charter flags dialog/tooltip/tabs/select only).
- [ ] T022 Run `pnpm exec nx run-many -t size` — ki-textarea marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, ki-button entries unaffected,
      token stylesheets within caps (Art. IV budget, SC-005).
- [ ] T023 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes constitution,
      traceability (S1–S25 ↔ tests), tokens-sync, contrast (now sweeping
      `--ki-textarea-*`), lint, styles, typecheck, deadcode (knip sees no
      dead export), packaging, budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004 (P) → T005 → T006 ─┤ (tokens + contrast sweep before any component CSS)
             ├─ Phase 3 (US1): T007–T010 (P, RED) → T011 → T012 → T013
             ├─ Phase 4 (US2): T014 (RED) → T015 → T016   (after US1 GREEN)
             ├─ Phase 5 (US3): T017 (RED) → T018          (after Phase 2 + T011)
             ├─ Phase 6 (US4): T019                        (after T012 + build)
             └─ Phase 7: T020, T021 (P) → T022 → T023     (last)
```

- Single writer on `feat/ki-textarea`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 (different token files); T007 ∥ T008
  ∥ T009 ∥ T010 (different files/sections written independently, merged
  into the two test files before running); T020 ∥ T021. Everything else is
  ordered.
- RED before GREEN is NON-NEGOTIABLE: T007–T010 before T011; T014 before
  T015; T017 before T018. Each RED task records the failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002/003). Compensating control lives in T007/T015
  (pure `ki-textarea.form.ts` logic with exhaustive unit cases per
  branch). Wiring Stryker is a factory chore outside this spec.
- Every S-ID S1–S25 maps to a test task (CI-gated by
  check-traceability.sh):
  - S6 → T007 (also T008)
  - S1, S2, S3, S4, S5, S19, S20 → T008
  - S7, S8, S21 → T009
  - S9, S10, S11, S22, S25 → T010
  - S12, S13, S14, S15, S16, S23 → T014
  - S17, S18, S24 → T017
- FR coverage: FR-001 → T007/T010(S9)/T011; FR-002 → T008(S1)/T014(S13)/
  T011/T015; FR-003 → T007(S6)/T008(S3)/T011; FR-004 → T008(S2)/T009(S8)/
  T014(S12); FR-005 → T008(S19); FR-006 → T008(S4)/T010(S22)/T014(S23);
  FR-007 → T008(S5)/T010(S11)/T014(S16); FR-008 → T014(S12,S13,S15)/T015;
  FR-009 → T010(S10)/T014(S14); FR-010 → T008(S1,S20)/T011;
  FR-011 → T003–T006/T011/T018; FR-012 → T011/T014(S14)/T015;
  FR-013 → T009(S7)/T017(S18); FR-014 → T007/T011; FR-015 → T011/T017(S24);
  FR-016 → T012/T019; FR-017 → T010(S25)/T011.
- Deliberate inversion vs 003: ki-input forwards Enter to
  `form.requestSubmit()` (003 D4); ki-textarea implements NO forward and
  S8/T009 pins the absence — a future shared-form-logic refactor must not
  carry the forward across.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
