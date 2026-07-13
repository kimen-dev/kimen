# Tasks: ki-switch

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/008-ki-switch/`

**Prerequisites**: plan.md, spec.md with S1–S21, research.md (D1–D10),
data-model.md, contracts/switch-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:008-ki-switch`; S-IDs appear on code lines (test
titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = flip a setting
with immediate effect (P1, MVP), US2 = participate in a form (P2), US3 =
re-theme without touching markup (P2), US4 = an agent picks the right
control (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-switch --spec
      008-ki-switch`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-switch/{ki-switch.tsx,ki-switch.css,ki-switch.spec.tsx}`
      and `packages/elements/browser-tests/ki-switch.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension (blocks all component CSS)

**Purpose**: `--ki-switch-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D7), and the contrast sweep must
cover the new family in the SAME change or the gate silently ignores it
(research.md D8, Art. X; user-story-independent).

- [ ] T003 [P] Author `packages/tokens/tokens/component/switch.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure tokens (single scale, NO size axis —
      `track-width`, `track-height`, `thumb-size`, `thumb-inset`, `gap`,
      `track-radius`, `thumb-radius`, `border-width`, `min-target` with
      `min-target` ≥ 24 px per FR-013, geometry referencing `ki.space.*` /
      `ki.radius.*`); state color matrix
      `--ki-switch-{unchecked|checked}-{rest|hover|active|disabled}-{track|thumb|border}`
      (2 × 4 × 3 = 24, unchecked family from neutral
      `ki.surface.*`/`ki.outline.*`, checked family from the primary
      emphasis ramp, disabled cells from `ki.surface.disabled-*`); focus
      ring `--ki-switch-focus-ring-{color|width|offset}`. Every value a
      reference into the 001 semantic layer — 36 tokens (data-model.md).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/switch.material3.tokens.json`:
      material3 overrides for the same token names — selected track =
      primary with on-primary thumb and transparent border, unselected
      track = high surface with visible outline border and outline-toned
      thumb — mirroring how `button.material3.tokens.json` overrides the
      button layer.
- [ ] T005 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): add the switch pattern
      `^--ki-switch-(?:unchecked|checked)-(?:rest|hover|active)-track$`
      pairing each `…-thumb` over its `…-track`; introduce a per-pair
      minimum ratio (existing text pairs stay at 4.5; switch pairs check
      WCAG 1.4.11 non-text at 3.0); apply the zero-match guard per pattern
      so name drift in either family fails loudly; disabled cells stay
      exempt. Add unit cases to
      `packages/tokens/scripts/check-contrast.test.mjs` (pattern matching,
      per-pair minimum, zero-match guard) — research.md D8.
- [ ] T006 Wire both token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/switch.tokens.json` to `LAYERS` and
      `tokens/component/switch.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` (extended sweep green:
      thumb-on-track ≥ 3:1 in every non-disabled cell × theme × scheme) and
      `pnpm --filter @kimen/tokens size` (stylesheets stay ≤ their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable). Any semantic-layer delta
      the sweep forces gets declared for founder sign-off at the merge gate
      (002 precedent).

**Checkpoint**: `--ki-switch-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; extended contrast sweep, token budgets
and tokens-sync green.

---

## Phase 3: User Story 1 — Flip a setting with immediate effect (Priority: P1) 🎯 MVP

**Goal**: the immediate binary toggle with native machinery: pointer/label/
Space toggling with exactly one `input` + one `change` per toggle,
programmatic silence, disabled inertness, switch semantics in the
accessibility tree, visible focus.

**Independent Test**: quickstart.md §Manual validation 1, 2 and 3 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-switch/ki-switch.spec.tsx`
      (marker `// @spec:008-ki-switch`): S4 a switch declared with
      `checked="maybe"` renders on and remains operable; anatomy assertions
      (internal `input[type=checkbox][role=switch]` visually hidden inside
      the shadow label, parts `track`/`thumb`/`label`, default slot, NO
      part on the internal input); programmatic `el.checked = true`
      updates state and attribute with no `input`/`change` dispatched
      (FR-002); exhaustive unit cases for the pure helpers in
      `ki-switch.form.ts` — `checkedFromMarkup` (presence semantics: every
      truthy string, the literal `"false"` string that Stencil coerces
      wrong, absent attribute; research D2) and `resolveSubmittedValue`
      (on/off × default `"on"`/custom value; research D5) — the
      mutation-gap compensating control. Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T008 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-switch.browser.spec.ts`
      (marker `// @spec:008-ki-switch`), consuming the BUILT
      `../dist/components/ki-switch.js` and injecting `@kimen/tokens/css`
      (002/003 pattern): S1 clicking the off switch turns it on with
      exactly one composed `input` AND exactly one composed `change`
      observed on the host; S2 clicking again turns it off; S3 a disabled
      switch does not toggle and reports no state change; S17 clicking the
      slotted label text toggles the switch with exactly one `change`; S4
      `checked="maybe"` renders on and toggles normally in a real browser.
      Verify failing.
- [ ] T009 [P] [US1] Write the keyboard section of the browser suite: S5
      Tab reaches the switch and the focus indication is visible (computed
      outline/box-shadow on the `track` part changes under
      `:focus-visible`); S6 Space toggles the focused switch (and Enter
      does NOT — approved surface is Space only, research D1); S20 with a
      disabled switch followed by a button, Tab lands on the button,
      skipping the switch. Verify failing.
- [ ] T010 [P] [US1] Write the assistive-tech section of the browser
      suite: S7 the accessibility tree exposes a switch named "Email
      notifications" in the off state; S8 after a user toggle the tree
      exposes the on state; S9 a disabled switch is exposed as
      unavailable; ≥24×24 px pointer target asserted from the rendered box
      (FR-013); axe zero violations across the checked × disabled matrix
      under the default theme. Verify failing.

### GREEN: implementation

- [ ] T011 [US1] Implement anatomy and core behavior per research
      D1/D2/D4/D6 in
      `packages/elements/src/components/ki-switch/ki-switch.tsx` +
      `ki-switch.form.ts`: shadow `<label>` wrapping a visually hidden
      native `<input type="checkbox" role="switch">`,
      `<span part="track"><span part="thumb"/></span>` and
      `<span part="label"><slot/></span>`; `delegatesFocus: true`;
      reflected props `checked` (mutable, presence-normalized via pure
      `checkedFromMarkup` — the `"false"` string means on), `disabled`
      (propagated to the internal input), `name`, `value`; watcher syncs
      host `checked` ↔ internal input silently (programmatic = no events);
      internal user `change` → host `checked` + composed `change`
      re-dispatch (native `input` passes through; nothing re-emitted).
      CSS in `ki-switch.css`: tokens-only via the `--_ki-switch-*`
      indirection layer on `:host` (002 pattern) — base = unchecked/rest
      inks, swapped under `:host([checked])`, `:host(:hover)`,
      `:host(:active)`, disabled; focus ring from
      `--ki-switch-focus-ring-*` on `input:focus-visible + [part='track']`;
      thumb positioned by `inset-inline-start` (off = thumb-inset, on =
      `calc(100% - thumb-size - thumb-inset)`); travel transition ONLY
      inside `@media (prefers-reduced-motion: no-preference)`; logical
      properties only; `min-block-size`/`min-inline-size` from
      `--ki-switch-min-target` (≥24 px, FR-013).
- [ ] T012 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/switch-contract.md §Agent-facing metadata, including the
      switch-vs-checkbox distinction and the boolean-presence usage note)
      — an undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T013 [US1] Per-story gates: axe zero violations across the matrix
      (asserted in T010; `pnpm --filter @kimen/elements run test-browser`
      green); add BOTH ki-switch entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-switch.js` ignoring `@stencil/core`, limit 9 KB;
      worst case: same path with runtime, limit 25 KB — mirror the
      ki-button entries, which stay) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Note: CEM/llms.txt llegan con
      017-agent-surfaces (en curso); catálogo Zod diferido a Fase 3
      (decisión founder 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S9, S17, S20
pass.

---

## Phase 4: User Story 2 — Participate in a form (Priority: P2)

**Goal**: full ElementInternals form participation: on submits
`name`/`value` (default "on", custom value honored), off submits nothing,
reset restores the association-time snapshot in both directions, disabled
fieldset excludes the control.

**Independent Test**: quickstart.md §Manual validation 4.

### RED

- [ ] T014 [US2] Extend the browser suite with real-`<form>` scenarios:
      S10 submitted FormData contains `newsletter=on` when the switch is
      on; S11 no `newsletter` entry when off; S12 a switch loaded on,
      toggled off, returns to on after form reset; S21 a switch loaded
      off, turned on by the user, returns to off after form reset; S13
      inside `<fieldset disabled>` the switch keeps its state under toggle
      attempts (and contributes nothing); S18 `value="weekly"` submits
      `newsletter=weekly` when on. Verify failing.

### GREEN

- [ ] T015 [US2] Implement form participation per research D3/D5 in
      `ki-switch.tsx`: `formAssociated: true`, `@AttachInternals()`;
      `internals.setFormValue(resolveSubmittedValue(checked, value))` on
      every checked/value change (`null` while off — the entry disappears);
      `formAssociatedCallback` captures the `resetChecked` snapshot from
      attribute presence, once per association, never mutated afterwards
      (FR-005 — the deliberate `defaultChecked` deviation the spec
      declares, shared with the 006 sibling model);
      `formResetCallback` restores `checked = resetChecked`;
      `formDisabledCallback` propagates `fieldset[disabled]` to the
      internal input. No validity wiring (no `required` in v1) and no
      Enter/implicit-submission forwarding (native checkbox parity,
      research D5). Keep extractable rules as pure functions in
      `ki-switch.form.ts` with exhaustive unit cases in T007's file
      (mutation-gap compensating control, plan.md Art. III).

### Component quality gates (US2)

- [ ] T016 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/008-ki-switch`; if
      the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S10–S13, S18, S21 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming proven on both switch states, forced dark
scheme, RTL mirroring of label order and thumb travel, and reduced-motion
suppression of the travel animation.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T017 [US3] Extend the browser suite with theming scenarios following
      the 001/002/003 pattern (inject built token stylesheets): S14
      declaring `data-ki-theme="material3"` restyles the switch — assert
      resolved `--ki-switch-*` values change across both checkedness
      states (SC-002); S15 forced dark under onmars resolves dark ink
      values, in
      `packages/elements/browser-tests/ki-switch.dark.browser.spec.ts`
      with its own `// @spec:008-ki-switch` marker (the vitest config
      routes `*.dark.browser.spec.ts` to the dark-emulating instance, 002
      split); S16 under `dir="rtl"` the label and control mirror and the
      ON-state thumb rests at the track's inline end (compare bounding
      boxes); S19 with reduced motion emulated, toggling applies the state
      instantly with no travel animation — add the `emulateReducedMotion`
      browser command (`page.emulateMedia({ reducedMotion })`) to
      `packages/elements/vitest.browser.config.ts`, mirroring the existing
      `emulateColorScheme` command (research D6), and assert the computed
      transition on the thumb is absent under `reduce`. Verify failing
      (tokens exist from Phase 2; failure must come from component CSS not
      consuming them — if Phase 3 already turns any of these green, record
      that instead and keep the assertions as regression tests).

### GREEN

- [ ] T018 [US3] Close any gap the S14/S15/S16/S19 tests expose in
      `ki-switch.css` token consumption (every ink through
      `--_ki-switch-*` → `--ki-switch-*`, logical properties only, travel
      transition only under `prefers-reduced-motion: no-preference`);
      `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S14–S16, S19 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent picks the right control (Priority: P3)

**Goal**: the generated contract answers when-to-use (switch = immediate
effect, checkbox = later submission); malformed values are safe (S4
already tested in US1).

- [ ] T019 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use with the switch-vs-checkbox
      distinction, defaults, the boolean-presence usage note, the
      label-required guidance) for every `ki-switch` member, and that
      `src/components.d.ts` exposes the typed surface. Commit regenerated
      artifacts (never hand-edited, Art. I). Machine surfaces note:
      CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
      diferido a Fase 3 (decisión founder 2026-07-08) — this task's scope
      is docs.json completeness only.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T020 [P] Write
      `packages/elements/src/components/ki-switch/ki-switch.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration): `Playground` (every prop as a control)
      plus `States` (off/on side by side), `Disabled` (both states),
      `InForm` (name/value/reset demonstration), `RTL`. No axis for
      size/variant/tone — they do not exist on ki-switch.
- [ ] T021 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      label order, gap, thumb travel — logical properties only, Art. IV;
      S16 already automated in T017). Manual APG walkthrough: N/A —
      single-key toggle over the 002 focus/disabled machinery, not flagged
      by the batch charter (plan.md Art. V; charter flags
      dialog/tooltip/tabs/select only).
- [ ] T022 Run `pnpm exec nx run-many -t size` — ki-switch marginal ≤ 9 KB
      gzipped, worst case ≤ 25 KB, ki-button entries unaffected, token
      stylesheets within caps (Art. IV budget, SC-004).
- [ ] T023 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes constitution,
      traceability (S1–S21 ↔ tests), tokens-sync, contrast (extended
      sweep), lint, styles, typecheck, deadcode (knip sees no dead
      export), packaging, budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004, T005 (P) → T006 ─┤ (tokens + extended sweep before any component CSS)
             ├─ Phase 3 (US1): T007–T010 (P, RED) → T011 → T012 → T013
             ├─ Phase 4 (US2): T014 (RED) → T015 → T016   (after US1 GREEN)
             ├─ Phase 5 (US3): T017 (RED) → T018          (after Phase 2 + T011)
             ├─ Phase 6 (US4): T019                        (after T012 + build)
             └─ Phase 7: T020, T021 (P) → T022 → T023     (last)
```

- Single writer on `feat/ki-switch`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 ∥ T005 (different files); T007 ∥
  T008 ∥ T009 ∥ T010 (different files/sections written independently,
  merged into the test files before running); T020 ∥ T021. Everything else
  is ordered.
- RED before GREEN is NON-NEGOTIABLE: T007–T010 before T011; T014 before
  T015; T017 before T018. Each RED task records the failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002/003). Compensating control lives in T007/T015
  (pure `ki-switch.form.ts` logic — `checkedFromMarkup`,
  `resolveSubmittedValue`, reset-snapshot rules — with exhaustive unit
  cases per branch). Wiring Stryker is a factory chore outside this spec.
- Every S-ID S1–S21 maps to a test task (CI-gated by
  check-traceability.sh):
  - S4 → T007 (also exercised in T008)
  - S1, S2, S3, S17 → T008
  - S5, S6, S20 → T009
  - S7, S8, S9 → T010
  - S10, S11, S12, S13, S18, S21 → T014
  - S14, S16, S19 → T017 (S15 → T017, dark split file)
- FR coverage: FR-001 → T007(S4)/T008/T011; FR-002 → T007/T008(S1,S2)/T011;
  FR-003 → T009(S5,S6)/T011; FR-004 → T008(S3)/T009(S20)/T010(S9);
  FR-005 → T014(S10–S13,S18,S21)/T015; FR-006 → T010(S7,S8)/T011;
  FR-007 → T008(S17)/T010(S7)/T011; FR-008 → T003–T006/T011/T018;
  FR-009 → T011/T017; FR-010 → T007/T011; FR-011 → T017(S19)/T018;
  FR-012 → T011/T017(S16); FR-013 → T003/T010/T011;
  FR-014 → T012/T019.
- Gate extension (Art. X): the contrast sweep MUST cover `--ki-switch-*`
  in the same change that ships the tokens (T005/T006, research D8) — an
  unextended sweep silently ignores the component.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
