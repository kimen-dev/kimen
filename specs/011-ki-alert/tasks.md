# Tasks: ki-alert

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/011-ki-alert/`

**Prerequisites**: plan.md, spec.md with S1–S19 (gate-1 approval pending —
the pre-implement gate blocks execution until the `.approved` marker
exists), research.md (D1–D10), data-model.md, contracts/alert-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:011-ki-alert`; S-IDs appear on code lines (test
titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = understand a
persistent status message (P1, MVP), US2 = dismiss an acknowledged message
(P2), US3 = re-theme without touching markup (P2), US4 = an agent picks the
right messaging component (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-alert --spec
      011-ki-alert`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-alert/{ki-alert.tsx,ki-alert.css,ki-alert.spec.tsx}`
      and `packages/elements/browser-tests/ki-alert.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension (blocks all component CSS)

**Purpose**: `--ki-alert-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D7), and the contrast sweep must
cover the new five-tone family in the SAME change or the gate silently
ignores it (research.md D8, Art. X; user-story-independent).

- [ ] T003 [P] Author `packages/tokens/tokens/component/alert.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure tokens (single scale, NO
      size/variant axis — `padding-inline`, `padding-block`, `gap`,
      `radius`, `border-width`, `font-size`, `line-height`,
      `heading-font-size`, `heading-font-weight`, `dismiss-size`,
      `dismiss-icon-size`, with `dismiss-size` ≥ 24 px per Art. V;
      geometry referencing `ki.space.*`/`ki.radius.*`, typography
      referencing `ki.font.*`); tone color matrix
      `--ki-alert-{neutral|success|danger|info|warning}-{bg|fg|border}`
      (5 × 3 = 15 — backgrounds from `ki.surface.{tone}-base-em`, inks
      from `ki.text.{tone}-high-em`, borders from `ki.outline.{tone}-*`,
      neutral column from the neutral families; exact ramp steps chosen
      under the extended sweep — first component consumption of the 001
      info/warning ramps); dismiss state inks
      `--ki-alert-dismiss-{rest|hover|active}-fg` (one family across
      tones, research D7); focus ring
      `--ki-alert-focus-ring-{color|width|offset}`. Every value a
      reference into the 001 semantic layer — 32 tokens (data-model.md).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/alert.material3.tokens.json`:
      material3 overrides for the same token names, styled from M3
      container/on-container color roles (error-container ramp for
      danger; the documented loose mapping — M3 ships no alert) plus M3
      shape radius, mirroring how `button.material3.tokens.json`
      overrides the button layer. Note: material3's semantic info/warning
      ramps inherit base values through the 001 cascade (research D7
      finding) — override at the component layer only where the sweep or
      the M3 mapping demands it.
- [ ] T005 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): add the alert text
      pattern `^--ki-alert-(?:neutral|success|danger|info|warning)-bg$`
      pairing each `…-fg` over its `…-bg` at 4.5:1 (WCAG 1.4.3), and the
      non-text cross-pairs — each
      `--ki-alert-dismiss-{rest|hover|active}-fg` over EACH of the five
      tone `…-bg` values at 3:1 (WCAG 1.4.11; the dismiss glyph is a
      non-text control indicator). Mechanism: per-pair `min` + per-pattern
      zero-match guard — the same design as 008 D8; if 008 landed first,
      rebase onto its mechanism and add only the alert patterns. Add unit
      cases to `packages/tokens/scripts/check-contrast.test.mjs` (pattern
      matching, dismiss-over-tone cross-pairing, per-pair minimum,
      zero-match guard) — research.md D8.
- [ ] T006 Wire both token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/alert.tokens.json` to `LAYERS` and
      `tokens/component/alert.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` (extended sweep green:
      all five tones × theme × scheme, including material3's inherited
      info/warning cells) and `pnpm --filter @kimen/tokens size`
      (stylesheets stay ≤ their 9 KB caps), and commit the regenerated
      `dist/css` (tokens-sync gate contract: generated, committed,
      diffable). Any semantic-layer delta the sweep forces gets declared
      for founder sign-off at the merge gate (002 precedent; the spec's
      token surface anticipates this for the warning-in-light cells).

**Checkpoint**: `--ki-alert-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; extended contrast sweep, token budgets
and tokens-sync green.

---

## Phase 3: User Story 1 — Understand a persistent status message (Priority: P1) 🎯 MVP

**Goal**: the message is perceivable per tone — visually from tokens and
via assistive technology with the tone-matched urgency (assertive for
danger/warning, polite for the rest), announced on dynamic appearance
without moving focus; unknown tones degrade to neutral.

**Independent Test**: quickstart.md §Manual validation 1 and 2 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-alert/ki-alert.spec.tsx`
      (marker `// @spec:011-ki-alert`): S2 an alert with
      `heading="Update available"` renders the heading as
      `<strong part="heading">` BEFORE the message, exposed as emphasized
      text and never as a document heading; `heading=""` and absent
      heading render no heading element at all; S5 an alert with
      `tone="banana"` renders with the neutral matrix and its live
      wrapper computes `role="status"`; anatomy assertions (parts
      `alert`/`heading`/`message`/`dismiss` only — the live wrapper
      carries NO part; the live wrapper contains exactly the heading and
      the message slot; no dismiss button rendered by default; dismissed
      host renders an empty shadow tree); exhaustive unit cases for the
      pure helpers — `liveExposureForTone` in `ki-alert.tone.ts` (danger
      and warning → `alert`; neutral, success, info, unknown, absent →
      `status`; research D5) and `resolveDismissFocusTarget` in
      `ki-alert.focus.ts` (next-after-host, previous-when-none-follows,
      body-as-last-resort, no-op when focus is outside the alert;
      research D4) — the mutation-gap compensating control. Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T008 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-alert.browser.spec.ts`
      (marker `// @spec:011-ki-alert`), consuming the BUILT
      `../dist/components/ki-alert.js` and injecting `@kimen/tokens/css`
      (002/008 pattern): S1 an alert with `tone="danger"` and the message
      "We could not save your changes" renders the message visibly with
      the danger tone appearance (resolved `--ki-alert-danger-{bg|fg}`
      inks on the `alert` part); the five-tone row resolves five distinct
      background values; S2 the heading renders before the message in the
      flow (bounding-box order). Verify failing.
- [ ] T009 [P] [US1] Write the assistive-tech section of the browser
      suite — the RED that covers the OBSERVABLE live exposure in the
      accessibility tree (the announcements themselves are T022's manual
      pass): S9 dynamically appending a danger alert exposes a live
      wrapper with `role="alert"` (assertive semantics) scoping exactly
      the heading and message, and `document.activeElement` is unchanged;
      S17 a dynamically appearing warning alert exposes `role="alert"`
      with focus unchanged; S10 a dynamically appearing success alert
      exposes `role="status"` (polite semantics) with focus unchanged;
      S18 info and neutral alerts expose `role="status"`; an alert
      present since initial load is exposed in the tree with its role;
      an empty alert exposes an empty live region (no phantom content);
      axe zero violations across the five tones under the default theme.
      Verify failing.

### GREEN: implementation

- [ ] T010 [US1] Implement anatomy and live exposure per research
      D1/D5/D6 in
      `packages/elements/src/components/ki-alert/ki-alert.tsx` +
      `ki-alert.tone.ts`: `<div part="alert">` containing the inner live
      wrapper `<div class="live" role={liveExposureForTone(tone)}>` (NO
      part, NO explicit aria-live/aria-atomic — implicit role semantics
      only, double-announcement avoidance) which holds
      `<strong part="heading">` (only when `heading` is non-empty) and
      `<div part="message"><slot/></div>`; reflected props `tone`
      (default `neutral`), `heading`, `dismissible`, `dismissLabel`
      (default `"Dismiss"`), `dismissed` (mutable); no tabindex, no
      delegatesFocus, no focus code on appearance. CSS in `ki-alert.css`:
      tokens-only via the `--_ki-alert-*` indirection on `:host` (002
      pattern) — base = neutral matrix, overridden under
      `:host([tone='success'])`, `:host([tone='danger'])`,
      `:host([tone='info'])`, `:host([tone='warning'])` (unknown tones
      fall back by construction, S5/FR-007);
      `:host([dismissed]) { display: none; }`; logical properties only;
      NO transition/animation declarations (v1 ships no motion, FR-011 by
      construction).
- [ ] T011 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/alert-contract.md §Agent-facing metadata, including the
      alert-vs-toast/badge/dialog boundaries and the dynamic-insertion
      announcement note) — an undocumented member is a build failure
      (Art. I).

### Component quality gates (US1)

- [ ] T012 [US1] Per-story gates: axe zero violations across the tone
      matrix (asserted in T009; `pnpm --filter @kimen/elements run
      test-browser` green); add BOTH ki-alert entries to the `size-limit`
      array in `packages/elements/package.json` (marginal:
      `dist/components/ki-alert.js` ignoring `@stencil/core`, limit 9 KB;
      worst case: same path with runtime, limit 25 KB — mirror the
      ki-button entries, which stay) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Machine-surfaces note:
      CEM/llms.txt arrive with 017-agent-surfaces (in progress); the Zod
      catalog is deferred to Fase 3 (founder decision 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1, S2, S5, S9,
S10, S17, S18 pass.

---

## Phase 4: User Story 2 — Dismiss an acknowledged message (Priority: P2)

**Goal**: opt-in dismissal with full input-modality parity: one dismiss
control, exactly one `ki-dismiss` per dismissal, self-hiding via the
reflected `dismissed` attribute, focus handed to the next focusable
element, overridable accessible name, re-show by clearing the state.

**Independent Test**: quickstart.md §Manual validation 3 and 4.

### RED

- [ ] T013 [P] [US2] Extend the browser suite with dismissal-lifecycle
      scenarios: S3 activating the dismiss control of a dismissible alert
      hides it (host reflects `dismissed`, leaves layout and the
      accessibility tree) and the page observes exactly ONE `ki-dismiss`
      — assert `bubbles`, `composed`, `cancelable === false`,
      `detail === null`, and that `preventDefault()` changes nothing; a
      programmatic `el.dismissed = true` fires NO event; S4 a
      non-dismissible alert renders no dismiss control; S19 removing the
      `dismissed` attribute displays the alert again with its message and
      re-inserts a populated live wrapper (dynamic re-appearance,
      research D2). Verify failing.
- [ ] T014 [P] [US2] Extend the browser suite with keyboard-path
      scenarios: S6 on a page whose first interactive element is a
      dismissible alert, Tab focuses the dismiss control and its focus
      indication is visible (computed outline/box-shadow under
      `:focus-visible` from `--ki-alert-focus-ring-*`); S7 keyboard
      activation (Enter and Space — native button) dismisses with exactly
      one `ki-dismiss`; S8 a non-dismissible alert before a "Save" button
      adds no tab stop — Tab lands on Save; S16 keyboard dismissal hands
      focus to the following "Save" button and focus is never left inside
      the dismissed alert (FR-013); ≥ 24×24 px dismiss target asserted
      from the rendered box (Art. V). Verify failing.
- [ ] T015 [P] [US2] Extend the browser suite with dismiss-name
      scenarios: S11 the accessibility tree exposes a button whose
      accessible name is "Dismiss" (default `dismiss-label`); S12 with
      `dismiss-label="Descartar"` the accessible name is "Descartar";
      the glyph SVG is `aria-hidden` and contributes nothing to the name;
      axe zero violations on the dismissible variants. Verify failing.

### GREEN

- [ ] T016 [US2] Implement dismissal per research D2/D3/D4 in
      `ki-alert.tsx` + `ki-alert.focus.ts` + `ki-alert.css`: when
      `dismissible`, render one native
      `<button type="button" part="dismiss" aria-label={dismissLabel}>`
      AFTER (outside) the live wrapper, containing an inline SVG cross
      glyph (`aria-hidden="true"`, `fill="currentColor"`, sized by
      `--ki-alert-dismiss-icon-size`); activation handler: resolve the
      handoff target via `resolveDismissFocusTarget` ONLY when focus is
      inside the alert, set `dismissed = true` (conditional render drops
      the whole `part="alert"` subtree; `:host([dismissed])` display:none
      belt), move focus to the resolved target (next → previous → body,
      FR-013), then dispatch exactly one
      `new CustomEvent('ki-dismiss', { bubbles: true, composed: true,
      cancelable: false, detail: null })`; programmatic `dismissed`
      changes dispatch nothing. CSS: dismiss inks via
      `--_ki-alert-dismiss-fg` ← `--ki-alert-dismiss-{rest|hover|active}-fg`;
      focus ring from `--ki-alert-focus-ring-*` under
      `[part='dismiss']:focus-visible`; `min-inline-size`/`min-block-size`
      from `--ki-alert-dismiss-size` (≥ 24 px); logical properties only.
- [ ] T017 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/011-ki-alert`; if
      the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S3, S4, S6, S7, S8, S11, S12, S16, S19 green; full browser
suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming proven across all five tones (the first
component whose Material 3 styling has no reference component — the token
contract carries the full weight), forced dark scheme, and RTL mirroring
of the message/dismiss order.

**Independent Test**: quickstart.md §Manual validation 5.

### RED

- [ ] T018 [US3] Extend the theming coverage following the 001/002
      pattern (inject built token stylesheets): in
      `ki-alert.browser.spec.ts`, S13 declaring
      `data-ki-theme="material3"` restyles the alert — assert resolved
      `--ki-alert-{tone}-bg` values change for ALL FIVE tones with
      unchanged markup (SC-004); S15 under `dir="rtl"` with a dismissible
      alert, the message leads and the dismiss control trails the writing
      direction (bounding-box comparison); create
      `packages/elements/browser-tests/ki-alert.dark.browser.spec.ts`
      (marker `// @spec:011-ki-alert`, the 002 dark-instance split —
      the vitest config routes `*.dark.browser.spec.ts` to the
      dark-emulating instance): S14 forced dark under onmars resolves the
      dark token values across the tone matrix, plus axe in dark. Verify
      failing (tokens exist from Phase 2; failure must come from
      component CSS not consuming them — if Phase 3/4 already turn any of
      these green, record that instead and keep the assertions as
      regression tests).

### GREEN

- [ ] T019 [US3] Close any gap the S13/S14/S15 tests expose in
      `ki-alert.css` token consumption (every ink through
      `--_ki-alert-*` → `--ki-alert-*`, logical properties only, no
      physical left/right in the message/dismiss layout);
      `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S13, S14, S15 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent picks the right messaging component (Priority: P3)

**Goal**: the generated contract answers when-to-use (persistent inline
message) and when-NOT-to-use (ki-toast transient, ki-badge descriptor,
ki-dialog blocking decision, field-level validation); malformed tones are
safe (S5 already tested in US1, T007).

- [ ] T020 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use with the alert-vs-toast/badge/dialog
      boundaries, defaults including `dismiss-label="Dismiss"`, the
      unknown-tone-renders-neutral robustness note, the dynamic-insertion
      announcement note) for every `ki-alert` member, and that
      `src/components.d.ts` exposes the typed surface (`KiAlertTone`
      union, the `ki-dismiss` event type). Commit regenerated artifacts
      (never hand-edited, Art. I). Machine-surfaces scope note: CEM and
      llms.txt arrive with 017-agent-surfaces (in progress); the Zod
      catalog is Fase 3 (founder decision 2026-07-08) — docs.json +
      components.d.ts are the surfaces this feature regenerates.

**Checkpoint**: S5 covered (T007); generated docs surface committed.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T021 [P] Write
      `packages/elements/src/components/ki-alert/ki-alert.stories.tsx`
      following the ki-button stories pattern (tag string component, lazy
      loader registration): `Playground` (every prop as a control),
      `Tones` (the five-tone matrix, with and without heading),
      `Dismissible` (dismiss control + `ki-dismiss` logging action, plus
      a re-show toggle demonstrating S19), `RTL` (`dir="rtl"` dismissible
      alert). No axis for size/variant — they do not exist on ki-alert.
- [ ] T022 [P] Manual screen-reader verification documented in the PR
      (spec Constitutional Surface, Art. V — the part no automated audit
      observes; quickstart.md §Manual validation 7): dynamically
      appearing danger/warning alerts announce immediately,
      success/info/neutral politely; each announcement contains ONLY the
      heading and message (never the dismiss control's name); a re-shown
      alert re-announces; an empty alert announces nothing; no focus
      moves on appearance. Manual APG walkthrough: N/A — the dismiss
      control reuses the 002 button pattern; the batch charter flags
      dialog/tooltip/tabs/select only (plan.md Art. V). RTL render check
      rides S15 (automated in T018) plus a Storybook spot-check.
- [ ] T023 Run `pnpm exec nx run-many -t size` — ki-alert marginal ≤ 9 KB
      gzipped, worst case ≤ 25 KB, ki-button entries unaffected, token
      stylesheets within caps (Art. IV budget, SC-006).
- [ ] T024 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 —
      the only definition of done (Art. III). Includes constitution,
      traceability (S1–S19 ↔ tests), scenario families (form N/A
      justified in the spec table), tokens-sync, contrast (extended
      sweep), lint, styles, typecheck, deadcode (knip sees no dead
      export), packaging, budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004, T005 (P) → T006 ─┤ (tokens + extended sweep before any component CSS)
             ├─ Phase 3 (US1): T007–T009 (P, RED) → T010 → T011 → T012
             ├─ Phase 4 (US2): T013–T015 (P, RED) → T016 → T017   (after US1 GREEN)
             ├─ Phase 5 (US3): T018 (RED) → T019                   (after Phase 2 + T010)
             ├─ Phase 6 (US4): T020                                 (after T011 + build)
             └─ Phase 7: T021, T022 (P) → T023 → T024              (last)
```

- Single writer on `feat/ki-alert`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 ∥ T005 (different files); T007 ∥
  T008 ∥ T009 (different files/sections written independently, merged
  into the test files before running); T013 ∥ T014 ∥ T015 (sections of
  the browser suite); T021 ∥ T022. Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T007–T009 before T010; T013–T015
  before T016; T018 before T019. Each RED task records the failure
  reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Machine surfaces: CEM and llms.txt arrive with 017-agent-surfaces (in
  progress); the Zod catalog is Fase 3 (founder decision 2026-07-08).
  This feature regenerates and commits `generated/docs.json` +
  `src/components.d.ts` only (T012, T020).
- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control lives in T007 (exhaustive
  unit cases for the pure helpers `liveExposureForTone` and
  `resolveDismissFocusTarget` — the component's only extractable logic).
  Wiring Stryker is a factory chore outside this spec.
- Form-participation family: N/A for ki-alert — feedback message, not a
  form control, justified in spec.md's Scenario Family Coverage table; no
  ElementInternals test task exists on purpose.
- Live-region testing boundary: the RED assistive-tech tasks (T009, T013,
  T015) assert the OBSERVABLE exposure — computed role, live-region
  containment, `document.activeElement` stability, accessible names —
  in the accessibility tree; the spoken announcements are constitutionally
  covered by T022's documented manual screen-reader pass (spec Art. V
  surface; no automated audit can hear them).
- Every S-ID S1–S19 maps to a test task (CI-gated by
  check-traceability.sh):
  - S2, S5 → T007 (S2 also exercised in T008)
  - S1 → T008
  - S9, S10, S17, S18 → T009
  - S3, S4, S19 → T013
  - S6, S7, S8, S16 → T014
  - S11, S12 → T015
  - S13, S15 → T018 (S14 → T018, dark split file)
- FR coverage: FR-001 → T007(S5)/T008(S1)/T010; FR-002 → T007(S2)/T008/T010;
  FR-003 → T013(S3,S4,S19)/T016; FR-004 → T015(S11,S12)/T016;
  FR-005 → T009(S9,S10,S17,S18)/T010; FR-006 → T014(S6,S8)/T016;
  FR-007 → T007(S5)/T010; FR-008 → T003–T006/T010/T019;
  FR-009 → T007/T010/T016; FR-010 → T010/T018(S15)/T019;
  FR-011 → T010 (no motion declared — by construction);
  FR-012 → T011/T020; FR-013 → T007/T014(S16)/T016.
- Gate extension (Art. X): the contrast sweep MUST cover `--ki-alert-*`
  in the same change that ships the tokens (T005/T006, research D8) — an
  unextended sweep silently ignores the component. Coordinate with 008's
  identical per-pair-minimum mechanism: whichever feature merges first
  lands it; the other rebases and adds only its pattern.
- Urgency mapping is the gate-1 flag (spec Assumptions): if the founder
  flips `warning` to polite, S17 is amended before approval and the
  change lands in ONE line of `liveExposureForTone` (+ T009's warning
  assertion) — no other artifact drifts.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
