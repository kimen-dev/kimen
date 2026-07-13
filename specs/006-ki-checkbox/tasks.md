# Tasks: ki-checkbox

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/006-ki-checkbox/`

**Prerequisites**: plan.md, spec.md with S1–S21, research.md (D1–D10),
data-model.md, contracts/checkbox-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:006-ki-checkbox`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = choose an
option (P1, MVP), US2 = participate in a form (P2), US3 = represent a
partial selection (P2), US4 = re-theme without touching markup (P2), US5 =
an agent generates valid checkbox markup (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-checkbox
      --spec 006-ki-checkbox`, then
      `pnpm exec nx run @kimen/elements:build && pnpm run format`. Creates
      `packages/elements/src/components/ki-checkbox/{ki-checkbox.tsx,ki-checkbox.css,ki-checkbox.spec.tsx}`
      and `packages/elements/browser-tests/ki-checkbox.browser.spec.ts`
      with traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer (blocks all component CSS)

**Purpose**: `--ki-checkbox-*` must exist and ship in both themes BEFORE
any component CSS consumes it (research.md D8; user-story-independent), and
the contrast gate must actually see the new matrix (its own per-component
mandate — plan.md Art. X).

- [ ] T003 [P] Author
      `packages/tokens/tokens/component/checkbox.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure tokens (single scale, NO size axis —
      `control-size`, `min-target`, `gap`, `radius`, `border-width`,
      `label-font-size`, `label-font-weight`, `label-line-height`);
      selection × interaction ink matrix
      `--ki-checkbox-{unchecked|checked|indeterminate}-{rest|hover|active|disabled}-{bg|fg|border}`
      (3 × 4 × 3 = 36; `fg` = mark ink, research D7); invalid treatment
      `--ki-checkbox-invalid-{bg|fg|border}`; focus ring
      `--ki-checkbox-focus-ring-{color|width|offset}`. Every value a
      reference into the 001 semantic layer (`ki.surface.*`, `ki.text.*`,
      `ki.outline.*`, `ki.accent.*`, `ki.space.*`, `ki.radius.*`,
      `ki.typography.*`) — 50 tokens (data-model.md).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/checkbox.material3.tokens.json`:
      material3 overrides for the same token names — M3 checked/
      indeterminate = primary fill with on-primary mark, error family for
      the invalid treatment — mirroring how `button.material3.tokens.json`
      overrides the button layer.
- [ ] T005 [P] Extend the component-layer contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` to the checkbox matrix
      (the gate's own comment mandates extension per component or it
      silently ignores the new matrix): add
      `/^--ki-checkbox-(?:checked|indeterminate)-(?:rest|hover|active)-bg$/u`
      to the swept patterns, pairing each `-bg` with its `-fg` mark ink;
      keep disabled cells exempt (WCAG 1.4.3) and keep the `unchecked`
      column OUT of the text sweep (no mark rendered; the unchecked border
      is a 1.4.11 non-text obligation met at the token layer — research
      D8); extend `packages/tokens/scripts/check-contrast.test.mjs` so the
      zero-match guard covers the checkbox pattern independently of the
      button pattern.
- [ ] T006 Wire both token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/checkbox.tokens.json` to `LAYERS` and
      `tokens/component/checkbox.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` (extended sweep from T005
      must match and pass in both themes × schemes) and
      `pnpm --filter @kimen/tokens size` (stylesheets stay ≤ their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable).

**Checkpoint**: `--ki-checkbox-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; extended contrast sweep, token budgets
green.

---

## Phase 3: User Story 1 — Choose an option (Priority: P1) 🎯 MVP

**Goal**: native-checkbox toggle parity: pointer and Space toggles with
exactly one state flip per attempt, input-before-change composed events,
label activation, disabled inertness, visible focus, correct
name/role/state exposure, boolean presence semantics.

**Independent Test**: quickstart.md §Manual validation 1 and 4 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-checkbox/ki-checkbox.spec.tsx`
      (marker `// @spec:006-ki-checkbox`): S4 a checkbox declared with
      `checked="false"` renders checked (boolean presence semantics —
      guards the Stencil `"false"` coercion, research D2); anatomy
      assertions (shadow `<label>` wrapping the native
      `input[type=checkbox]`, `part="control"` box containing BOTH inline
      SVG marks with `stroke="currentColor"` and `aria-hidden="true"`,
      `part="label"` wrapping the default slot, no named slots);
      exhaustive unit cases for the `ki-checkbox.form.ts` pure functions —
      `checkboxFormValue` (checked/unchecked × value present/absent/empty)
      and the boolean-presence normalizer (present, `"false"`, `"true"`,
      absent) — the mutation-gap compensating control (research D2/D4).
      Run `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T008 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-checkbox.browser.spec.ts`
      (marker `// @spec:006-ki-checkbox`), consuming the BUILT
      `../dist/components/ki-checkbox.js` and injecting `@kimen/tokens/css`
      (002 pattern): S1 clicking the control checks it, a composed change
      event reports the checked state and a composed input event precedes
      it (record event order); rapid double click yields exactly one
      change per flip; S2 a disabled checkbox never changes, receives no
      focus and emits no change; S20 clicking the slotted label text
      toggles the control (native label activation, research D1). Verify
      failing.
- [ ] T009 [P] [US1] Write the keyboard section of the browser suite: S5
      Tab reaches the checkbox as one tab stop and the focus indication is
      visible (computed outline/box-shadow on the `control` part changes
      under keyboard focus, from `--ki-checkbox-focus-ring-*`); S6 Space
      toggles the focused checkbox; Enter does NOT toggle (native parity,
      spec assumption). Verify failing.
- [ ] T010 [P] [US1] Write the assistive-tech section of the browser
      suite: S7 the accessibility tree exposes a checkbox named
      "Email notifications" (name from the slotted label via the shadow
      `<label>`, research D10) in the checked state; S9 a disabled
      checkbox is exposed as unavailable; axe zero violations across the
      selection × interaction × validity matrix (checked/unchecked/
      indeterminate × rest/disabled/required-invalid). Verify failing.

### GREEN: implementation

- [ ] T011 [US1] Implement anatomy and core behavior per research
      D1/D2/D6/D7/D10 in
      `packages/elements/src/components/ki-checkbox/ki-checkbox.tsx` +
      `ki-checkbox.form.ts`: shadow `<label>` wrapping a visually hidden
      native `<input type="checkbox">` (sized to
      `max(control-size, min-target)` ≥ 24 px), `<span part="control">`
      with the two currentColor SVG marks, `<span part="label"><slot /></span>`;
      `shadow: { delegatesFocus: true }`; reflected props `checked`
      (live, mutable), `indeterminate` (stub sync — full behavior in US3),
      `disabled`/`required` (forwarded), `name`, `value`;
      boolean-presence normalization of all boolean props at load via the
      pure helper (S4); internal change listener syncing
      `checked`/`indeterminate` from the input and re-dispatching composed
      `change` (native `input` passes through composed — research D6);
      programmatic assignments silent. CSS in `ki-checkbox.css`:
      tokens-only via the `--_ki-checkbox-*` indirection layer on `:host`
      (002/003 pattern) — base = unchecked-rest inks, swapped under
      `:host([checked])`, `:host([indeterminate])`, `:host(:hover)`,
      `:host(:active)`, `:host([disabled])`, `:host(:state(user-invalid))`;
      focus ring via `input:focus-visible ~ [part='control']`; mark
      visibility toggled by selection attributes (indeterminate wins over
      checked); mark state-change animation wrapped ENTIRELY in
      `@media (prefers-reduced-motion: no-preference)` (FR-014); logical
      properties only; gap/typography from label tokens.
- [ ] T012 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/checkbox-contract.md §Agent-facing metadata — including
      the checkbox-vs-switch-vs-radio-group distinction and the
      `checked="false"` presence-semantics warning) — an undocumented
      member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T013 [US1] Per-story gates: axe zero violations across the matrix
      (asserted in T010; `pnpm --filter @kimen/elements run test-browser`
      green); add BOTH ki-checkbox entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-checkbox.js` ignoring `@stencil/core`, limit
      9 KB; worst case: same path with runtime, limit 25 KB — mirror the
      ki-button entries, which stay) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Nota superficies máquina:
      CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
      diferido a Fase 3 (decisión founder 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1, S2, S4–S7, S9,
S20 pass.

---

## Phase 4: User Story 2 — Participate in a form (Priority: P2)

**Goal**: full ElementInternals form participation: name/value submitted
only when checked, nothing when unchecked, reset to the association-time
baseline, required blocking with the user-invalid presentation, fieldset
disabling.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T014 [US2] Extend the browser suite with real-`<form>` scenarios:
      S10 submitted FormData contains `newsletter=on` when checked (and
      the declared `value` when set); S11 unchecked contributes NO
      `newsletter` entry at all; S13 after unchecking a load-time-checked
      checkbox, reset restores checked (baseline captured at form
      association, FR-006); S14 a required unchecked checkbox blocks
      submission and is reported invalid, and the invalid appearance
      (`:state(user-invalid)` styling) is absent on first render and
      appears only after the blocked submission attempt; S15 a disabled
      fieldset prevents state changes and removes the entry from FormData.
      Verify failing.

### GREEN

- [ ] T015 [US2] Implement form participation per research D2/D4/D5 in
      `ki-checkbox.tsx`: `formAssociated: true`, `@AttachInternals()`;
      `internals.setFormValue(checkboxFormValue(checked, value))` on every
      `checked`/`value` change (pure function from `ki-checkbox.form.ts` —
      `value ?? 'on'` when checked, `null` when unchecked);
      `formAssociatedCallback` capturing the reset baseline;
      `formResetCallback` restoring `checked` to the baseline and NEVER
      touching `indeterminate` (native parity, FR-006);
      `formDisabledCallback` propagating `fieldset[disabled]` to the
      internal input; `required` forwarded +
      `internals.setValidity(input.validity, input.validationMessage,
      input)` mirrored on every validity-affecting change (`valueMissing`
      computed natively); `user-invalid` custom state via
      `internals.states` (set on host `invalid` event or an invalidating
      user toggle, cleared when valid or on reset — 003 D7 reused). Keep
      any extractable rules as small pure functions in
      `ki-checkbox.form.ts` with exhaustive unit cases in T007's file
      (mutation-gap compensating control, plan.md Art. III).

### Component quality gates (US2)

- [ ] T016 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/006-ki-checkbox`; if
      the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S10, S11, S13–S15 green; full browser suite green.

---

## Phase 5: User Story 3 — Represent a partial selection (Priority: P2)

**Goal**: the indeterminate presentation: mixed visual + "mixed" AT
exposure, native toggle resolution (unchecked→checked, checked→unchecked,
mixed always cleared, attribute removed), binary submitted value.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T017 [US3] Extend the browser suite with partial-selection
      scenarios: S8 an indeterminate checkbox is exposed to the
      accessibility tree in the mixed state (via the forwarded native
      `input.indeterminate`, research D3); S3 clicking an unchecked
      indeterminate checkbox resolves it to checked and not mixed — and
      the `indeterminate` attribute is REMOVED from the host (serialized
      markup agrees with visual state); S19 clicking a checked
      indeterminate checkbox resolves it to unchecked and not mixed; S12
      submitting a form whose checked checkbox is displayed indeterminate
      carries the binary value (`select-all=on`), never "mixed"; plus the
      spec edge case as a regression assert: form reset after a toggle
      cleared the mixed presentation does NOT re-apply it. Verify failing
      (the T011 stub must not already satisfy these; if any pass, record
      why and keep them as regression tests).

### GREEN

- [ ] T018 [US3] Implement the indeterminate contract per research D3 in
      `ki-checkbox.tsx` + `ki-checkbox.css`: reflected boolean prop synced
      BOTH ways — watcher forwards to the internal `input.indeterminate`
      property (native mixed exposure, zero ARIA), internal change
      listener clears the prop/attribute on any user toggle (native
      machinery already inverted `checked`); CSS precedence
      `:host([indeterminate])` over `:host([checked])` (mixed wins
      visually, dash mark shown); `indeterminate-*` ink column consumed
      through the indirection layer.

**Checkpoint**: S3, S8, S12, S19 green.

---

## Phase 6: User Story 4 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of the full selection × interaction ×
validity matrix; RTL order; reduced-motion contract.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T019 [US4] Extend the browser suite with theming scenarios following
      the 001/002 pattern (inject built token stylesheets): S16 declaring
      `data-ki-theme="material3"` restyles the checkbox — assert resolved
      `--ki-checkbox-*` values change across selection × interaction
      states (SC-002); S17 forced dark under onmars resolves dark ink
      values (follow the 002/003 split into
      `packages/elements/browser-tests/ki-checkbox.dark.browser.spec.ts`
      with its own `// @spec:006-ki-checkbox` marker if the forced-dark
      context needs isolation, as ki-button did); S18 under `dir="rtl"`
      the control leads and the label trails in right-to-left order
      (compare inline positions of the `control` and `label` parts); S21
      under emulated `prefers-reduced-motion: reduce`, toggling applies
      the new state with no state-change animation (computed
      transition/animation on the marks is none; state renders instantly).
      Verify failing (tokens exist from Phase 2; failure must come from
      component CSS not consuming them — if earlier phases already turn
      any of these green, record that instead and keep the assertions as
      regression tests).

### GREEN

- [ ] T020 [US4] Close any gap the S16/S17/S18/S21 tests expose in
      `ki-checkbox.css` token consumption (every ink through
      `--_ki-checkbox-*` → `--ki-checkbox-*`, logical properties only,
      motion fully inside the `no-preference` media block);
      `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S16–S18, S21 green; stylelint token allowlist green.

---

## Phase 7: User Story 5 — An agent generates valid checkbox markup (Priority: P3)

**Goal**: the generated contract answers when-to-use (checkbox vs switch vs
radio group); malformed boolean values are safe (S4 already tested in US1).

- [ ] T021 [US5] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use, defaults, the checkbox-vs-switch-vs-
      radio-group distinction, label-mandatory guidance, and the
      `checked="false"`-still-renders-checked presence-semantics note) for
      every `ki-checkbox` member, and that `src/components.d.ts` exposes
      the typed members. Commit regenerated artifacts (never hand-edited,
      Art. I). Nota superficies máquina: CEM/llms.txt llegan con
      017-agent-surfaces (en curso); catálogo Zod diferido a Fase 3
      (decisión founder 2026-07-08) — this task's scope is docs.json
      completeness only.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T022 [P] Write
      `packages/elements/src/components/ki-checkbox/ki-checkbox.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration): `Playground` (every prop as a control)
      plus one story per axis — `States` (unchecked/checked/indeterminate
      side by side), `Required`, `Disabled`, `SelectAll` (parent +
      children partial-selection composition, application-level wiring per
      Art. VII). No axis for size/variant/tone — they do not exist on
      ki-checkbox.
- [ ] T023 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      control/label order, gap side — logical properties only, Art. IV;
      S18 already automated in T019) and a reduced-motion manual toggle
      check (S21 automated in T019). Manual APG walkthrough: N/A — the
      checkbox including its mixed state is an established native pattern,
      not a new APG interaction pattern (plan.md Art. V; charter flags
      dialog/tooltip/tabs/select only).
- [ ] T024 Run `pnpm exec nx run-many -t size` — ki-checkbox marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, ki-button entries unaffected,
      token stylesheets within caps (Art. IV budget, SC-005).
- [ ] T025 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes constitution,
      traceability (S1–S21 ↔ tests), tokens-sync, contrast (extended
      checkbox sweep), lint, styles, typecheck, deadcode (knip sees no
      dead export), packaging, budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004, T005 (P) → T006 ─┤ (tokens + sweep before any component CSS)
             ├─ Phase 3 (US1): T007–T010 (P, RED) → T011 → T012 → T013
             ├─ Phase 4 (US2): T014 (RED) → T015 → T016   (after US1 GREEN)
             ├─ Phase 5 (US3): T017 (RED) → T018           (after US1 GREEN; uses US2's form harness for S12 — run after T015)
             ├─ Phase 6 (US4): T019 (RED) → T020           (after Phase 2 + T011)
             ├─ Phase 7 (US5): T021                        (after T012 + build)
             └─ Phase 8: T022, T023 (P) → T024 → T025      (last)
```

- Single writer on `feat/ki-checkbox`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 ∥ T005 (different files); T007 ∥
  T008 ∥ T009 ∥ T010 (different files/sections written independently,
  merged into the two test files before running); T022 ∥ T023. Everything
  else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T007–T010 before T011; T014 before
  T015; T017 before T018; T019 before T020. Each RED task records the
  failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–7 are incremental; Phase 8 closes.

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002, unchanged in the 003 plan). Compensating control
  lives in T007/T015 (pure `ki-checkbox.form.ts` logic with exhaustive
  unit cases per branch). Wiring Stryker is a factory chore outside this
  spec.
- Superficies máquina (estándar del batch): docs.json es la superficie
  máquina que existe hoy y se regenera/commitea en T013/T016/T021;
  CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
  diferido a Fase 3 (decisión founder 2026-07-08).
- Every S-ID S1–S21 maps to a test task (CI-gated by
  check-traceability.sh):
  - S4 → T007
  - S1, S2, S20 → T008
  - S5, S6 → T009
  - S7, S9 → T010
  - S10, S11, S13, S14, S15 → T014
  - S3, S8, S12, S19 → T017
  - S16, S17, S18, S21 → T019
- FR coverage: FR-001 → T008(S1)/T009(S6)/T011; FR-002 → T017/T018;
  FR-003 → T008(S20)/T010(S7)/T011; FR-004 → T008(S2)/T010(S9)/T014(S15);
  FR-005 → T014(S10,S11,S15)/T015; FR-006 → T014(S13)/T015/T017(reset
  regression); FR-007 → T014(S14)/T015; FR-008 → T003–T006/T011/T020;
  FR-009 → T011/T015/T019; FR-010 → T007(S4)/T011; FR-011 → T009(S5)/T011;
  FR-012 → T007/T011; FR-013 → T011/T019(S18); FR-014 → T011/T019(S21);
  FR-015 → T012/T021.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
