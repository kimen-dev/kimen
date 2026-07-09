# Tasks: ki-progress

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/015-ki-progress/`

**Prerequisites**: plan.md, spec.md with S1–S15 (gate-1 approval pending —
the pre-implement gate blocks execution until the `.approved` marker
exists), research.md (D1–D8), data-model.md,
contracts/progress-contract.md.

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries
the file-level marker `// @spec:015-ki-progress`; S-IDs appear on code
lines (test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = follow a task
to completion (P1, MVP), US2 = wait through an unknown duration (P2), US3 =
perceive progress through assistive technology (P2), US4 = re-theme without
touching markup (P2), US5 = an agent picks the right progress (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-progress
      --spec 015-ki-progress`, then `pnpm exec nx run @kimen/elements:build
      && pnpm run format`. Creates
      `packages/elements/src/components/ki-progress/{ki-progress.tsx,ki-progress.css,ki-progress.spec.tsx}`
      and `packages/elements/browser-tests/ki-progress.browser.spec.ts`
      with traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension (blocks all component CSS)

**Purpose**: `--ki-progress-*` must exist and ship in both themes BEFORE
any component CSS consumes it (research.md D6), and the contrast sweep must
cover the new pair in the SAME change or the gate silently ignores it
(research.md D7, Art. X; user-story-independent). This phase ships the
system's FIRST motion token.

- [ ] T003 [P] Author
      `packages/tokens/tokens/component/progress.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): geometry per shape —
      `ki.progress.linear.{thickness,radius}` (thickness from `ki.space.*`,
      radius `{ki.radius.round}`) and
      `ki.progress.circular.{size,track-width}` (from `ki.space.*`); color
      per part — `ki.progress.track.color` from the neutral surface ramp
      (`{ki.surface.s3}`-area) and `ki.progress.indicator.color` from the
      primary emphasis ramp (`{ki.surface.primary-high-em}`) — the exact
      ramp steps are the onmars theme decision recorded here and ratified
      by the contrast gate (010 T003 pattern); motion —
      `ki.progress.indeterminate.duration`, DTCG `$type: "duration"`, a
      LITERAL value (≈ `1600ms`): the first motion token, no semantic
      motion family exists to reference (declared deviation, research D6;
      verify the css pipeline emits it verbatim). 7 tokens; no
      interaction-state segments, no focus-ring tokens (documented
      deviation, spec Art. VI echo).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/progress.material3.tokens.json`:
      material3 overrides for the same token names — indicator mapped to
      the M3 primary role, track to its container role, M3 metrics (4px
      linear thickness, 48px ring / 4px stroke via the equivalent
      `ki.space.*` references), radius `{ki.radius.round}` — mirroring how
      `button.material3.tokens.json` overrides the button layer. Do NOT
      redefine the duration unless M3 motion demands it (cascade
      inheritance, 001 contract).
- [ ] T005 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): add the pair
      `--ki-progress-indicator-color` over `--ki-progress-track-color` at
      the WCAG 1.4.11 non-text minimum **3.0** (FR-012), with the
      zero-match guard covering the progress names so token drift fails
      loudly. COORDINATION (research D7): the per-pair-minimum mechanism
      does not exist in the shipped script (single `MIN_RATIO = 4.5`,
      button-only pattern — verified 2026-07-08); 008 T005 introduces the
      identical mechanism. If 008 landed first, rebase and add ONLY the
      progress pair; otherwise introduce per-pair minimums here exactly as
      008 D8 specifies (existing text pairs stay at 4.5). Add unit cases to
      `packages/tokens/scripts/check-contrast.test.mjs` (pair resolution,
      3.0 minimum, zero-match guard).
- [ ] T006 Wire both token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tokens/component/progress.tokens.json` to `LAYERS` and
      `tokens/component/progress.material3.tokens.json` to
      `MATERIAL3_LAYERS`), rebuild (`pnpm --filter @kimen/tokens build`),
      verify `--ki-progress-indeterminate-duration: 1600ms` lands verbatim
      in the built CSS, run `pnpm --filter @kimen/tokens contrast`
      (indicator-on-track ≥ 3:1 in every theme × scheme) and
      `pnpm --filter @kimen/tokens size` (stylesheets stay ≤ their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable). If the contrast pair fails
      in any context, STOP — the fix changes 001-shipped semantic values
      and requires explicit founder sign-off at the merge gate (002
      precedent; research D7).

**Checkpoint**: `--ki-progress-*` resolves in onmars (light+dark) and
material3 (light+dark) stylesheets; the indicator/track pair clears 3:1 in
all four contexts; token budgets, contrast and tokens-sync green.

---

## Phase 3: User Story 1 — Follow a task to completion (Priority: P1) 🎯 MVP

**Goal**: determinate progress in both shapes: the fill fraction equals
value ÷ max after documented clamping, updates at runtime, and malformed
values never break rendering.

**Independent Test**: quickstart.md §Manual validation 1 and 2 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-progress/ki-progress.spec.tsx`
      (marker `// @spec:015-ki-progress`): anatomy per shape — linear
      renders `div.base[role=progressbar]` > `div[part=track]` >
      `div[part=indicator]`; circular renders the same base node > `svg`
      (`aria-hidden="true"`, both circles `pathLength="100"`, parts
      `track`/`indicator` — exactly two parts, none on base or svg); ARIA
      wiring — `aria-valuemin="0"` and normalized `aria-valuemax` always,
      `aria-label` present only when `label` is set (never empty-string);
      S4 `value="250" max="100"` exposes `aria-valuenow="100"`; S5 an
      unrecognized `shape` renders the linear markup; S14 exhaustive unit
      cases for the pure helpers in `ki-progress.math.ts` —
      `normalizeMax`, `clampValue`, `resolveShape` — every table row
      verbatim (`-10/100→0`, `abc/100→0`, `40/0→40 of 100`,
      `40/-5→40 of 100`, `40/abc→40 of 100`) plus boundary cases (0, max,
      Infinity, NaN) — the mutation-gap compensating control (research
      D2); a bare `<ki-progress>` renders determinate at value 0 (spec
      assumption); no listeners, no tabindex, no events in the rendered
      output. Run `pnpm --filter @kimen/elements run test` and record the
      failure reason (component renders scaffold placeholder).
- [ ] T008 [P] [US1] Write the core-determinate section of the browser
      suite `packages/elements/browser-tests/ki-progress.browser.spec.ts`
      (marker `// @spec:015-ki-progress`), consuming the BUILT
      `../dist/components/ki-progress.js` and injecting `@kimen/tokens/css`
      (002/008 pattern): S1 a linear progress at 40/100 — the indicator's
      bounding box is 40% (±1px) of the track's inline size; S2 a circular
      progress at 40/100 — the indicator circle's computed
      `stroke-dasharray` covers 40 of the 100-normalized circumference; S4
      at 250/100 the indicator renders completely full; S13 setting
      `value = 80` at runtime updates the fill to 80% and `aria-valuenow`
      to 80 of 100; S14 the malformed rows render their documented fills in
      a real browser; track/indicator computed colors resolve from the
      `--ki-progress-*` token values. Verify failing.

### GREEN: implementation

- [ ] T009 [US1] Implement per research D1/D2/D3/D4 in
      `packages/elements/src/components/ki-progress/ki-progress.tsx` +
      `ki-progress.math.ts`: five typed reflected props (`value` number
      default 0, `max` number default 100, `indeterminate` boolean default
      false, `shape` default `linear`, `label` string); pure helpers
      normalize for presentation/ARIA only (attributes keep declared
      values); render one stable `div.base[role=progressbar]` with
      `aria-valuemin/valuemax` always, `aria-valuenow` from the clamped
      value (omitted when indeterminate — wired fully in US2), `aria-label`
      only when `label` exists (no fallback string); shape branch — linear
      track/indicator divs, circular svg ring (`viewBox` fixed, circles
      `pathLength="100"`); host style sets `--_ki-progress-fraction`. CSS
      in `ki-progress.css`: tokens-only via the `--_ki-progress-*`
      indirection on `:host` (002 pattern); linear fill `inline-size:
      calc(var(--_ki-progress-fraction) * 100%)`, thickness/radius from
      the linear tokens; circular `stroke-dasharray:
      calc(var(--_ki-progress-fraction) * 100) 100`, size/stroke from the
      circular tokens, ring rotated to start at top (clockwise both
      directions); logical properties only; NO determinate transition
      (research D3); no tabindex, no listeners, no events.
- [ ] T010 [US1] Complete JSDoc on the host, all five props and both parts
      (description, `@default`, when-to-use/when-NOT-to-use per
      contracts/progress-contract.md §Agent-facing metadata — including
      "not for static measurements (gauge/meter), wizard steps (stepper),
      skeletons, or sub-second operations", the `label`-required guidance
      and the determinate-vs-indeterminate selection rule) — an
      undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T011 [US1] Per-story gates: axe zero violations on the determinate
      shape matrix (asserted in the browser suite;
      `pnpm --filter @kimen/elements run test-browser` green); add BOTH
      ki-progress entries to the `size-limit` array in
      `packages/elements/package.json` (marginal:
      `dist/components/ki-progress.js` ignoring `@stencil/core`, limit
      9 KB; worst case with runtime, limit 25 KB — mirror the ki-button
      entries) and run `pnpm --filter @kimen/elements run size`; rebuild
      and commit the regenerated `generated/docs.json` +
      `src/components.d.ts` (Art. I — docs.json is today's machine
      surface).

**Checkpoint**: US1 green in mock-doc + browser suites; S1, S2, S4, S13,
S14 pass.

---

## Phase 4: User Story 2 — Wait through an unknown duration (Priority: P2)

**Goal**: explicit indeterminate mode in both shapes — continuous activity
with no fabricated fraction, winning over any declared value, and stilled
under reduced motion per FR-009's deterministic oracle.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T012 [US2] Extend `ki-progress.browser.spec.ts` with the
      indeterminate scenarios: S3 an indeterminate progress (both shapes)
      shows at least one running, infinitely-iterating animation on the
      indicator (`getAnimations()`: `playState === 'running'`,
      `iterations === Infinity`) and presents no completed fraction; S15
      indeterminate declared together with `value="40"` — no fraction
      presented and NO `aria-valuenow` exposed; S6 with reduced motion
      emulated, zero indefinitely-running animations are observable in the
      indicator's animation state while the element still renders its
      stilled indication. For S6 add the `emulateReducedMotion` browser
      command (`page.emulateMedia({ reducedMotion })`) to
      `packages/elements/vitest.browser.config.ts`, mirroring the existing
      `emulateColorScheme` command — ADD-IF-ABSENT: 008 T017 plans the
      identical command; if 008 landed first, reuse it (research D8
      coordination). Verify failing.

### GREEN

- [ ] T013 [US2] Implement indeterminate per research D5 in
      `ki-progress.tsx` + `ki-progress.css`: `:host([indeterminate])`
      switches presentation — the fraction property is not applied and
      `aria-valuenow` is omitted (indeterminate wins, FR-003); linear
      keyframes travel a fixed segment via `inset-inline-start` (logical —
      RTL free); circular keyframes rotate the svg with a fixed partial
      arc; BOTH `animation` declarations exist ONLY inside
      `@media (prefers-reduced-motion: no-preference)` (008 D6 pattern) so
      the S6 oracle holds by construction; `animation-duration:
      var(--_ki-progress-indeterminate-duration)`; the reduced-motion
      stilled presentation is the keyframes' resting geometry (visual
      distinguishability from determinate = theme guidance, not gated —
      spec Assumptions).

**Checkpoint**: S3, S6, S15 green; full browser suite green.

---

## Phase 5: User Story 3 — Perceive progress through assistive technology (Priority: P2)

**Goal**: exposure contract — role, name and value/range in determinate
mode, no value in indeterminate mode, zero tab stops.

**Independent Test**: quickstart.md §Manual validation 4.

### RED

- [ ] T014 [US3] Extend `ki-progress.browser.spec.ts` with the exposure
      scenarios: S8 a progress labeled "Uploading report.pdf" at 40/100
      exposes a progressbar named "Uploading report.pdf" with value 40 of
      100 (role + `aria-label` + `aria-valuenow`/`aria-valuemax` on the
      shadow progressbar node); S9 an indeterminate progress labeled
      "Loading messages" exposes the progressbar and name with NO current
      value; S7 with a focused button, then a progress, then a second
      button, Tab lands on the second button, never on the progress; the
      no-label edge — no accessible name is exposed and no empty
      `aria-label` attribute is rendered (spec edge case, no S-ID); axe
      zero violations across the full shape × mode matrix. Verify failing —
      and if T009/T013's by-construction exposure already turns these green
      (expected, research D1), record that instead and keep the assertions
      as regression tests (002 T013 / 010 T012 precedent).

### GREEN

- [ ] T015 [US3] Close any gap S7/S8/S9 expose (a stray `tabindex`, a
      missing/extra ARIA attribute or a second role node would be a defect
      of T009/T013); the expected diff is empty — exposure is by
      construction on the single stable node (research D1). Record the
      outcome.

**Checkpoint**: S7, S8, S9 green.

---

## Phase 6: User Story 4 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of the shape × mode matrix, forced dark
scheme, and the RTL writing-direction contract on the linear fill.

**Independent Test**: quickstart.md §Manual validation 5 and 6.

### RED

- [ ] T016 [US4] Extend the theming coverage following the 001/002 pattern
      (inject built token stylesheets): in `ki-progress.browser.spec.ts`,
      S10 declaring `data-ki-theme="material3"` restyles the progress —
      assert track/indicator computed colors and metrics resolve to
      material3 values with unchanged markup, across the shape × mode
      matrix; S12 under `dir="rtl"` the linear filled portion grows from
      the RIGHT edge of the track (bounding-box comparison; the circular
      ring is NOT mirrored — spec assumption); create
      `packages/elements/browser-tests/ki-progress.dark.browser.spec.ts`
      (marker `// @spec:015-ki-progress`, the established dark split): S11
      `data-ki-color-scheme="dark"` under onmars resolves dark token
      values, plus axe in dark across the shape × mode matrix. Verify
      failing (tokens exist from Phase 2; failure must come from component
      CSS not consuming them — if earlier phases already turn any of these
      green, record that and keep them as regression tests).

### GREEN

- [ ] T017 [US4] Close any gap the S10/S11/S12 tests expose in
      `ki-progress.css` token consumption (every ink/metric/duration
      through `--_ki-progress-*` → `--ki-progress-*`, logical properties
      only); `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S10, S11, S12 green; stylelint token allowlist green.

---

## Phase 7: User Story 5 — An agent picks the right progress (Priority: P3)

**Goal**: malformed markup is safe end to end (S14 already tested in US1)
and the generated contract answers when-to-use/when-NOT-to-use.

### RED

- [ ] T018 [US5] Extend `ki-progress.browser.spec.ts`: S5 a progress with
      `shape="banana"` renders the linear presentation with computed
      metrics identical to the default; a non-numeric `value` renders the
      indicator empty at the default 0 (US5 acceptance #2 — the S14 `abc`
      row in a real browser, no additional S-ID). Verify failing — expected
      green-by-construction after T009 (`resolveShape` + `clampValue`); if
      so, record that and keep the assertions as regression tests; any gap
      is a defect of T009.

### Docs surface

- [ ] T019 [US5] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use with the gauge/stepper/skeleton/
      sub-second exclusions, all five props with types and defaults, both
      parts, the label-required guidance) for every `ki-progress` member,
      and that `src/components.d.ts` exposes the typed surface (including
      the `shape` union). Commit regenerated artifacts (never hand-edited,
      Art. I). Machine surfaces scope note: CEM and llms.txt arrive with
      017-agent-surfaces (in progress); the Zod catalog is Fase 3 (founder
      2026-07-08) — docs.json + components.d.ts are the surfaces this
      feature regenerates.

**Checkpoint**: S5 covered end to end; generated docs surface committed.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T020 [P] Write
      `packages/elements/src/components/ki-progress/ki-progress.stories.tsx`
      following the ki-button stories pattern (tag string component, lazy
      loader registration): a Playground story (value/max/indeterminate/
      shape/label controls) plus a shape × mode matrix story (linear/
      circular × determinate/indeterminate) and a malformed-values story
      (the S14 rows rendering safely) — so the workshop demonstrates the
      full contract and both themes can be eyeballed.
- [ ] T021 [P] RTL + reduced-motion eyeball check in Storybook/manual page
      (`dir="rtl"`: linear fills from the right, ring unmirrored — S12
      already automated in T016; OS reduced-motion: stilled indication
      visible). Manual APG walkthrough: N/A — no APG interaction pattern
      exists for a non-interactive output element and none is introduced
      (plan.md Art. V; charter flags dialog/tooltip/tabs/select only).
- [ ] T022 Run `pnpm exec nx run-many -t size` — ki-progress marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, sibling entries unaffected, token
      stylesheets within caps (Art. IV budget, SC-006).
- [ ] T023 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes constitution,
      traceability (S1–S15 ↔ tests), scenario families (form N/A justified
      in the spec table), tokens-sync, contrast (indicator-on-track pair,
      per-pair minimum), lint, styles, typecheck, deadcode, packaging,
      budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004, T005 (P) → T006 ─┤ (tokens + extended sweep before any component CSS)
             ├─ Phase 3 (US1): T007, T008 (P, RED) → T009 → T010 → T011
             ├─ Phase 4 (US2): T012 (RED) → T013          (after US1 GREEN)
             ├─ Phase 5 (US3): T014 (RED) → T015          (after T013 — S9 needs indeterminate)
             ├─ Phase 6 (US4): T016 (RED) → T017          (after Phase 2 + T009)
             ├─ Phase 7 (US5): T018 (RED) → T019          (T019 after T010 + build)
             └─ Phase 8: T020, T021 (P) → T022 → T023     (last)
```

- Single writer on `feat/ki-progress`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 ∥ T005 (different files); T007 ∥ T008
  (different test files); T020 ∥ T021. Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T007/T008 before T009; T012 before
  T013; T014 before T015; T016 before T017; T018 before its closure. Each
  RED task records the failure reason (or the documented
  green-by-construction outcome for T014/T018).
- MVP scope: Phases 1–3 (US1). Phases 4–7 are incremental; Phase 8 closes.

## Notes

- Machine surfaces: CEM and llms.txt arrive with 017-agent-surfaces (in
  progress); the Zod catalog is Fase 3 (founder 2026-07-08). This feature
  regenerates and commits `generated/docs.json` + `src/components.d.ts`
  only (T011, T019).
- Shared-script coordination (declared, research D7/D8): 008, 010 and 015
  all extend `packages/tokens/scripts/check-contrast.mjs`, and 008 and 015
  both add the `emulateReducedMotion` command to
  `packages/elements/vitest.browser.config.ts`. Whichever feature lands
  first ships the mechanism (per-pair contrast minimum; browser command);
  the later ones rebase and add only their own pairs/usages (T005, T012
  are written add-if-absent).
- First motion token: `--ki-progress-indeterminate-duration` carries a
  LITERAL value — no semantic motion family exists (verified 2026-07-08),
  and creating `ki.motion.*` for one consumer would be speculative
  (Art. VII; research D6, declared in plan.md Complexity Tracking).
- Mutation gate (template task): Stryker is not yet wired into
  gates-suite.sh (factory gap declared in plan.md Art. III, inherited from
  001/002/008/009/010). Compensating control lives in T007
  (`ki-progress.math.ts` — `normalizeMax`, `clampValue`, `resolveShape` —
  exhaustive unit cases per branch, the S14 table verbatim). Wiring
  Stryker is a factory chore outside this spec.
- Form-participation family: N/A for ki-progress — output-only status
  indicator, never carries user input, not form-associated; justified in
  spec.md's Scenario Family Coverage table; no ElementInternals test task
  exists on purpose (and ElementInternals is rejected even for ARIA,
  research D1).
- No live region exists and none is tested for: value ticks are never
  announced (spec-approved; announced completion belongs to ki-alert, 011).
- No determinate fill transition exists in v1 (research D3): S13 asserts
  the new fill, not its easing; adding motion nobody approved would create
  its own reduced-motion obligations.
- Every S-ID S1–S15 maps to a test task (CI-gated by
  check-traceability.sh):
  - S1, S2, S13 → T008
  - S4, S14 → T007 + T008
  - S5 → T007 + T018
  - S3, S6, S15 → T012
  - S7, S8, S9 → T014
  - S10, S12 → T016 (browser spec); S11 → T016 (dark split file)
- FR coverage: FR-001 → T007/T008/T009; FR-002 → T007/T008/T009;
  FR-003 → T012/T013; FR-004 → T007(S5)/T008(S2)/T009/T018;
  FR-005 → T007/T009/T010/T014(S8); FR-006 → T008(S1,S2,S13)/T009;
  FR-007 → T007/T014(S7); FR-008 → T014(S8,S9)/T009/T013;
  FR-009 → T012(S3,S6)/T013; FR-010 → T003–T006/T009/T017;
  FR-011 → T007(S5,S14)/T018; FR-012 → T005/T006;
  FR-013 → T007/T009 (parts asserted in anatomy);
  FR-014 → T009/T016(S12); FR-015 → T010/T019.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
