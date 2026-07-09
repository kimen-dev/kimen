# Tasks: ki-select

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/005-ki-select/`

**Prerequisites**: plan.md, spec.md with S1–S25 (gate-1 approval pending —
the pre-implement gate blocks execution until the `.approved` marker
exists; two spec-flagged open questions ride gate 1: typeahead inclusion
and commit-vs-discard on Tab — if the founder flips either, FR-007/S21
and the affected tests change BEFORE implementation), research.md
(D1–D10), data-model.md, contracts/select-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries
the file-level marker `// @spec:005-ki-select`; S-IDs appear on code
lines (test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = choose one
option from a closed list (P1, MVP), US2 = operate the select with the
keyboard alone (P1), US3 = participate in a form (P2), US4 = re-theme
without touching markup (P2), US5 = an agent generates a valid select
(P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the SELECT via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-select
      --spec 005-ki-select`. Creates
      `packages/elements/src/components/ki-select/{ki-select.tsx,ki-select.css,ki-select.spec.tsx}`
      and `packages/elements/browser-tests/ki-select.browser.spec.ts`
      with traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Scaffold the OPTION via the Nx generator (second invocation —
      the composite is two elements, both generator-born):
      `pnpm exec nx g @kimen/nx-plugin:component ki-option --spec
      005-ki-select`, then
      `pnpm exec nx run @kimen/elements:build && pnpm run format`.
      Creates the `ki-option/` component directory and
      `packages/elements/browser-tests/ki-option.browser.spec.ts` (this
      file will carry data-element assertions only and defer every S-ID
      scenario to the select suite — research D9), and adds the second
      export to `packages/elements/src/index.ts`.
- [ ] T003 Verify the deterministic layer passes on the raw scaffolds:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension (blocks all component CSS)

**Purpose**: `--ki-select-*` and `--ki-option-*` must exist and ship in
both themes BEFORE any component CSS consumes them (research.md D8), and
the contrast sweep must cover the new families in the SAME change or the
gate silently ignores them (Art. X; user-story-independent).

- [ ] T004 [P] Author
      `packages/tokens/tokens/component/select.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`/`input.tokens.json`): trigger structure —
      `height`, `min-target` ≥ 24 px (FR-016), `padding-inline`, `gap`,
      `radius`, `font-size`, `indicator-size`, `border-width` PLUS
      per-logical-side widths
      (`border-{block-start|block-end|inline-start|inline-end}-width`,
      each defaulting by reference to `{ki.select.border-width}` — 003
      D8's mechanism so both M3 enclosures are token-expressible);
      label — `label-gap`, `label-font-size`, `label-font-weight`,
      `label-line-height`; trigger ink matrix
      `--ki-select-{rest|hover|focus|disabled}-{bg|fg|border|label-fg}`
      (4 × 4 = 16; per-state `label-fg` per 003 D8's M3-label argument);
      `placeholder-fg`; listbox surface
      `--ki-select-listbox-{bg|radius|elevation|padding|max-block-size|offset}`
      (`bg` referencing `ki.surface.s*`, `elevation` referencing
      `ki.elevation.*` — the spec's popup-from-surface-roles mapping);
      focus ring `--ki-select-focus-ring-{color|width|offset}`. Every
      value a reference into the 001 semantic layer — 43 tokens
      (data-model.md).
- [ ] T005 [P] Author
      `packages/tokens/tokens/component/option.tokens.json` (its OWN
      file — each published tag owns its family, spec constitutional
      surface): row structure — `min-target` ≥ 24 px (FR-016),
      `padding-inline`, `radius`, `font-size`; state ink pairs
      `--ki-option-{rest|hover|highlight|selected|disabled}-{bg|fg}`
      (5 × 2 = 10) honoring the `-bg`-as-backdrop convention (007/008):
      option `-bg` cells resolve OPAQUE over the listbox surface, never
      `transparent`, keeping the sweep measurable — 14 tokens.
- [ ] T006 [P] Author
      `packages/tokens/tokens/component/select.material3.tokens.json`
      and `packages/tokens/tokens/component/option.material3.tokens.json`:
      material3 overrides — the M3 text-field enclosure for the trigger
      expressed through the per-side border widths (filled = block-end
      only, or outlined = uniform; the theme's choice, never a prop —
      FR-011), M3 label/state inks, menu surface for the listbox
      (elevated container), menu-item state inks for the option rows
      (hovered/focused/selected/disabled), with the same
      `-bg`-as-backdrop convention.
- [ ] T007 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): add the patterns
      `/^--ki-select-(?:rest|hover|focus)-bg$/u` and
      `/^--ki-option-(?:rest|hover|highlight|selected)-bg$/u` pairing
      each `-bg` with its `-fg` ink, plus the explicit pairs
      `--ki-select-placeholder-fg` on `--ki-select-rest-bg` and
      `--ki-select-{rest|hover|focus}-label-fg` on `--ki-surface-s0`
      (the label renders on the page surface) — ALL at the existing
      4.5:1 `MIN_RATIO` (every swept select surface carries TEXT; no
      3:1 non-text pair is needed — research D8). Disabled cells stay
      exempt. **Batch coordination**: REUSE the per-pattern
      zero-match-guard (and per-pair-minimum, if applicable) mechanism
      from 008 ki-switch T005 / 007 ki-radio-group T007 if either has
      landed on the integration branch; otherwise introduce the
      per-pattern guard here identically (008 research D8 is the
      normative description). Add unit cases to
      `packages/tokens/scripts/check-contrast.test.mjs` (pattern
      matching, explicit pairs, zero-match guard).
- [ ] T008 Wire the four token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `select.tokens.json` and `option.tokens.json` to `LAYERS`,
      `select.material3.tokens.json` and `option.material3.tokens.json`
      to `MATERIAL3_LAYERS`), rebuild
      (`pnpm --filter @kimen/tokens build`), run
      `pnpm --filter @kimen/tokens contrast` (extended sweep green in
      every theme × scheme) and `pnpm --filter @kimen/tokens size`
      (stylesheets stay ≤ their 9 KB caps), and commit the regenerated
      `dist/css` (tokens-sync gate contract: generated, committed,
      diffable). Any semantic-layer delta the sweep forces gets declared
      for founder sign-off at the merge gate (002 precedent).

**Checkpoint**: `--ki-select-*` and `--ki-option-*` resolve in onmars
(light+dark) and material3 (light+dark) stylesheets; extended contrast
sweep, token budgets and tokens-sync green.

---

## Phase 3: User Story 1 — Choose one option from a closed list (Priority: P1) 🎯 MVP

**Goal**: the closed-by-default select with the pointer path end to end:
data-option discovery and shadow mirror (research D1/D3), trigger + popup
anatomy with same-scope ARIA wiring (D2), CSS-only positioning (D4),
open/commit/light-dismiss (D5 pointer rows), identity-tracked selection
with the value projection and dangling-value fallback (D6), synthesized
composed input-then-change on user commits only, disabled select/option
inertness, combobox/listbox AT exposure.

**Independent Test**: quickstart.md §Manual validation 1 and 4 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T009 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-option/ki-option.spec.tsx`
      (marker `// @spec:005-ki-select`): ki-option is a DATA element —
      the host computes to `display: none` (never paints, research D1),
      renders no parts of its own, exposes NO selected/checked member
      (spec assumption); `value` falls back to the trimmed label text
      when unset (FR-002, native option parity); `disabled` presence
      semantics (`disabled="false"` still disables — boolean presence
      normalizer, 006 D2 helper pattern); `value` and `disabled` are
      reflected (the select's roster observer depends on it, research
      D3). Run `pnpm --filter @kimen/elements run test` and record the
      failure reason (scaffold placeholder).
- [ ] T010 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-select/ki-select.spec.tsx`
      (marker `// @spec:005-ki-select`, rendering BOTH components via
      `newSpecPage`): anatomy — visible `<label part="label">` wired to
      the trigger via `for`/`id` (003 D1), native
      `<button part="trigger" role="combobox">` with
      `aria-expanded="false"`, `aria-controls` referencing the SHADOW
      listbox id (same-scope IDREF — the D1 architecture claim),
      `part="value"` showing the placeholder, `aria-hidden`
      `part="indicator"`, hidden `role="listbox"` with one
      `role="option"` `part="option"` mirror row PER ki-option child
      (ids, labels mirrored, `aria-disabled` on disabled options,
      `aria-selected` on the declared selection), the hidden data-slot
      container, and the hidden native validity-donor select
      (`display:none`, `tabindex="-1"`, `aria-hidden`, research D7);
      exhaustive unit cases for the pure helpers — `moveHighlight` in
      `ki-select.keyboard.ts` (next/previous × clamp at both ends —
      NO wrap — × disabled runs × all-disabled → none),
      `firstEnabled`/`lastEnabled`, `openHighlight` (selected / no
      selection / selected-disabled), the keydown→intent map
      (closed/open × every FR-007 key, excluded keys → no intent),
      `resolveSelection` in `ki-select.form.ts` (first-match, no-match →
      none, duplicate values), `optionValue` (label-text fallback),
      `selectFormValue` (none → null; empty-valued option → `""`;
      value), `selectValueMissing` (required × submitted-value cases,
      incl. the empty-valued-option case — FR-009) and the boolean
      presence normalizer — the mutation-gap compensating control
      (research D5/D6/D7). Verify failing.
- [ ] T011 [P] [US1] Write the core-behavior section of the browser
      suite `packages/elements/browser-tests/ki-select.browser.spec.ts`
      (marker `// @spec:005-ki-select`), consuming the BUILT
      `../dist/components/ki-select.js` +
      `../dist/components/ki-option.js` and injecting
      `@kimen/tokens/css` (002/003/007 pattern): S1 clicking the trigger
      opens the popup and clicking "France" selects it — trigger shows
      "France", ONE composed `input` precedes ONE composed `change` on
      the host, `select.value` reads the option value (research D6
      order); S2 the select renders CLOSED with the placeholder in the
      trigger and options not visible; S3 a disabled select never opens
      and emits nothing; S4 clicking a disabled option changes nothing;
      S5 a declared value matching no option renders no selection and
      the placeholder; S20 pointerdown outside the open popup closes it
      with the selection unchanged and no events; S25 removing the
      selected ki-option from the DOM falls back to the placeholder,
      `value` reads `""`, and NO change event is observed; programmatic
      `select.value = 'pt'` updates the display silently; committing the
      already-selected option closes without events (native parity,
      research D6). Verify failing.
- [ ] T012 [P] [US1] Write the assistive-tech section of the browser
      suite: S11 the accessibility tree exposes a COLLAPSED combobox
      named "Country" (native label association) whose VALUE is the
      selected option's label (trigger contents — research D2); S12 with
      the popup open it exposes an EXPANDED combobox and a listbox in
      which the selected option is marked selected (aria-selected on the
      mirror row) and disabled options unavailable; axe zero violations
      across closed × open × disabled states under the default theme
      (required-invalid joins the matrix in US3). Also: data-element
      browser assertions (the ki-option host paints nothing standalone)
      go in `packages/elements/browser-tests/ki-option.browser.spec.ts`
      (marker + header note deferring every S-ID to the select suite —
      research D9); the option-ROW assertions (≥ 24×24 px target,
      `part="option"` exposed) live in the select suite because the rows
      are select-shadow elements (research D1). Verify failing.

### GREEN: implementation

- [ ] T013 [US1] Implement `ki-option` per research D1 in
      `packages/elements/src/components/ki-option/ki-option.tsx` +
      `ki-option.css`: reflected props `value` (label-text fallback via
      the pure `optionValue` helper) and `disabled`
      (presence-normalized); `:host { display: none }` — the element is
      data, it never renders (`<slot/>` kept in a hidden shadow purely
      so child content is inspectable). NO selected member, NO FACE, NO
      parts.
- [ ] T014 [US1] Implement the select's core per research D1–D6 in
      `packages/elements/src/components/ki-select/ki-select.tsx` +
      `ki-select.css` + the pure modules: anatomy per D2 (label
      `for`/`id` → trigger button `role="combobox"` +
      `aria-expanded`/`aria-controls`, value span, `aria-hidden`
      indicator, shadow `role="listbox"` with `part="option"` mirror
      rows carrying ids/`aria-selected`/`aria-disabled`, hidden data
      slot, hidden validity-donor select); roster from `slotchange` +
      roster-scoped MutationObserver (`value`/`disabled` attributes +
      label subtree — mirror fidelity is correctness, research D3);
      identity-tracked `selectedOption` with the `value` projection
      (initial resolution from the attribute, first-match programmatic
      assignment, dangling-value fallback to placeholder — all silent,
      research D6); pointer state machine rows of D5 (trigger click
      toggles; enabled-option click commits + closes; disabled-option
      click no-op; document pointerdown-outside listener attached on
      open, detached on close, `composedPath()` containment; focusout
      closes discarding; disable-while-open closes discarding); the
      COMMIT routine as the only event source — update selection, spans,
      `aria-selected`, `setFormValue`, validity, close, then dispatch
      composed `input` THEN composed `change` from the host (research
      D6). CSS per D4/D8: CSS-only popup anchoring (`inset-block-start:
      calc(100% + offset)`, `min-inline-size: 100%`, `max-block-size` +
      block-axis scroll), tokens-only via the
      `--_ki-select-*`/`--_ki-option-*` indirection — trigger base =
      rest, swapped under `:hover`/`:focus-visible`/`:disabled`; option
      rows swapped under `[aria-selected='true']`, the highlight row,
      `[aria-disabled='true']`, `:hover`; focus ring from
      `--ki-select-focus-ring-*`; `min-block-size` targets ≥ 24 px on
      trigger and rows (FR-016); logical properties only; any motion
      ONLY inside `@media (prefers-reduced-motion: no-preference)`
      (FR-015).
- [ ] T015 [US1] Complete JSDoc on every public member of BOTH elements
      (description, `@default`, when-to-use/when-NOT-to-use per
      contracts/select-contract.md §Agent-facing metadata — the
      select-vs-radio-group-vs-input distinction, the "ki-option only
      inside ki-select" rule, the "ki-option is data: the select renders
      it" note, the "never author selection on an option; set the
      select's value" warning, and the documented v1 positioning
      limitation) — an undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T016 [US1] Per-story gates: axe zero violations (asserted in T012;
      `pnpm --filter @kimen/elements run test-browser` green); add the
      composite-pair entries to the `size-limit` array in
      `packages/elements/package.json` (marginal: paths
      `dist/components/ki-select.js` + `dist/components/ki-option.js`
      ignoring `@stencil/core`, limit 9 KB — SC-005's single-digit
      budget is for the PAIR, expected at the batch's upper end; worst
      case: same paths with runtime, limit 25 KB — mirror the ki-button
      entry style) and run `pnpm --filter @kimen/elements run size`;
      rebuild and commit the regenerated `generated/docs.json` +
      `src/components.d.ts` (Art. I — docs.json is today's machine
      surface). Nota superficies máquina (estándar del batch):
      CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo
      Zod diferido a Fase 3 (decisión founder 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S5, S11, S12,
S20, S25 pass.

---

## Phase 4: User Story 2 — Operate the select with the keyboard alone (Priority: P1)

**Goal**: the full approved APG select-only keyboard contract (research
D5): open on Enter/Space/arrows (and Home/End per FR-007), highlight
landing on the selected/first-enabled option, non-wrapping arrow moves
that skip disabled options, Home/End jumps, Enter/Space commit,
Escape/Tab discard, visible focus throughout — outcome parity with the
pointer path (SC-001/SC-006).

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T017 [US2] Extend the browser suite with the keyboard scenarios
      (real key presses): S6 Tab reaches the select with visible focus
      indication (computed outline/box-shadow on the `trigger` part from
      `--ki-select-focus-ring-*`); S7 Arrow Down on the focused closed
      select opens with the SELECTED option highlighted (assert the
      trigger's `aria-activedescendant` names the selected mirror row —
      the D1 same-scope claim); S23 opening an unselected select from
      the keyboard highlights the FIRST ENABLED option; S8 Enter commits
      the highlighted option and closes (assert Space parity, and one
      composed `input` + one composed `change` per commit); S9 Escape
      closes with the selection unchanged and no events; S10 Home/End
      jump the highlight to the first/last enabled option (Scenario
      Outline: both rows); S21 Tab while open closes DISCARDING the
      uncommitted highlight, the selection unchanged, and focus moves to
      the next tabbable element (spec default reading — if gate 1 flips
      to commit-on-Tab, this test and S21 change BEFORE implementation);
      S22 Arrow Down skips a disabled option and lands on the next
      enabled one; typing a printable character does nothing (no
      typeahead — charter exclusion, asserted as a non-event). Verify
      failing.

### GREEN

- [ ] T018 [US2] Implement the keyboard model per research D5 in
      `ki-select.tsx` + `ki-select.keyboard.ts`: one `keydown` listener
      on the trigger driving the keydown→intent map (closed: Enter/Space
      ride the native button click path — one code path with pointer;
      Arrow Down/Up open with `openHighlight`; Home/End open on
      first/last enabled; open: Arrow Up/Down via `moveHighlight` —
      clamped, no wrap, disabled-skipping; Home/End via
      `firstEnabled`/`lastEnabled`; Enter/Space commit with
      `preventDefault()` to suppress the native button re-toggle;
      Escape closes discarding; Tab closes discarding WITHOUT
      `preventDefault()` so focus proceeds); `aria-activedescendant`
      updated on every highlight move and removed when closed;
      highlighted row kept visible via
      `scrollIntoView({ block: 'nearest' })` with instant behavior
      (FR-015); printable keys, Alt+Arrows and PageUp/PageDown
      deliberately unhandled (Art. II — research D5's recorded
      exclusions).

### Component quality gates (US2)

- [ ] T019 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/005-ki-select`;
      if the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S6–S10, S21–S23 green; the composite passes both P1
stories end to end with pointer/keyboard outcome parity.

---

## Phase 5: User Story 3 — Participate in a form (Priority: P2)

**Goal**: full ElementInternals form participation (research D7):
selected value submits under `name`, nothing when unselected,
platform-localized `valueMissing` via the validity donor while
required-and-empty, invalid exposure only after a blocked submission,
reset to the declared initial selection, fieldset disabling.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T020 [US3] Extend the browser suite with real-`<form>` and
      validity scenarios: S13 submitted FormData contains `country=fr`
      when the option labeled "France" carrying value `fr` is selected;
      S24 with NO selection the submitted data contains no `country`
      entry at all (never an empty string); S14 a required select with
      no selection blocks submission and is reported invalid — assert
      the validation message is non-empty and PLATFORM-sourced (not
      equal to any literal in our source — research D7), that
      `aria-invalid` is ABSENT on first render and appears on the
      trigger only after the blocked attempt, clearing when a selection
      is committed; ALSO assert the FR-009 nuance: a selected option
      carrying `value=""` keeps a required select invalid
      (placeholder-option parity) and submits an EMPTY-valued entry on a
      non-required form; S15 a select loaded with `value="fr"` and
      changed to "Portugal" restores "France" on form reset, silently
      (live-attribute re-resolution, 003 D2); S16 inside
      `<fieldset disabled>` the select never opens, is exposed as
      unavailable and contributes nothing. Verify failing.

### GREEN

- [ ] T021 [US3] Implement form participation per research D7 in
      `ki-select.tsx` + `ki-select.form.ts`: `formAssociated: true`,
      `@AttachInternals()`;
      `internals.setFormValue(selectFormValue(selectedOption))` on every
      selection/value/reconciliation change (pure function: `null` when
      unselected, else the option's value INCLUDING `""`); constraint
      validation — while
      `selectValueMissing(required, submittedValue)` holds, mirror
      `internals.setValidity(donor.validity, donor.validationMessage,
      trigger)` from the permanently empty hidden native select donor
      (platform-computed `valueMissing`, platform-localized message,
      `reportValidity` anchored on the trigger); otherwise
      `setValidity({})`; `aria-required` on the trigger synced from
      `required`; `aria-invalid` set on the host's `invalid` event and
      cleared when valid or on reset (NO custom state, NO invalid
      tokens in v1 — research D7's declared narrowing, 007 precedent);
      `formResetCallback` re-resolving `getAttribute('value') ?? ''`
      first-match, silently; `formDisabledCallback` folding into
      `effectiveDisabled` (trigger disabled, close-if-open, FACE
      exclusion). Keep extractable rules as pure functions with
      exhaustive unit cases in T010's file (mutation-gap compensating
      control, plan.md Art. III).

### Component quality gates (US3)

- [ ] T022 [US3] Full suites green; traceability spot-check; axe re-run
      including the required-invalid state across the matrix (spec
      constitutional surface: closed/open/disabled/required-invalid); if
      the public surface changed, rebuild and re-commit
      `generated/docs.json` (superficies máquina: nota estándar del
      batch — 017 en curso, Zod en Fase 3, decisión founder 2026-07-08).

**Checkpoint**: S13–S16, S24 green; full browser suite green.

---

## Phase 6: User Story 4 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of trigger, popup and option states —
closed AND open — forced dark scheme, RTL value/indicator order.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T023 [US4] Extend the theming coverage following the 001/002/003
      pattern (inject built token stylesheets): S17 declaring
      `data-ki-theme="material3"` restyles the select — assert resolved
      `--ki-select-*` values change across trigger states AND
      `--ki-select-listbox-*`/`--ki-option-*` values change on the OPEN
      popup (SC-003 covers the popup surface explicitly); S19 under
      `dir="rtl"` the displayed value leads and the indicator trails the
      writing direction (compare inline positions of the `value` and
      `indicator` parts) and the popup stays anchored (logical
      properties); S18 forced dark under onmars resolves dark ink
      values, in
      `packages/elements/browser-tests/ki-select.dark.browser.spec.ts`
      with its own `// @spec:005-ki-select` marker (the vitest config
      routes `*.dark.browser.spec.ts` to the dark-emulating instance,
      002 split). Verify failing (tokens exist from Phase 2; failure
      must come from component CSS not consuming them — if earlier
      phases already turn any of these green, record that instead and
      keep the assertions as regression tests).

### GREEN

- [ ] T024 [US4] Close any gap the S17/S18/S19 tests expose in
      `ki-select.css` token consumption (every ink and every listbox/row
      surface through the `--_ki-*` indirection → component tokens,
      logical properties only, motion only under
      `prefers-reduced-motion: no-preference` — FR-015 is an edge-case
      contract with no S-ID: style-level rule, verified manually in
      T027); `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S17–S19 green; stylelint token allowlist green.

---

## Phase 7: User Story 5 — An agent generates a valid select (Priority: P3)

**Goal**: the generated contract answers when-to-use (select vs
radio-group vs input vs switch/checkbox) and the no-typeahead/no-multi
limits; malformed values are safe (S5 already tested in US1).

- [ ] T025 [US5] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      for every member of BOTH tags (when-to-use/when-NOT-to-use with
      the closed-list-of-five-or-more rule and the
      ki-radio-group/ki-input/ki-checkbox/ki-switch redirections, the
      "ki-option only inside ki-select" rule, the ki-option
      label-as-value default, the no-selected-on-options warning, the
      documented positioning limitation), and that `src/components.d.ts`
      exposes both typed surfaces with NO leaked internals (the mirror
      mechanism, roster observers and validity donor must not appear —
      contract §Compatibility). Commit regenerated artifacts (never
      hand-edited, Art. I). Nota superficies máquina: CEM/llms.txt
      llegan con 017-agent-surfaces (en curso); catálogo Zod diferido a
      Fase 3 (decisión founder 2026-07-08) — this task's scope is
      docs.json completeness only.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T026 [P] Write
      `packages/elements/src/components/ki-select/ki-select.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration — registering BOTH tags): `Playground`
      (select props as controls over a three-option composite) plus
      `Placeholder`, `Preselected`, `DisabledSelect`, `DisabledOption`,
      `ManyOptions` (listbox max-block-size scrolling), `Required`
      (form demo showing the blocked submission), `RTL`. No standalone
      ki-option stories (data element, valid only inside a select —
      contract) and no size/tone axes — they do not exist in v1.
- [ ] T027 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      value/indicator order, popup anchoring — S19 automated in T023)
      and the reduced-motion manual check (emulate
      `prefers-reduced-motion: reduce`, open/close and move the
      highlight: states apply instantly, scrolling is instant — FR-015,
      no S-ID, style-level contract). Also verify the documented
      clipping limitation renders honestly (popup inside an
      `overflow: hidden` ancestor — known v1 limitation, research D4,
      not a bug).
- [ ] T028 **Manual APG walkthrough — REQUIRED (spec constitutional
      surface: first popup control and first combobox in the repo = new
      interaction pattern, Art. V; the charter flags select's listbox
      explicitly)**. Against the built Storybook/manual page, with the
      APG select-only combobox pattern in hand, document in the PR: the
      full keyboard script (open on Enter/Space/arrows/Home/End with
      correct highlight landing; non-wrapping arrows skipping disabled;
      Home/End; Enter/Space commit; Escape/Tab discard; outside-click
      dismiss) in LTR AND RTL, the recorded exclusions (no typeahead —
      gate-1 question; no Alt+Arrows/PageUp/PageDown), AND the
      screen-reader outcomes automation cannot pin, with research D10's
      named verification points: (1) **highlight announcements while DOM
      focus stays on the trigger** — the aria-activedescendant
      co-shadow claim of the mirror architecture (research D1), per
      target browser/AT pair; (2) the collapsed announcement — name
      "Country", role combobox, VALUE = the trigger contents (S11);
      (3) expanded + listbox + selected-option announcements (S12);
      (4) disabled select/options announced unavailable; (5) required
      exposure and the invalid announcement with the platform-localized
      message after a blocked submission. If a target pair fails a
      point, implement the recorded contingency (naming-composition
      adjustment, or roving focus into the rows — research D10) with a
      failing browser test first (Art. III).
- [ ] T029 Run `pnpm exec nx run-many -t size` — composite pair marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, existing entries unaffected,
      token stylesheets within caps (Art. IV budget, SC-005).
- [ ] T030 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 —
      the only definition of done (Art. III). Includes constitution,
      traceability (S1–S25 ↔ tests), tokens-sync, contrast (extended
      select/option sweep), lint, styles, typecheck, deadcode (knip sees
      no dead export — both new exports consumed), packaging, budgets,
      mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 ─┐
T004, T005, T006, T007 (P) → T008 ─┤ (tokens + extended sweep before any component CSS)
             ├─ Phase 3 (US1): T009–T012 (P, RED) → T013 → T014 → T015 → T016
             ├─ Phase 4 (US2): T017 (RED) → T018 → T019    (after US1 GREEN — keyboard rides the open/commit pipeline)
             ├─ Phase 5 (US3): T020 (RED) → T021 → T022    (after US1 GREEN; S14's reportValidity focus anchor needs the trigger from T014)
             ├─ Phase 6 (US4): T023 (RED) → T024            (after Phase 2 + T013/T014)
             └─ Phase 8: T026, T027 (P) → T028 → T029 → T030   (last; T025 [US5] after T015 + build)
```

- Single writer on `feat/ki-select`; no parallel worktrees needed.
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
  T021 (pure `ki-select.keyboard.ts` + `ki-select.form.ts` logic —
  `moveHighlight`, `firstEnabled`/`lastEnabled`, `openHighlight`, the
  keydown→intent map, `resolveSelection`, `optionValue`,
  `selectFormValue`, `selectValueMissing`, presence normalizer — with
  exhaustive unit cases per branch). Wiring Stryker is a factory chore
  outside this spec.
- Superficies máquina (estándar del batch): docs.json es la superficie
  máquina que existe hoy y se regenera/commitea en T016/T019/T022/T025;
  CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
  diferido a Fase 3 (decisión founder 2026-07-08).
- Gate-1 open questions ride BEFORE implementation (spec Assumptions):
  typeahead inclusion (would append a scenario + extend T017/T018) and
  commit-vs-discard on Tab (would rewrite S21 + T017's Tab assertion +
  one line of T018's commit routine). The FR-013 `option`-part
  addressing note (plan.md Complexity Tracking) also resolves at gate 1.
- Every S-ID S1–S25 maps to a test task (CI-gated by
  check-traceability.sh):
  - S1, S2, S3, S4, S5, S20, S25 → T011
  - S11, S12 → T012
  - S6, S7, S8, S9, S10, S21, S22, S23 → T017
  - S13, S14, S15, S16, S24 → T020
  - S17, S19 → T023 (S18 → T023, dark split file)
- FR coverage: FR-001 → T009/T010/T011(S1,S2)/T013/T014; FR-002 →
  T009/T010/T012(S11)/T013; FR-003 → T011(S2,S5); FR-004 →
  T010/T011(S5,S25)/T014; FR-005 → T011(S1,S25)/T014; FR-006 →
  T011(S1,S20)/T014; FR-007 → T017(S6–S10,S21–S23)/T018; FR-008 →
  T011(S3,S4)/T017(S22)/T020(S16); FR-009 → T020(S13–S16,S24)/T021;
  FR-010 → T012(S11,S12); FR-011 → T004–T008/T014/T024; FR-012 →
  T014/T024; FR-013 → T010/T012 (+ gate-1 addressing note); FR-014 →
  T023(S19); FR-015 → T014/T024/T027 (edge-case contract, no S-ID);
  FR-016 → T012/T017(S6)/T014; FR-017 → T015/T025.
- Gate extension (Art. X): the contrast sweep MUST cover `--ki-select-*`
  and `--ki-option-*` in the same change that ships the tokens
  (T007/T008, research D8) — an unextended sweep silently ignores the
  component. Batch coordination with 007/008's per-pattern-guard
  mechanism is annotated in T007.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
