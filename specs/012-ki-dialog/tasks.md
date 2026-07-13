# Tasks: ki-dialog

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/012-ki-dialog/`

**Prerequisites**: plan.md, spec.md with S1–S15, research.md (D1–D10),
data-model.md, contracts/dialog-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:012-ki-dialog`; S-IDs appear on code lines (test
titles), never only in comments (check-traceability.sh). DECLARED TESTING
BOUNDARY (research D10): Stencil mock-doc has no `HTMLDialogElement` — no
`showModal()`, no top layer, no `::backdrop`, no inertness — so every
open-state scenario (modality, focus, Escape, backdrop, AT exposure,
theming, motion) is asserted in the REAL-BROWSER suite only; the mock-doc
spec covers closed-state anatomy, wiring and pure helpers.

**Organization**: grouped by the spec's user stories. US1 = confirm a
critical decision without losing it (P1, MVP), US2 = operate with keyboard
and assistive technology (P2), US3 = re-theme without touching markup (P2),
US4 = an agent composes a valid dialog (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-dialog --spec
      012-ki-dialog`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-dialog/{ki-dialog.tsx,ki-dialog.css,ki-dialog.spec.tsx}`
      and `packages/elements/browser-tests/ki-dialog.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer, contrast-gate extension, reduced-motion test command (blocks all component CSS and the S14 RED)

**Purpose**: `--ki-dialog-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research D9), the contrast sweep must cover the
new family in the SAME change or the gate silently ignores it (research D9,
Art. X), and the browser harness must be able to emulate reduced motion
deterministically before the S14 RED test can exist (research D8).
User-story-independent.

- [ ] T003 [P] Author `packages/tokens/tokens/component/dialog.tokens.json`
      (theme-neutral schema, onmars values by inheritance, modeled on
      `button.tokens.json`) — the 18-token family of research D9 /
      data-model.md: structure `radius`, `padding`, `gap`, `min-width`,
      `max-width` (geometry from `ki.radius.*`/`ki.space.*`); color `bg`
      (raised step of the 001 surface ramp — exact step chosen under the
      extended sweep), `fg` (from `ki.text.*`), `border` as a FULL border
      shorthand value (`<width> <style> <color>`, color from
      `ki.outline.*` — composite-value precedent of the 002/009 shadow
      strings; a hardcoded width in CSS would break FR-010), `shadow` (a
      composed box-shadow referencing `ki.elevation.*`); backdrop
      `backdrop-bg` referencing the semantic `ki.overlay.*` family (first
      component consumer — the first themed overlay surface; dark via the
      overlay-inverse entries); heading typography
      `heading-{font-size|font-weight|line-height}` from the semantic
      typography scale; focus ring `focus-ring-{color|width|offset}` (002
      convention); motion `motion-{duration|easing}` = `0ms`/`linear`
      LITERAL values (no motion layer exists in 001 — research D8's
      declared deviation; MarsUI shows no dialog motion).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/dialog.material3.tokens.json`:
      material3 overrides for the same names — M3 surface-container-high
      color role, M3 shape radius, `border: none` (M3 dialogs carry
      elevation, not strokes), M3 elevation-level shadow, M3 scrim value
      for `backdrop-bg`, M3 headline typography, and M3 entrance motion
      values (~200ms + M3 decelerate easing — research D8), mirroring how
      `button.material3.tokens.json` overrides the button layer.
- [ ] T005 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension; today it matches only
      `--ki-button-*` — verified): add the dialog text pair
      `--ki-dialog-fg` over `--ki-dialog-bg` at 4.5:1 (WCAG 1.4.3) and the
      non-text pair `--ki-dialog-focus-ring-color` over `--ki-dialog-bg`
      at 3:1 (WCAG 1.4.11 — the ring is the only focus indicator the
      component draws). Mechanism: per-pair `min` + per-pattern zero-match
      guard — the same design as 008/011 D8; if a sibling landed it first,
      rebase onto its mechanism and add only the dialog patterns. The
      backdrop is NOT swept (no text or control is drawn on the scrim —
      research D9 justification). Add unit cases to
      `packages/tokens/scripts/check-contrast.test.mjs` (pattern matching,
      per-pair minimum, zero-match guard).
- [ ] T006 Wire both token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/dialog.tokens.json` to `LAYERS` and
      `tokens/component/dialog.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` (extended sweep green in
      both themes × schemes) and `pnpm --filter @kimen/tokens size`
      (stylesheets stay ≤ their 9 KB caps), and commit the regenerated
      `dist/css` (tokens-sync gate contract: generated, committed,
      diffable). Any semantic-layer delta the sweep forces gets declared
      for founder sign-off at the merge gate (002 precedent).
- [ ] T007 [P] Add the `emulateReducedMotion` browser command to
      `packages/elements/vitest.browser.config.ts` next to the existing
      `emulateColorScheme` (same `defineBrowserCommand` mechanism:
      `page.emulateMedia({ reducedMotion: 'reduce' | 'no-preference' |
      null })`) — S14's determinism depends on it (research D8; computed
      styles asserted, never animation frames).

**Checkpoint**: `--ki-dialog-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; extended contrast sweep, token budgets
and tokens-sync green; reduced-motion emulation available to the suite.

---

## Phase 3: User Story 1 — Confirm a critical decision without losing it (Priority: P1) 🎯 MVP

**Goal**: the dialog interrupts modally above an inert page; every close
path (footer action wired to `close()`, programmatic, opt-in backdrop)
reports exactly one `ki-close` with the right reason; a stray backdrop
click without the opt-in never destroys the decision.

**Independent Test**: quickstart.md §Manual validation 1 on a page with
only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T008 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-dialog/ki-dialog.spec.tsx`
      (marker `// @spec:012-ki-dialog`; CLOSED-STATE ONLY — research D10):
      S5 a dialog declared with `variant="fullscreen"` (unrecognized
      attribute and value) renders closed with its default appearance (no
      `open`, no observable change); closed-state anatomy — parts
      `dialog`/`heading`/`body`/`footer` present, the internal native
      `<dialog>` NEVER carries its own `open` content attribute (research
      D1), `<h2 part="heading">` + `aria-labelledby` rendered exactly when
      `heading` is non-empty and BOTH absent when it is missing/empty (no
      dangling reference — research D5); exhaustive unit cases for the
      pure helpers — `resolveEntryFocusTarget` in `ki-dialog.focus.ts`
      (slotted autofocus → first focusable → null; non-focusable filtering:
      hidden, disabled, `tabindex="-1"`; research D2) and `isOutsideRect`
      in `ki-dialog.backdrop.ts` (inside/outside/boundary points — a point
      ON the edge is inside; research D4) — the mutation-gap compensating
      control. Run `pnpm --filter @kimen/elements run test` and record the
      failure reason (component renders scaffold placeholder).
- [ ] T009 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-dialog.browser.spec.ts`
      (marker `// @spec:012-ki-dialog`), consuming the BUILT
      `../dist/components/ki-dialog.js` and injecting `@kimen/tokens/css`
      (002/008 pattern): S1 activating a "Delete account" button that
      calls `show()` presents the dialog above the page and the content
      behind is inert — a background button neither receives a real click
      nor accepts `focus()`; S2 a footer "Cancel" action wired to
      `close()` closes the dialog and the page observes `ki-close` with
      `detail.reason === 'method'` (assert `bubbles`, `composed`,
      `cancelable === false`); S3 with no opt-in, a click on the backdrop
      (coordinates outside the dialog rect) leaves the dialog open; S4
      with `close-on-backdrop`, the same click closes it with
      `reason: 'backdrop'` — plus the misfire guard: pointerdown INSIDE
      the dialog followed by release outside does NOT close (research D4);
      S15 programmatic close (`close()` and removing `open`) reports
      exactly one `ki-close` per close on a page that counts events, and
      the no-op guards produce none (`show()` while open, `close()` while
      closed — FR-002); FR-015 body content taller than the viewport
      scrolls inside `part="body"` while the dialog stays within the
      viewport (computed geometry). Verify failing.

### GREEN: implementation

- [ ] T010 [US1] Implement the base per research D1/D4/D6 in
      `packages/elements/src/components/ki-dialog/ki-dialog.tsx` +
      `ki-dialog.backdrop.ts` + `ki-dialog.css`: shadow renders
      `<dialog part="dialog">` holding `<h2 part="heading" id="heading">`
      (conditional, D5), `<div part="body"><slot/></div>` and
      `<div part="footer"><slot name="footer"/></div>` (footer collapses
      via `slotchange` emptiness tracking — 009 D1 pattern, cited);
      reflected props `open` (mutable, default `false`), `heading`,
      `closeOnBackdrop`; `@Watch('open')` + `componentDidLoad` sync the
      internal dialog IDEMPOTENTLY through `showModal()`/`close()` only
      (never the native `open` attribute; no-ops when states already
      match — FR-002); `@Method() show()`/`close()` toggle the prop;
      `cancel` listener (never prevented) sets `pendingReason='escape'`;
      pointerdown-armed backdrop click detection gated on `closeOnBackdrop`
      (target === internal dialog && `isOutsideRect`, research D4) sets
      `'backdrop'` and closes; the single internal `close` listener syncs
      `this.open = false` (guarded), dispatches exactly one
      `new CustomEvent('ki-close', { bubbles: true, composed: true,
      cancelable: false, detail: { reason } })` and resets the reason.
      CSS in `ki-dialog.css`: tokens-only via the `--_ki-dialog-*`
      indirection on `:host` (002 pattern) — surface bg/fg, border
      (shorthand token), shadow, radius, padding, width bounds capped to
      the viewport; column layout with `gap`, footer row aligned to
      `inline-end`; `[part='body']` scrolls on the block axis (FR-015);
      `dialog::backdrop { background: var(--_ki-dialog-backdrop-bg); }`
      (D7 — NOT a part); entrance-only fade via `@starting-style` on
      `dialog[open]` and its `::backdrop` consuming the motion tokens,
      the whole motion block inside
      `@media (prefers-reduced-motion: no-preference)` (D8); logical
      properties only.
- [ ] T011 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/dialog-contract.md §Agent-facing metadata, including the
      dialog-vs-alert/tooltip/long-flow boundaries, "wire footer actions
      to close()", "omit close-on-backdrop rather than set it false" and
      the always-give-a-heading rule) — an undocumented member is a build
      failure (Art. I).

### Component quality gates (US1)

- [ ] T012 [US1] Per-story gates: axe zero violations in open AND closed
      states under the default theme (asserted in the browser suite;
      `pnpm --filter @kimen/elements run test-browser` green); add BOTH
      ki-dialog entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-dialog.js` ignoring `@stencil/core`, limit 9 KB;
      worst case: same path with runtime, limit 25 KB — mirror the
      ki-button entries, which stay) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Machine-surfaces note:
      CEM/llms.txt arrive with 017-agent-surfaces (in progress); the Zod
      catalog is deferred to Fase 3 (founder decision 2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1, S2, S3, S4,
S5, S15 pass.

---

## Phase 4: User Story 2 — Operate the dialog with keyboard and assistive technology (Priority: P2)

**Goal**: focus enters per the FR-005 priority, never leaks to the inert
page, returns to the invoker on every close path (documented body fallback
when the invoker is gone); the dialog is exposed as a named modal dialog
and the page behind leaves the accessibility tree.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T013 [P] [US2] Extend the browser suite with keyboard-path
      scenarios: S6 opening from a keyboard-activated button lands focus
      inside the dialog with visible focus indication — three-way entry
      priority asserted: a slotted `autofocus` action receives focus; with
      no autofocus, the first focusable slotted element does; with NO
      focusable content, the dialog surface itself holds focus with the
      visible ring from `--ki-dialog-focus-ring-*` and Escape still
      closes (Edge Cases; research D2); S7 Tab from the last focusable
      action keeps focus inside the dialog — `document.activeElement`
      (composed) never reaches a page element behind; S8 Escape closes the
      dialog, `ki-close` reports `reason: 'escape'`, and focus returns to
      the "Delete account" invoker (the through-shadow native restore —
      research D3). Verify failing.
- [ ] T014 [P] [US2] Extend the browser suite with assistive-tech-outcome
      scenarios: S9 the open dialog is exposed as a modal `dialog` whose
      accessible name is "Delete account?" (native role/modal state +
      same-root `aria-labelledby` — no hand-written role/aria-modal,
      research D5); S10 a "Settings" link on the page behind is not
      exposed/reachable while the dialog is open (inert subtree leaves the
      accessibility tree; `focus()` refused) and is restored after close;
      focus-return edges (FR-005): opener removed from the document while
      open → close lands focus on the body WITHOUT scrolling; a dialog
      declared `open` in the initial markup receives focus on load and
      closes to the body fallback; a programmatic close while focus is
      OUTSIDE the dialog does not steal focus; axe zero violations on the
      open dialog. Verify failing.

### GREEN

- [ ] T015 [US2] Implement the focus contract per research D2/D3/D5 in
      `ki-dialog.tsx` + `ki-dialog.focus.ts`: after `showModal()`, run the
      entry assist — `resolveEntryFocusTarget(host)` (slotted
      `[autofocus]` → first focusable slotted element in composed order →
      null, letting the native dialog-surface fallback stand) and focus
      the target if it is not already active; NO focus code on close (the
      native previously-focused-element restore is the single mechanism —
      research D3; if the matrix run exposes an engine deviation, the
      contingency enters through the failing test, never speculatively);
      `dialog:focus-visible` ring from `--_ki-dialog-focus-ring-*` in
      `ki-dialog.css`; `aria-labelledby` wiring per D5 (already rendered
      in T010 — close any gap the a11y assertions expose).
- [ ] T016 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/012-ki-dialog`; if
      the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S6, S7, S8, S9, S10 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming proven across surface AND backdrop (the
library's first themed overlay), forced dark scheme, RTL footer
mirroring, and reduced-motion suppression of the theme-defined entrance
transition.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T017 [US3] Extend the theming coverage following the 001/002 pattern
      (inject built token stylesheets): in `ki-dialog.browser.spec.ts`,
      S11 declaring `data-ki-theme="material3"` restyles the open dialog —
      assert resolved `--ki-dialog-{bg|radius}` change AND the computed
      `::backdrop` background resolves the material3 scrim (the D7
      inheritance contract, pinned) with unchanged markup (SC-004); S13
      under `dir="rtl"` with "Cancel" and "Delete" footer actions, action
      order and alignment follow the right-to-left direction
      (bounding-box comparison); S14 under material3 (the shipped theme
      that defines entrance motion — the scenario's Given verbatim) with
      `emulateReducedMotion('reduce')`, opening the dialog shows it
      immediately — computed `transition-duration` is `0s` and opacity is
      1 with no transition declared (research D8; computed styles only,
      never frame timing; material3 assertions that could race the 200ms
      fade await the settled state or run under reduced motion); create
      `packages/elements/browser-tests/ki-dialog.dark.browser.spec.ts`
      (marker `// @spec:012-ki-dialog`, the 002 dark-instance split — the
      vitest config routes `*.dark.browser.spec.ts` to the dark-emulating
      instance): S12 forced dark under onmars resolves the dark token
      values for surface and backdrop, plus axe on the open dialog in
      dark. Verify failing (tokens exist from Phase 2; failure must come
      from component CSS not consuming them — if Phase 3/4 already turn
      any of these green, record that instead and keep the assertions as
      regression tests).

### GREEN

- [ ] T018 [US3] Close any gap the S11/S12/S13/S14 tests expose in
      `ki-dialog.css` token consumption (every visual through
      `--_ki-dialog-*` → `--ki-dialog-*`; no physical properties in the
      footer row; the motion block fully inside the reduced-motion media
      query); `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S11, S12, S13, S14 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent composes a valid dialog (Priority: P3)

**Goal**: the generated contract answers when-to-use (interrupting
decision) and when-NOT-to-use (ki-alert/ki-toast feedback, ki-tooltip
hints, long flows, menus/pickers); malformed markup is safe (S5 already
tested in US1, T008).

- [ ] T019 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use with the dialog-vs-alert/tooltip/
      long-flow boundaries; the heading-always rule; footer actions wired
      to `close()`; autofocus-on-least-destructive guidance; the
      omit-close-on-backdrop robustness note) for every `ki-dialog`
      member, and that `src/components.d.ts` exposes the typed surface
      (the `ki-close` event type with its `reason` union, the async
      `show()`/`close()` methods). Commit regenerated artifacts (never
      hand-edited, Art. I). Machine-surfaces scope note: CEM and llms.txt
      arrive with 017-agent-surfaces (in progress); the Zod catalog is
      Fase 3 (founder decision 2026-07-08) — docs.json + components.d.ts
      are the surfaces this feature regenerates.

**Checkpoint**: S5 covered (T008); generated docs surface committed.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T020 [P] Write
      `packages/elements/src/components/ki-dialog/ki-dialog.stories.tsx`
      following the ki-button stories pattern (tag string component, lazy
      loader registration): `Playground` (every prop as a control, open
      toggle, `ki-close` logging action with its reason), `Confirmation`
      (heading + body + Cancel/Delete footer, `autofocus` on Cancel — the
      APG least-destructive guidance), `BackdropOptIn`
      (`close-on-backdrop` demo), `ScrollingBody` (FR-015), `RTL`
      (`dir="rtl"` confirmation). No axis for size/variant/tone — they do
      not exist on ki-dialog.
- [ ] T021 [P] MANDATORY manual APG Dialog (Modal) walkthrough documented
      in the PR (spec Constitutional Surface, Art. V — first dialog-type
      interaction pattern in the repo; the batch charter flags dialog;
      quickstart.md §Manual validation 5): focus entry for all three
      FR-005 priorities; containment under Tab AND Shift+Tab in both
      directions; Escape from every focus position; focus return on every
      close path (footer action, Escape, backdrop opt-in, programmatic;
      including the removed-invoker body fallback); backdrop behavior with
      and without the opt-in; role, name and modal state announced by a
      real screen reader on open; background unreachability via the SR
      virtual cursor. RTL render check rides S13 (automated in T017) plus
      a Storybook spot-check.
- [ ] T022 Run `pnpm exec nx run-many -t size` — ki-dialog marginal ≤ 9 KB
      gzipped, worst case ≤ 25 KB, ki-button entries unaffected, token
      stylesheets within caps (Art. IV budget, SC-006).
- [ ] T023 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes constitution,
      traceability (S1–S15 ↔ tests), scenario families (form N/A justified
      in the spec table), tokens-sync, contrast (extended sweep), lint,
      styles, typecheck, deadcode (knip sees no dead export), packaging,
      budgets, mock-doc and real-browser suites. Pre-release: run the
      engine matrix (`KIMEN_BROWSER_MATRIX=1`) — it pins the
      through-shadow focus restore (D3), `::backdrop` token inheritance
      (D7) and `@starting-style` (D8) across all three engines.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004, T005, T007 (P) → T006 ─┤ (tokens + sweep + reduced-motion command before component CSS / S14 RED)
             ├─ Phase 3 (US1): T008, T009 (P, RED) → T010 → T011 → T012
             ├─ Phase 4 (US2): T013, T014 (P, RED) → T015 → T016   (after US1 GREEN)
             ├─ Phase 5 (US3): T017 (RED) → T018                    (after Phase 2 + T010)
             ├─ Phase 6 (US4): T019                                  (after T011 + build)
             └─ Phase 7: T020, T021 (P) → T022 → T023               (last)
```

- Single writer on `feat/ki-dialog`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 ∥ T005 ∥ T007 (different files);
  T008 ∥ T009 (different files); T013 ∥ T014 (sections of the browser
  suite written independently, merged before running); T020 ∥ T021.
  Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T008/T009 before T010; T013/T014
  before T015; T017 before T018. Each RED task records the failure reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Machine surfaces: CEM and llms.txt arrive with 017-agent-surfaces (in
  progress); the Zod catalog is Fase 3 (founder decision 2026-07-08).
  This feature regenerates and commits `generated/docs.json` +
  `src/components.d.ts` only (T012, T019).
- mock-doc boundary (research D10): no `HTMLDialogElement` in mock-doc —
  `showModal()`/top layer/`::backdrop`/inertness do not exist there. The
  mock-doc spec (T008) covers closed-state anatomy, heading/labelledby
  wiring, S5 and the pure helpers ONLY; S1–S4, S6–S15 and every open-state
  edge live in the real-browser suite by design. No test may call
  `show()` in mock-doc.
- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control lives in T008 (exhaustive
  unit cases for the pure helpers `resolveEntryFocusTarget` and
  `isOutsideRect` — the component's only extractable logic; everything
  else is platform behavior). Wiring Stryker is a factory chore outside
  this spec.
- Form-participation family: N/A for ki-dialog — not a form control;
  forms compose inside its slots with native behavior untouched, justified
  in spec.md's Scenario Family Coverage table; no ElementInternals test
  task exists on purpose.
- Focus-restore boundary (research D3): the component ships NO invoker
  tracking — the native previously-focused-element restore is the single
  mechanism, pinned through the shadow boundary by T013 (S8) and the T014
  edges, across engines by the T023 matrix run. If an engine deviates, the
  contingency (composed-activeElement snapshot) enters through that
  failing test, never speculatively.
- Every S-ID S1–S15 maps to a test task (CI-gated by
  check-traceability.sh):
  - S5 → T008
  - S1, S2, S3, S4, S15 → T009
  - S6, S7, S8 → T013
  - S9, S10 → T014
  - S11, S13, S14 → T017 (S12 → T017, dark split file)
- FR coverage: FR-001 → T009(S15)/T010; FR-002 → T009/T010;
  FR-003 → T009(S2,S4,S15)/T013(S8)/T010; FR-004 → T009(S1)/T014(S10);
  FR-005 → T013(S6,S8)/T014(edges)/T010/T015; FR-006 → T013(S8)/T010;
  FR-007 → T009(S3,S4)/T010; FR-008 → T008/T014(S9)/T010(D5);
  FR-009 → T009(S2)/T010/T011; FR-010 → T003–T006/T010/T018;
  FR-011 → T017(S14)/T010(D8); FR-012 → T008(S5)/T011;
  FR-013 → T008(anatomy)/T010; FR-014 → T017(S13)/T010;
  FR-015 → T009/T010; FR-016 → T011/T019.
- Gate extension (Art. X): the contrast sweep MUST cover `--ki-dialog-*`
  in the same change that ships the tokens (T005/T006, research D9) — an
  unextended sweep silently ignores the component. Coordinate with the
  008/011 per-pair-minimum mechanism: whichever feature merges first lands
  it; the others rebase and add only their patterns.
- Motion tokens are the repo's FIRST motion values and carry literal
  component-layer values (research D8: no motion layer exists in 001; no
  semantic delta ships). Extraction point recorded: when a second
  motion-bearing component lands (ki-tooltip/ki-tabs in this batch), the
  semantic `ki.motion.*` family is created and both reference it.
- Manual APG walkthrough is MANDATORY for this feature (T021) — the first
  of the four charter-flagged patterns (dialog/tooltip/tabs/select).
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
