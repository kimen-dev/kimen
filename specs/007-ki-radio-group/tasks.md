# Tasks: ki-radio-group

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/007-ki-radio-group/`

**Prerequisites**: plan.md, spec.md with S1–S25 (gate-1 approval pending —
the pre-implement gate blocks execution until the `.approved` marker
exists), research.md (D1–D10), data-model.md,
contracts/radio-group-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries
the file-level marker `// @spec:007-ki-radio-group`; S-IDs appear on code
lines (test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = choose exactly
one option (P1, MVP), US2 = operate the group from the keyboard (P1), US3
= participate in a form (P2), US4 = re-theme without touching markup (P2),
US5 = an agent composes a valid group (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the GROUP via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-radio-group
      --spec 007-ki-radio-group`. Creates
      `packages/elements/src/components/ki-radio-group/{ki-radio-group.tsx,ki-radio-group.css,ki-radio-group.spec.tsx}`
      and `packages/elements/browser-tests/ki-radio-group.browser.spec.ts`
      with traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Scaffold the OPTION via the Nx generator (second invocation —
      the composite is two elements, both generator-born):
      `pnpm exec nx g @kimen/nx-plugin:component ki-radio --spec
      007-ki-radio-group`, then
      `pnpm exec nx run @kimen/elements:build && pnpm run format`. Creates
      the `ki-radio/` component directory and
      `packages/elements/browser-tests/ki-radio.browser.spec.ts` (this
      file will carry option-anatomy assertions only and defer every S-ID
      scenario to the group suite — research D9), and adds the second
      export to `packages/elements/src/index.ts`.
- [ ] T003 Verify the deterministic layer passes on the raw scaffolds:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension (blocks all component CSS)

**Purpose**: `--ki-radio-*` and `--ki-radio-group-*` must exist and ship
in both themes BEFORE any component CSS consumes them (research.md D8),
and the contrast sweep must cover the new family in the SAME change or the
gate silently ignores it (Art. X; user-story-independent).

- [ ] T004 [P] Author `packages/tokens/tokens/component/radio.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure tokens (single scale, NO size
      axis — `control-size`, `dot-size`, `min-target` ≥ 24 px per FR-011,
      `gap`, `control-radius` referencing `ki.radius.round`,
      `border-width`, `label-font-size`, `label-font-weight`,
      `label-line-height`); selection × interaction ink matrix
      `--ki-radio-{unselected|selected}-{rest|hover|active|disabled}-{bg|fg|border}`
      (2 × 4 × 3 = 24; `fg` = inner-dot ink, research D8); focus ring
      `--ki-radio-focus-ring-{color|width|offset}`. Every value a
      reference into the 001 semantic layer (`ki.surface.*`, `ki.text.*`,
      `ki.outline.*`, `ki.accent.*`, `ki.space.*`, `ki.radius.*`,
      `ki.typography.*`) — 36 tokens (data-model.md).
- [ ] T005 [P] Author
      `packages/tokens/tokens/component/radio-group.tokens.json`: group
      structure only — `--ki-radio-group-gap` (vertical stack spacing) and
      `--ki-radio-group-label-{font-size|font-weight|line-height}` — 4
      theme-neutral tokens referencing the semantic layer. NO material3
      override file for the group: structure inherits through the base
      layer (research D8; an override arrives additively if M3 group-label
      typography ever diverges).
- [ ] T006 [P] Author
      `packages/tokens/tokens/component/radio.material3.tokens.json`:
      material3 overrides for the radio matrix names — selected ring +
      dot from the primary family, unselected ring from the
      on-surface/outline family, disabled cells from the disabled ramp —
      honoring the `-bg`-as-backdrop convention (M3's radio is unfilled,
      so selected `-bg` cells reference the surface the control sits on,
      never `transparent`, keeping the sweep measurable — research D8).
- [ ] T007 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): add the radio pattern
      `/^--ki-radio-selected-(?:rest|hover|active)-bg$/u` pairing each
      `-bg` with its `-fg` dot ink at a **3:1 per-pair minimum** — the
      dot is a non-text state indicator (WCAG 1.4.11). Batch coordination:
      REUSE the per-pair-minimum + per-pattern zero-match-guard mechanism
      from 008 ki-switch's T005 if it has landed on the integration
      branch; otherwise introduce it here identically (008 research D8 is
      the normative description). Keep the `unselected` column OUT of the
      sweep (no dot rendered; the unselected ring is a 1.4.11 obligation
      met at the token layer) and disabled cells exempt. Add unit cases to
      `packages/tokens/scripts/check-contrast.test.mjs` (pattern matching,
      3:1 minimum, zero-match guard) — research.md D8.
- [ ] T008 Wire the three token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `radio.tokens.json` and `radio-group.tokens.json` to `LAYERS`,
      `radio.material3.tokens.json` to `MATERIAL3_LAYERS`), rebuild
      (`pnpm --filter @kimen/tokens build`), run
      `pnpm --filter @kimen/tokens contrast` (extended sweep green:
      dot-on-bg ≥ 3:1 in every non-disabled selected cell × theme ×
      scheme) and `pnpm --filter @kimen/tokens size` (stylesheets stay ≤
      their 9 KB caps), and commit the regenerated `dist/css`
      (tokens-sync gate contract: generated, committed, diffable). Any
      semantic-layer delta the sweep forces gets declared for founder
      sign-off at the merge gate (002 precedent).

**Checkpoint**: `--ki-radio-*` and `--ki-radio-group-*` resolve in onmars
(light+dark) and material3 (light+dark) stylesheets; extended contrast
sweep, token budgets and tokens-sync green.

---

## Phase 3: User Story 1 — Choose exactly one option (Priority: P1) 🎯 MVP

**Goal**: the selection invariant with native-radio parity: pointer and
label selection through each option's native input, exactly one selected
option ever, identity-tracked selection with the value projection,
input-before-change composed events from the group, disabled option and
disabled group inertness, radiogroup/radio AT exposure.

**Independent Test**: quickstart.md §Manual validation 1 and 4 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T009 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-radio/ki-radio.spec.tsx`
      (marker `// @spec:007-ki-radio-group`): anatomy assertions — shadow
      `<label>` wrapping a visually hidden UNNAMED
      `input[type=radio]` (no `name` attribute — research D1),
      `part="control"` span with `aria-hidden="true"` (dot is CSS-only,
      no SVG), `part="label"` wrapping the default slot, no named slots;
      the element exposes NO public checked/selected member (FR-002);
      `value` defaults effectively to `"on"`; `disabled` presence
      semantics (`disabled="false"` still disables — boolean presence
      normalizer, 006 D2 helper pattern). Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T010 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-radio-group/ki-radio-group.spec.tsx`
      (marker `// @spec:007-ki-radio-group`, rendering BOTH components
      via `newSpecPage`): anatomy — visible group label in
      `part="label"`, internal `role="radiogroup"` wrapper wired via
      `aria-labelledby`, default slot inside it (research D2); exhaustive
      unit cases for the pure helpers — `nextEnabledIndex` in
      `ki-radio-group.keyboard.ts` (next/previous × wrap at both ends ×
      disabled runs × single-option self-wrap × all-disabled → none), the
      arrow→direction map (ArrowUp/Down/Left/Right × LTR/RTL),
      `radioGroupFormValue` in `ki-radio-group.form.ts` (no selection /
      selected / selected-but-disabled × option value present/absent) and
      the boolean presence normalizer — the mutation-gap compensating
      control (research D6/D7). Verify failing.
- [ ] T011 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-radio-group.browser.spec.ts`
      (marker `// @spec:007-ki-radio-group`), consuming the BUILT
      `../dist/components/ki-radio-group.js` +
      `../dist/components/ki-radio.js` and injecting `@kimen/tokens/css`
      (002/003 pattern): S1 clicking "Email" selects it, a composed
      `change` is observed on the group AFTER a composed `input`, and
      `group.value` reads `"email"` (record event order and that value is
      already current when `input` is observed — research D5); S2
      selecting "SMS" releases "Email" (exactly one selected input across
      the composite); S3 a disabled option never selects and emits
      nothing; clicking the already-selected option emits nothing; S4 a
      group declared with a value matching no option renders nothing
      selected and stays operable; S19 a disabled group ignores selection
      attempts and is exposed as unavailable; programmatic
      `group.value = 'sms'` updates the display silently. Verify failing.
- [ ] T012 [P] [US1] Write the assistive-tech section of the browser
      suite: S10 the accessibility tree exposes a radiogroup named
      "Contact preference" (visible label via `aria-labelledby`)
      containing radios named by their slotted labels, with "Email"
      exposed as selected; S11 a disabled option is exposed as an
      unavailable radio; zero option-level ARIA except `aria-hidden` on
      the control span; axe zero violations across selection × disabled
      states under the default theme. Also: option-anatomy browser
      assertions (parts exposed, pointer target ≥ 24×24 px from the
      rendered box, FR-011) go in
      `packages/elements/browser-tests/ki-radio.browser.spec.ts` (marker
      + header note deferring S-IDs to the group suite — research D9).
      Verify failing.

### GREEN: implementation

- [ ] T013 [US1] Implement `ki-radio` per research D1/D8/D10 in
      `packages/elements/src/components/ki-radio/ki-radio.tsx` +
      `ki-radio.css`: shadow `<label>` wrapping a visually hidden,
      UNNAMED native `<input type="radio">` sized to
      `max(--ki-radio-control-size, --ki-radio-min-target)` ≥ 24 px;
      `<span part="control" aria-hidden="true">` (ring; inner dot as
      `::before`, shown under `input:checked ~ [part='control']`);
      `<span part="label"><slot /></span>`;
      `shadow: { delegatesFocus: true }`; props `value` (reflected,
      effective default `"on"`) and `disabled` (reflected, presence-
      normalized, forwarded to the internal input). NO checked member, NO
      FACE. CSS tokens-only via the `--_ki-radio-*` indirection on
      `:host` — base = unselected-rest, swapped under `input:checked`,
      `:host(:hover)`, `:host(:active)`, disabled; focus ring via
      `input:focus-visible ~ [part='control']` from
      `--ki-radio-focus-ring-*`; selection transitions ONLY inside
      `@media (prefers-reduced-motion: no-preference)` (FR-014); logical
      properties only.
- [ ] T014 [US1] Implement the group's core per research D2/D3/D4/D5 in
      `packages/elements/src/components/ki-radio-group/ki-radio-group.tsx`
      + `ki-radio-group.css` + the pure modules: render visible `label`
      (`part="label"`) + `role="radiogroup"` wrapper
      (`aria-labelledby`, `aria-disabled` when effective-disabled) +
      default slot; roster from `slotchange`
      (`assignedElements()` filtered to `ki-radio`, document order) +
      `MutationObserver` on roster `disabled` attributes; identity-tracked
      `selectedRadio` with the `value` projection (initial derivation
      from the attribute, first-match programmatic assignment, silent);
      state pushed to each option's internal input through its open
      shadow root (checkedness; cache after component readiness —
      research D4); capture-phase `input` listener on the host updating
      selection/value BEFORE bubble listeners, then re-dispatching
      `new Event('change', { bubbles: true, composed: true })` from the
      group host (research D5); reconciliation rules silent (selected
      option removed → cleared; insertion re-derives when unselected —
      D3). Group CSS: vertical stack from `--ki-radio-group-gap`,
      group-label typography from `--ki-radio-group-label-*`, tokens-only
      via `--_ki-radio-group-*` indirection, logical properties only.
- [ ] T015 [US1] Complete JSDoc on every public member of BOTH elements
      (description, `@default`, when-to-use/when-NOT-to-use per
      contracts/radio-group-contract.md §Agent-facing metadata — the
      radio-group-vs-select-vs-checkbox distinction, the "ki-radio only
      inside ki-radio-group" rule, and the "never author selection on an
      option; set the group's value" warning) — an undocumented member is
      a build failure (Art. I).

### Component quality gates (US1)

- [ ] T016 [US1] Per-story gates: axe zero violations (asserted in T012;
      `pnpm --filter @kimen/elements run test-browser` green); add the
      composite-pair entries to the `size-limit` array in
      `packages/elements/package.json` (marginal: paths
      `dist/components/ki-radio-group.js` + `dist/components/ki-radio.js`
      ignoring `@stencil/core`, limit 9 KB — SC-006's single-digit budget
      is for the PAIR; worst case: same paths with runtime, limit 25 KB —
      mirror the ki-button entry style, which stays) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Nota superficies máquina
      (estándar del batch): CEM/llms.txt llegan con 017-agent-surfaces
      (en curso); catálogo Zod diferido a Fase 3 (decisión founder
      2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S4, S10, S11,
S19 pass.

---

## Phase 4: User Story 2 — Operate the group from the keyboard (Priority: P1)

**Goal**: the full APG keyboard contract owned by the group: one tab stop
(selected, else first enabled, never selecting on entry), arrows with
wrap, disabled skipping and writing-direction mapping, selection follows
focus, Space on unselected, single-step exit, disabled group skipped.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T017 [US2] Extend the browser suite with the keyboard scenarios
      (real Tab/arrow/Space key presses): S5 Tab enters the group on the
      SELECTED option with visible focus indication (computed
      outline/box-shadow on the `control` part from
      `--ki-radio-focus-ring-*`); S25 Tab enters an UNSELECTED group on
      the first enabled option and selects nothing; S6 ArrowDown moves
      focus AND selection to the next option (one composed `input` + one
      composed `change` per move — the native-click pipeline, research
      D6); S7 arrows wrap past the end and skip disabled options; S8
      Space selects the focused option of an unselected group; S9 Tab
      from inside the group lands past it in one step (exactly one tab
      stop); S20 a fully disabled group is skipped by Tab entirely; S21
      in a `dir="rtl"` document, ArrowLeft moves to the NEXT option
      (writing-direction mapping). Verify failing.

### GREEN

- [ ] T018 [US2] Implement the keyboard model per research D6 in
      `ki-radio-group.tsx` + `ki-radio-group.keyboard.ts`: roving tab
      stop (`tabindex` 0/-1 pushed onto the options' internal inputs —
      selected, else first enabled, none when all disabled or group
      disabled; recomputed on selection, reconciliation and
      disabled-mutation, including the S24 move-tab-stop-and-focus rule);
      one `keydown` listener on the host (composed events bubble from
      the options) mapping ArrowUp/Down always and ArrowLeft/Right via
      `host.matches(':dir(rtl)')`, `preventDefault()`, target from pure
      `nextEnabledIndex` (wrap + skip), then
      `input.focus(); input.click();` — selection follows focus through
      the same native activation pipeline as pointer/Space (no
      synthesized events). Home/End NOT implemented (Art. II).

### Component quality gates (US2)

- [ ] T019 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/007-ki-radio-group`;
      if the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S5–S9, S20, S21, S25 green; the composite passes both P1
stories end to end.

---

## Phase 5: User Story 3 — Participate in a form (Priority: P2)

**Goal**: full ElementInternals form participation on the GROUP only:
selected value submits under `name`, nothing when unselected or when the
selected option is disabled, platform-localized `valueMissing` blocking
while required+unselected, required/invalid AT exposure, reset to the
association-time snapshot, fieldset disabling.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T020 [US3] Extend the browser suite with real-`<form>` and validity
      scenarios: S12 submitted FormData contains `contact=email` when
      "Email" (value `email`) is selected; S13 a required group with no
      selection blocks submission and is reported invalid, and the
      validation message is non-empty and platform-sourced (no literal
      from our source — research D7); S22 the required group is exposed
      as required to AT (`aria-required` on the radiogroup); S23
      `aria-invalid` is ABSENT on first render and appears only after the
      blocked submission attempt, clearing when a selection is made; S14
      a group loaded with "Email" selected and changed to "SMS" restores
      "Email" on form reset (baseline captured at form association,
      research D7), silently; S15 inside `<fieldset disabled>` the group
      is inert and contributes nothing; S24 disabling the selected option
      preserves the group's value, moves the tab stop to the first
      enabled option without firing `input`/`change`, keeps `required`
      satisfied, and the submitted data contains NO `contact` entry.
      Verify failing.

### GREEN

- [ ] T021 [US3] Implement form participation per research D7 in
      `ki-radio-group.tsx` + `ki-radio-group.form.ts`:
      `formAssociated: true`, `@AttachInternals()`;
      `internals.setFormValue(radioGroupFormValue(selectedRadio))` on
      every selection/value/disabled-reconciliation change (pure
      function: `null` when unselected OR selected-disabled, else
      `value ?? 'on'`); constraint validation — forward
      `required && !hasSelection` to each option's internal input and
      mirror `internals.setValidity(sourceInput.validity,
      sourceInput.validationMessage, tabStopInput)` from the first
      enabled option (platform-computed `valueMissing`, localized
      message, `reportValidity` anchored on the roving tab stop); clear
      to valid the moment a selection exists (a selection on a disabled
      option satisfies required — S24); `aria-required` sync on the
      wrapper; `aria-invalid` set on the host's `invalid` event, cleared
      when valid or on reset (NO custom state, NO invalid tokens in v1 —
      research D7's declared narrowing); `formAssociatedCallback`
      snapshotting the value projection; `formResetCallback` re-deriving
      the selection from the snapshot silently; `formDisabledCallback`
      propagating effective disabled to every internal input and the
      wrapper. Keep extractable rules as pure functions with exhaustive
      unit cases in T010's file (mutation-gap compensating control,
      plan.md Art. III).

### Component quality gates (US3)

- [ ] T022 [US3] Full suites green; traceability spot-check; axe re-run
      including the required/invalid states across the matrix; if the
      public surface changed, rebuild and re-commit
      `generated/docs.json` (superficies máquina: nota estándar del
      batch — 017 en curso, Zod en Fase 3, decisión founder 2026-07-08).

**Checkpoint**: S12–S15, S22–S24 green; full browser suite green.

---

## Phase 6: User Story 4 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of the full selection × interaction matrix
on both elements, forced dark scheme, RTL control/label order.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T023 [US4] Extend the theming coverage following the 001/002/003
      pattern (inject built token stylesheets): S16 declaring
      `data-ki-theme="material3"` restyles the group — assert resolved
      `--ki-radio-*` values change across selected/unselected ×
      rest/disabled states and `--ki-radio-group-*` structure resolves
      (SC-003); S18 under `dir="rtl"` each option's control leads its
      label in right-to-left order (compare inline positions of the
      `control` and `label` parts); S17 forced dark under onmars resolves
      dark ink values, in
      `packages/elements/browser-tests/ki-radio-group.dark.browser.spec.ts`
      with its own `// @spec:007-ki-radio-group` marker (the vitest
      config routes `*.dark.browser.spec.ts` to the dark-emulating
      instance, 002 split). Verify failing (tokens exist from Phase 2;
      failure must come from component CSS not consuming them — if
      earlier phases already turn any of these green, record that instead
      and keep the assertions as regression tests).

### GREEN

- [ ] T024 [US4] Close any gap the S16/S17/S18 tests expose in
      `ki-radio.css` / `ki-radio-group.css` token consumption (every ink
      through the `--_ki-*` indirection → component tokens, logical
      properties only, motion only under
      `prefers-reduced-motion: no-preference` — FR-014 is an edge-case
      contract with no S-ID: style-level rule, verified manually in
      T027); `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S16–S18 green; stylelint token allowlist green.

---

## Phase 7: User Story 5 — An agent composes a valid group (Priority: P3)

**Goal**: the generated contract answers when-to-use (radio group vs
select vs checkbox/switch) and forbids authoring selection on options;
malformed values are safe (S4 already tested in US1).

- [ ] T025 [US5] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      for every member of BOTH tags (when-to-use/when-NOT-to-use with the
      exactly-one-of-few rule, ki-select/ki-checkbox/ki-switch
      redirections, the "ki-radio only inside ki-radio-group" rule, the
      no-checked-on-options warning, defaults incl. ki-radio's `"on"`),
      and that `src/components.d.ts` exposes both typed surfaces with NO
      leaked coordination API (research D4 — the internal channel must
      not appear). Commit regenerated artifacts (never hand-edited,
      Art. I). Nota superficies máquina: CEM/llms.txt llegan con
      017-agent-surfaces (en curso); catálogo Zod diferido a Fase 3
      (decisión founder 2026-07-08) — this task's scope is docs.json
      completeness only.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T026 [P] Write
      `packages/elements/src/components/ki-radio-group/ki-radio-group.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration — registering BOTH tags): `Playground`
      (group props as controls over a three-option composite) plus
      `States` (unselected/selected side by side), `DisabledOption`,
      `DisabledGroup`, `Required` (form demo showing the blocked
      submission), `RTL`. No standalone ki-radio stories (valid only
      inside a group — contract) and no axis for size/tone/orientation —
      they do not exist in v1.
- [ ] T027 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      control/label order, group stack, arrow-direction sanity — S18/S21
      automated in T023/T017) and the reduced-motion manual check
      (emulate `prefers-reduced-motion: reduce`, change selection: state
      applies instantly — FR-014, no S-ID, style-level contract).
- [ ] T028 **Manual APG walkthrough — REQUIRED (spec constitutional
      surface: first roving-tabindex composite = new interaction
      pattern, Art. V; unlike 006/008 this is NOT N/A)**. Against the
      built Storybook/manual page, with the APG Radio Group pattern in
      hand, document in the PR: Tab/Shift+Tab entry and exit (selected /
      first-enabled-without-selecting / skip-when-all-disabled), all four
      arrows with wrap and disabled skipping in LTR AND RTL, Space on
      unselected, and the screen-reader outcomes automation cannot pin —
      announced radiogroup name, per-option role/name/selected state, and
      the **position-in-set announcement ("2 of 3")**, the named
      verification point of the per-option-input architecture (research
      D1/D10). If a target browser/AT pair mis-announces the set,
      implement the recorded contingency (group-managed
      `aria-posinset`/`aria-setsize` on the internal inputs) with a
      failing browser test first (Art. III).
- [ ] T029 Run `pnpm exec nx run-many -t size` — composite pair marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, ki-button entries unaffected,
      token stylesheets within caps (Art. IV budget, SC-006).
- [ ] T030 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 —
      the only definition of done (Art. III). Includes constitution,
      traceability (S1–S25 ↔ tests), tokens-sync, contrast (extended
      radio sweep), lint, styles, typecheck, deadcode (knip sees no dead
      export — both new exports consumed), packaging, budgets, mock-doc
      and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 ─┐
T004, T005, T006, T007 (P) → T008 ─┤ (tokens + extended sweep before any component CSS)
             ├─ Phase 3 (US1): T009–T012 (P, RED) → T013 → T014 → T015 → T016
             ├─ Phase 4 (US2): T017 (RED) → T018 → T019    (after US1 GREEN — arrows ride the selection pipeline)
             ├─ Phase 5 (US3): T020 (RED) → T021 → T022    (after US1 GREEN; S24 also needs T018's tab-stop rules — run after Phase 4)
             ├─ Phase 6 (US4): T023 (RED) → T024            (after Phase 2 + T013/T014)
             └─ Phase 8: T026, T027 (P) → T028 → T029 → T030   (last; T025 [US5] after T015 + build)
```

- Single writer on `feat/ki-radio-group`; no parallel worktrees needed.
- Parallel opportunities: T004 ∥ T005 ∥ T006 ∥ T007 (different files);
  T009 ∥ T010 ∥ T011 ∥ T012 (different files/sections written
  independently, merged into the test files before running); T026 ∥
  T027. Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T009–T012 before T013/T014; T017
  before T018; T020 before T021; T023 before T024. Each RED task records
  the failure reason.
- MVP scope: Phases 1–3 (US1). Phase 4 completes the P1 pair; Phases 5–7
  are incremental; Phase 8 closes (T028's walkthrough is a hard
  requirement, not polish-optional).

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001–008). Compensating control lives in T009/T010/T018/
  T021 (pure `ki-radio-group.keyboard.ts` + `ki-radio-group.form.ts`
  logic — `nextEnabledIndex`, arrow/direction map, `radioGroupFormValue`,
  presence normalizer — with exhaustive unit cases per branch). Wiring
  Stryker is a factory chore outside this spec.
- Superficies máquina (estándar del batch): docs.json es la superficie
  máquina que existe hoy y se regenera/commitea en T016/T019/T022/T025;
  CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
  diferido a Fase 3 (decisión founder 2026-07-08).
- Every S-ID S1–S25 maps to a test task (CI-gated by
  check-traceability.sh):
  - S1, S2, S3, S4, S19 → T011
  - S10, S11 → T012
  - S5, S6, S7, S8, S9, S20, S21, S25 → T017
  - S12, S13, S14, S15, S22, S23, S24 → T020
  - S16, S18 → T023 (S17 → T023, dark split file)
- FR coverage: FR-001 → T009/T010/T013/T014; FR-002 → T011(S1,S2,S4)/
  T014; FR-003 → T011(S1)/T014/T020(S24 silence); FR-004 → T017(S5,S9,
  S20,S25)/T018; FR-005 → T017(S6,S7,S8,S21)/T018; FR-006 → T011(S3)/
  T012(S11)/T017(S20)/T020(S24)/T018; FR-007 → T020(S12–S15,S24)/T021;
  FR-008 → T011(S4); FR-009 → T012(S10,S11)/T020(S22,S23); FR-010 →
  T004–T008/T013/T014/T024; FR-011 → T012/T013/T017(S5); FR-012 →
  T009/T010/T013/T014; FR-013 → T023(S18)/T017(S21); FR-014 →
  T013/T024/T027 (edge-case contract, no S-ID); FR-015 → T015/T025.
- Gate extension (Art. X): the contrast sweep MUST cover `--ki-radio-*`
  in the same change that ships the tokens (T007/T008, research D8) — an
  unextended sweep silently ignores the component. Batch coordination
  with 008's per-pair-minimum mechanism is annotated in T007.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
