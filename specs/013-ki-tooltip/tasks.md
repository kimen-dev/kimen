# Tasks: ki-tooltip

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/013-ki-tooltip/`

**Prerequisites**: plan.md, spec.md with S1–S17, research.md (D1–D10),
data-model.md, contracts/tooltip-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries the
file-level marker `// @spec:013-ki-tooltip`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh). Hover and
focus are exercised with REAL pointer and keyboard input in a real browser;
the show/hide delays are deterministic (token-pinned fixtures + fake
timers, research D9 — no real-time sleeps).

**Organization**: grouped by the spec's user stories. US1 = get a hint
about a control (P1, MVP), US2 = equal access without a pointer (P1),
US3 = re-theme without touching markup (P2), US4 = an agent uses tooltips
correctly (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-tooltip --spec
      013-ki-tooltip`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-tooltip/{ki-tooltip.tsx,ki-tooltip.css,ki-tooltip.spec.tsx}`
      and `packages/elements/browser-tests/ki-tooltip.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension (blocks all component CSS)

**Purpose**: `--ki-tooltip-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D8), and the contrast sweep must
cover the new pair in the SAME change or the gate silently ignores it
(Art. X; user-story-independent).

- [ ] T003 [P] Author `packages/tokens/tokens/component/tooltip.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure (`radius`, `padding-inline`,
      `padding-block`, `max-inline-size`, `offset` — geometry referencing
      `ki.space.*`/`ki.radius.*`/`ki.corner.*`); the inverse color pair
      `--ki-tooltip-{bg|fg}` referencing the 001 inverse ramp
      (`ki.surface.inverse-*`, `ki.text.high-em-inverse` — first component
      consumer; exact refs chosen under the extended sweep, research D8);
      typography (`font-size`, `font-weight`, `line-height` from
      `ki.font.*`); `shadow` from `ki.elevation.*`; and the two DTCG
      duration tokens `--ki-tooltip-{show-delay|hide-delay}` (literal ms
      values — no motion layer exists in 001; family addition declared in
      plan.md Art. VI for gate-1 sign-off). 13 tokens (data-model.md).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/tooltip.material3.tokens.json`:
      material3 overrides for the same token names, styled from the M3
      plain-tooltip roles (inverse-surface container, inverse-on-surface
      label, extra-small corner), mirroring how
      `button.material3.tokens.json` overrides the button layer.
- [ ] T005 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): pair `--ki-tooltip-fg`
      over `--ki-tooltip-bg` at 4.5:1 (the label is TEXT, WCAG 1.4.3) with
      a per-pattern zero-match guard; add unit cases to
      `packages/tokens/scripts/check-contrast.test.mjs`. Mechanism note:
      if a sibling (008/011) already landed the per-pair-minimum refactor,
      rebase onto it and add only the tooltip pair; otherwise the single
      4.5 pair rides the existing `MIN_RATIO` unchanged (research D8).
- [ ] T006 Wire both token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/tooltip.tokens.json` to `LAYERS` and
      `tokens/component/tooltip.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      run `pnpm --filter @kimen/tokens contrast` (extended sweep green in
      every theme × scheme) and `pnpm --filter @kimen/tokens size`
      (stylesheets stay ≤ their 9 KB caps), and commit the regenerated
      `dist/css` (tokens-sync gate contract: generated, committed,
      diffable).

**Checkpoint**: `--ki-tooltip-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; extended contrast sweep, token budgets
and tokens-sync green.

---

## Phase 3: User Story 1 — Get a hint about a control (Priority: P1) 🎯 MVP

**Goal**: hover reveals the label after the tokenized hover-intent delay;
leaving trigger AND tooltip hides it (the pointer may rest on the tooltip —
WCAG 1.4.13 hoverable via the tokenized linger delay); Escape dismisses
without side effects; blank labels never show; the tooltip stays inside the
viewport (flip) and unknown placements fall back to top.

**Independent Test**: quickstart.md §Manual validation 1, 2 (Escape part)
and 4 on a page with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-tooltip/ki-tooltip.spec.tsx`
      (marker `// @spec:013-ki-tooltip`): anatomy — default slot + ONE
      conditional bubble `part="tooltip"` with `role="tooltip"` containing
      the label text, kept `visibility: hidden` while closed; S13 markup
      half — blank/whitespace `label` renders NO bubble at all; no
      `tabindex` anywhere in the shadow tree (FR-006); exhaustive unit
      cases for the pure helpers — `normalizePlacement` in
      `ki-tooltip.position.ts` (`top`/`bottom`/`start`/`end` pass through;
      unknown, empty, absent → `top` — S3's tested branch),
      `resolveTooltipPosition` (placement × dir × fits/overflows matrix:
      flip at each viewport edge (S14 case), cross-axis clamp (SC-005),
      `start`/`end` mapping under LTR and RTL (S11 mapping)), and
      `parseDelay` in `ki-tooltip.delay.ts` (`"150ms"`, `"0.15s"`, blank,
      garbage → 0) — the mutation-gap compensating control (research D9).
      Run `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T008 [P] [US1] Write the pointer-path section of the browser suite
      `packages/elements/browser-tests/ki-tooltip.browser.spec.ts`
      (marker `// @spec:013-ki-tooltip`), consuming the BUILT
      `../dist/components/ki-tooltip.js` and injecting `@kimen/tokens/css`
      (002/011 pattern), REAL pointer input, delay tokens pinned on the
      fixtures (0ms for flow tests; a dedicated non-zero-delay test drives
      the hover-intent and linger behavior with fake timers): S1 hovering
      the "Send" trigger shows "Send immediately"; S2 moving the pointer
      away from trigger and tooltip hides it; S12 moving the pointer from
      the trigger ONTO the tooltip keeps it visible (linger across the
      offset gap); S3 an unrecognized `placement` value renders the
      tooltip in the default position ABOVE the trigger; S14 a trigger at
      the top viewport edge with `placement="top"` shows the tooltip fully
      within the viewport, BELOW the trigger (bounding boxes). Verify
      failing.
- [ ] T009 [P] [US1] Write the dismissal + blank-label section of the
      browser suite: S5 with the tooltip visible on its focused trigger,
      Escape hides it, the trigger KEEPS focus and zero activations fire
      (SC-002 — assert no click on the trigger); S13 hovering a trigger
      wrapped with an empty label shows nothing AND the trigger exposes no
      accessible description. Verify failing.

### GREEN: implementation

- [ ] T010 [US1] Implement per research D1–D5/D7 in
      `packages/elements/src/components/ki-tooltip/ki-tooltip.tsx` +
      `ki-tooltip.position.ts` + `ki-tooltip.delay.ts`: shadow
      `<slot/>` + conditional `<div part="tooltip" role="tooltip">{label}</div>`
      (rendered only when `label.trim() !== ''`, `visibility: hidden`
      until shown); host state machine — `pointerenter`/`pointerleave` +
      composed `focusin`/`focusout` on the HOST (never on the trigger),
      two booleans + one timer, show-delay only on the pointer path,
      hide-delay only on pointer leave, focus transitions immediate;
      delays read at interaction time via `getComputedStyle` +
      `parseDelay`; document CAPTURE `keydown` listener registered ONLY
      while visible — Escape hides immediately, `preventDefault()` +
      `stopPropagation()`, never touches focus (D5); `aria-description`
      reflection onto the slotted trigger discovered via `slotchange`
      (set when non-blank, removed on blank/swap/disconnect — D2/D7);
      positioning pass once per reveal on the hidden-but-laid-out bubble
      (`normalizePlacement` → `resolveTooltipPosition` →
      effective-placement class + `--_ki-tooltip-cross-shift`); reflected
      `placement` prop, watched `label`. CSS in `ki-tooltip.css`:
      tokens-only via `--_ki-tooltip-*` indirection (002 pattern), host
      `display: inline-block; position: relative`, logical inset rules per
      effective placement (`inset-block-*`/`inset-inline-*` +
      `calc(100% + offset)`), `inline-size: max-content` +
      `max-inline-size`, logical properties only, NO transition/animation
      declarations (v1 ships no motion — FR-010/S17 by construction,
      research D6).
- [ ] T011 [US1] Complete JSDoc on every public member (description,
      `@default`, when-to-use/when-NOT-to-use per
      contracts/tooltip-contract.md §Agent-facing metadata, including the
      never-essential/never-interactive/never-on-disabled rules and the
      rich-content-goes-to-popover pointer, FR-012) — an undocumented
      member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T012 [US1] Per-story gates: axe zero violations across the four
      placements, tooltip shown and hidden (asserted in the browser suite;
      `pnpm --filter @kimen/elements run test-browser` green); add BOTH
      ki-tooltip entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-tooltip.js` ignoring `@stencil/core`, limit
      9 KB; worst case: same path with runtime, limit 25 KB — mirror the
      existing entries) and run `pnpm --filter @kimen/elements run size`;
      rebuild and commit the regenerated `generated/docs.json` +
      `src/components.d.ts` (Art. I — docs.json is today's machine
      surface).

**Checkpoint**: US1 green in mock-doc + browser suites; S1, S2, S3, S5,
S12, S13, S14 pass.

---

## Phase 4: User Story 2 — Equal access without a pointer (Priority: P1)

**Goal**: focus parity (reveal without delay, hide on blur), the
description association observable in the accessibility tree with the
trigger's name unchanged, and Escape consumption that protects an ancestor
dialog (FR-013).

**Independent Test**: quickstart.md §Manual validation 2, 3 and 5.

### RED

- [ ] T013 [P] [US2] Extend the browser suite with keyboard-path
      scenarios (REAL Tab/Escape key input): S4 on a page whose first
      interactive element is the wrapped "Send" button, one Tab focuses
      the trigger AND the tooltip shows "Send immediately" immediately
      (no delay — assert with a non-zero pinned show-delay that the focus
      path ignores it); S6 moving focus to the next interactive element
      hides the tooltip; S15 with the tooltip hover-shown while focus
      rests on another element, Escape hides the tooltip and focus stays
      on that element; S16 inside a native `<dialog>` opened with
      `showModal()`, with the tooltip visible, Escape hides ONLY the
      tooltip and the dialog stays open (real platform close-request
      precedence — research D5; a second Escape closes the dialog).
      Verify failing.
- [ ] T014 [P] [US2] Extend the browser suite with assistive-tech
      scenarios: S7 the accessibility tree exposes the trigger with
      accessible description "Send immediately" AND accessible name
      "Send" (unchanged) — with the tooltip HIDDEN (the association is
      static, research D2); S8 while visible, the tree exposes a tooltip
      role whose content is "Send immediately"; while hidden, no tooltip
      role is exposed; axe zero violations with the tooltip visible.
      Verify failing.

### GREEN

- [ ] T015 [US2] Close any gap T013/T014 expose in `ki-tooltip.tsx`
      (focus-path immediacy, capture-phase Escape consumption and
      listener add/remove hygiene per D5, static `aria-description`
      lifecycle per D2/D7 — set on non-blank label, removed on
      blank/swap/disconnect, name never touched).
- [ ] T016 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/013-ki-tooltip`; if
      the public surface changed, rebuild and re-commit
      `generated/docs.json`.

**Checkpoint**: S4, S6, S7, S8, S15, S16 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming from the token layer alone (the first
inverse-ramp consumer), forced dark scheme, RTL logical placement, and the
reduced-motion guarantee measured under real emulation.

**Independent Test**: quickstart.md §Manual validation 6.

### RED

- [ ] T017 [US3] Extend the theming coverage following the 001/002
      pattern (inject built token stylesheets): in
      `ki-tooltip.browser.spec.ts`, S9 declaring
      `data-ki-theme="material3"` restyles the visible tooltip — assert
      resolved `--ki-tooltip-{bg|fg}` take their material3 values with
      unchanged markup (SC-004); S11 under `dir="rtl"` with
      `placement="start"`, the tooltip renders on the RIGHT side of the
      trigger (bounding boxes); create
      `packages/elements/browser-tests/ki-tooltip.dark.browser.spec.ts`
      (marker `// @spec:013-ki-tooltip`, the 002 dark-instance split): S10
      forced dark under onmars resolves the dark token values, plus axe in
      dark; add a reduced-motion-emulating instance to
      `packages/elements/vitest.browser.config.ts` (mirroring the dark
      split mechanism, research D9) and create
      `packages/elements/browser-tests/ki-tooltip.motion.browser.spec.ts`:
      S17 under `prefers-reduced-motion: reduce` the tooltip appears
      without animated movement — reveal works and no
      transition/animation computes on the bubble. Verify failing (tokens
      exist from Phase 2; failure must come from component CSS not
      consuming them — if earlier phases already turn any of these green,
      record that instead and keep the assertions as regression tests).

### GREEN

- [ ] T018 [US3] Close any gap the S9/S10/S11/S17 tests expose in
      `ki-tooltip.css` token consumption (every value through
      `--_ki-tooltip-*` → `--ki-tooltip-*`, logical properties only, no
      physical left/right anywhere, no motion declarations);
      `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S9, S10, S11, S17 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent uses tooltips correctly (Priority: P3)

**Goal**: the generated contract answers when-to-use (brief clarifying
hint, information discoverable elsewhere) and when-NOT-to-use (essential
info, interactive/rich content → future popover, validation messages,
disabled controls, touch-primary flows); malformed placements are safe (S3
already tested in US1: unit branch in T007, rendered fallback in T008).

- [ ] T019 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use with the essential-info/rich-content/
      disabled-control boundaries, defaults including `placement="top"`,
      the unknown-placement-renders-default robustness note, the
      static-description note) for every `ki-tooltip` member, and that
      `src/components.d.ts` exposes the typed surface (`KiTooltipPlacement`
      union). Commit regenerated artifacts (never hand-edited, Art. I).
      Machine-surfaces scope note: CEM and llms.txt arrive with
      017-agent-surfaces (in progress); the Zod catalog is Fase 3 (founder
      decision 2026-07-08) — docs.json + components.d.ts are the surfaces
      this feature regenerates.

**Checkpoint**: S3 covered (T007/T008); generated docs surface committed.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T020 [P] Write
      `packages/elements/src/components/ki-tooltip/ki-tooltip.stories.tsx`
      following the ki-button stories pattern (tag string component, lazy
      loader registration): `Playground` (label + placement controls),
      `Placements` (four placements around a centered trigger),
      `ViewportEdge` (trigger pinned at an edge demonstrating the flip),
      `KeyboardParity` (focusable trigger with usage notes), `RTL`
      (`dir="rtl"` with `placement="start"`), `InsideDialog` (native
      dialog + tooltip, the S16 story). No axis for size/variant/tone —
      they do not exist on ki-tooltip.
- [ ] T021 [P] Manual APG tooltip walkthrough documented in the PR
      (MANDATORY — new interaction pattern, Art. V; spec Constitutional
      Surface; quickstart.md §Manual validation 7) per research.md D10:
      hover/focus reveal parity (focus with no delay), WCAG 1.4.13 trio,
      Escape without focus move or activation, Escape-inside-dialog
      precedence, tooltip never in the tab order, AND the real-AT
      verification points automation cannot pin — NVDA + VoiceOver
      announce the trigger's unchanged name followed by the tooltip text
      as its DESCRIPTION (the `aria-description` verification point for
      research D2, with the light-DOM description-node fallback as the
      recorded contingency), the composite-trigger check (ki-button as
      trigger, one-line-forward remedy noted), and the touch-gesture note
      feeding the spec's gate-1 open question. RTL render check rides S11
      (automated in T017) plus a Storybook spot-check.
- [ ] T022 Run `pnpm exec nx run-many -t size` — ki-tooltip marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, existing entries unaffected,
      token stylesheets within caps (Art. IV budget, SC-006).
- [ ] T023 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 —
      the only definition of done (Art. III). Includes constitution,
      traceability (S1–S17 ↔ tests), scenario families (form N/A
      justified in the spec table), tokens-sync, contrast (extended
      sweep), lint, styles, typecheck, deadcode (knip sees no dead
      export), packaging, budgets, mock-doc and real-browser suites
      (light + dark + reduced-motion instances).

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004, T005 (P) → T006 ─┤ (tokens + extended sweep before any component CSS)
             ├─ Phase 3 (US1): T007–T009 (P, RED) → T010 → T011 → T012
             ├─ Phase 4 (US2): T013–T014 (P, RED) → T015 → T016   (after US1 GREEN)
             ├─ Phase 5 (US3): T017 (RED) → T018                   (after Phase 2 + T010)
             ├─ Phase 6 (US4): T019                                 (after T011 + build)
             └─ Phase 7: T020, T021 (P) → T022 → T023              (last)
```

- Single writer on `feat/ki-tooltip`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 ∥ T005 (different files); T007 ∥
  T008 ∥ T009 (different files/sections written independently, merged
  into the test files before running); T013 ∥ T014 (sections of the
  browser suite); T020 ∥ T021. Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T007–T009 before T010; T013–T014
  before T015; T017 before T018. Each RED task records the failure
  reason.
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Machine surfaces: CEM and llms.txt arrive with 017-agent-surfaces (in
  progress); the Zod catalog is Fase 3 (founder decision 2026-07-08).
  This feature regenerates and commits `generated/docs.json` +
  `src/components.d.ts` only (T012, T019).
- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control lives in T007 (exhaustive
  unit cases for the pure helpers `normalizePlacement`,
  `resolveTooltipPosition`, `parseDelay` — the component's only
  extractable logic). Wiring Stryker is a factory chore outside this spec.
- Form-participation family: N/A for ki-tooltip — transient descriptive
  overlay, not a form control, justified in spec.md's Scenario Family
  Coverage table; no ElementInternals test task exists on purpose.
- Determinism boundary: the show/hide delays are the component's own
  timers with token values — flow tests pin the delay tokens to 0ms on
  the fixture; the delay behavior itself is tested with non-zero pinned
  values under fake timers (T008); no real-time waits anywhere (Art. III,
  research D9).
- AT testing boundary: T014 asserts the OBSERVABLE accessibility-tree
  outcomes (computed description, unchanged name, tooltip role); the
  spoken announcements are constitutionally covered by T021's documented
  manual walkthrough (Art. V — no automated audit can hear them). T021 is
  also the named verification point for the `aria-description` decision
  (research D2) with its recorded fallback contingency.
- Every S-ID S1–S17 maps to a test task (CI-gated by
  check-traceability.sh):
  - S13 → T007 (markup half) + T009 (browser half)
  - S1, S2, S3, S12, S14 → T008 (S3, S14 also unit-covered in T007)
  - S5 → T009
  - S4, S6, S15, S16 → T013
  - S7, S8 → T014
  - S9, S11 → T017 (main suite); S10 → T017 (dark split file);
    S17 → T017 (reduced-motion file)
- FR coverage: FR-001 → T007(S13)/T009/T010; FR-002 → T010/T014(S7);
  FR-003 → T008(S1)/T013(S4)/T010; FR-004 → T008(S2)/T009(S5)/T013(S6)/T010;
  FR-005 → T008(S12)/T009(S5)/T010; FR-006 → T007/T014(S8)/T010;
  FR-007 → T007/T008(S14)/T017(S11)/T010; FR-008 → T007/T008(S3)/T010;
  FR-009 → T003–T006/T010/T018; FR-010 → T010 (no motion by
  construction)/T017(S17); FR-011 → T007/T010; FR-012 → T011/T019;
  FR-013 → T013(S15, S16)/T015.
- Gate extension (Art. X): the contrast sweep MUST cover
  `--ki-tooltip-*` in the same change that ships the tokens (T005/T006,
  research D8) — an unextended sweep silently ignores the component.
  Coordinate with 008/011's per-pair-minimum mechanism: whichever feature
  merges first lands it; the others rebase and add only their patterns.
- Cross-spec note (FR-013): the Escape-precedence contract is proven here
  against a native `<dialog>` (T013/S16); 012-ki-dialog's plan inherits
  the coordination note in research.md D5 (dialog must ride the platform
  close request or honor `event.defaultPrevented`, never a document
  capture listener).
- Gate-1 flags carried by this plan set: the `show-delay`/`hide-delay`
  duration tokens extend the spec's enumerated `--ki-tooltip-*` list
  (plan.md Art. VI — founder sign-off), and the touch-gesture open
  question is fed by T021's walkthrough note.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
