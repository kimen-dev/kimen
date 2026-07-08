# Tasks: ki-card

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/009-ki-card/`

**Prerequisites**: plan.md, spec.md (gate-1 approval required before
implementation), research.md (D1–D4), contracts/card-contract.md.
data-model.md intentionally absent (plan.md Summary).

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. All three test files carry
the file-level marker `// @spec:009-ki-card`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = scan grouped
content (P1, MVP), US2 = contain interactive content without interfering
(P2), US3 = re-theming (P2), US4 = agent legibility & robustness (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-card --spec
      009-ki-card`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-card/{ki-card.tsx,ki-card.css,ki-card.spec.tsx}`
      and `packages/elements/browser-tests/ki-card.browser.spec.ts` with
      traceability markers wired and the `src/index.ts` export added.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer (blocks all component CSS)

**Purpose**: `--ki-card-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D2; user-story-independent).

- [ ] T003 [P] Author `packages/tokens/tokens/component/card.tokens.json`:
      the flat onmars family `ki.card.{bg,fg,border-color,border-width,radius,elevation,gap}`
      plus per-region `ki.card.{media|header|body|footer}-padding`
      (media-padding = `{ki.space.zero}`, full-bleed default). Every value a
      reference into the semantic/primitive layers: surface from the
      `ki.surface.s0–s5` ramp (or `ki.surface.raised`) — which step is the
      onmars theme decision recorded here (spec Assumptions: defined from
      the shipped 001 vocabulary while the MarsUI frames are pending, gate-1
      ratified) — text from `ki.text.*`, border from `ki.outline.*`,
      elevation a composed box-shadow referencing `ki.elevation.*` colors
      (the `--ki-button-*-shadow` precedent), geometry from
      `ki.radius.*`/`ki.space.*`.
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/card.material3.tokens.json`:
      material3 overrides for the same token names. The M3
      elevated/filled/outlined decision lives HERE as plain values —
      surface-container color, M3 shape radius, and the border/elevation
      pair that renders the chosen style (FR-008: no attribute exists).
- [ ] T005 Wire both card files into
      `packages/tokens/style-dictionary.config.mjs` (`LAYERS` +
      `MATERIAL3_LAYERS`, after the button entries), and extend the
      component-layer sweep in
      `packages/tokens/scripts/check-contrast.mjs` to cover the card pair —
      the sweep regex is button-specific today
      (`/^--ki-button-…-bg$/`, line ~171), so `--ki-card-fg` on
      `--ki-card-bg` must join it or the gate never sees the card (Art. X:
      a finding a rule could produce gets ruled, never left to review).
      Rebuild (`pnpm --filter @kimen/tokens build`), run
      `pnpm --filter @kimen/tokens contrast` and
      `pnpm --filter @kimen/tokens size` (stylesheets stay in their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable).

**Checkpoint**: `--ki-card-*` resolves in onmars (light+dark) and material3
(light+dark) stylesheets; token budgets and contrast gate green.

---

## Phase 3: User Story 1 — Scan grouped content on one surface (Priority: P1) 🎯 MVP

**Goal**: four regions in reading order on one distinct surface; any subset
renders cleanly; absent regions reserve no space.

**Independent Test**: quickstart.md §Manual validation 1 on a page with only
US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T006 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-card/ki-card.spec.tsx`
      (marker `// @spec:009-ki-card`): S1 shadow anatomy renders parts
      `card` → `media` → `header` → `body` → `footer` in reading order;
      S2 regions without slotted content carry the collapsed/empty state
      (including a whitespace-only default slot counting as empty —
      exhaustive unit cases for the emptiness predicate, research D1/D3
      mutation-gap compensating control); S3 an unrecognized
      `variant="elevated"` attribute changes nothing observable — content
      renders with default markup. Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T007 [P] [US1] Write browser suite
      `packages/elements/browser-tests/ki-card.browser.spec.ts`
      (marker `// @spec:009-ki-card`), consuming the BUILT
      `../dist/components/ki-card.js`: S1 visual reading order via geometry
      (media above header above body above footer) on a surface distinct
      from the page background; S2 a body-only card's block size equals the
      padded body alone — no reserved space, padding or gap from absent
      regions; axe zero violations across representative region subsets
      (all four, body-only, media+body, header+footer, empty). Verify
      failing.

### GREEN: implementation

- [ ] T008 [US1] Implement anatomy per research D1/D3 in
      `packages/elements/src/components/ki-card/ki-card.tsx`: plain
      `shadow: true`; `<div part="card">` containing four always-rendered
      region wrappers (`part="media|header|body|footer"`, each holding its
      slot); `slotchange` + initial check set per-region has-content state
      (default slot filters whitespace-only text nodes); no props, no
      listeners beyond slotchange, no tabindex, no ARIA. CSS in
      `ki-card.css`: tokens-only via `--_ki-card-*` indirection on `:host`
      (002 pattern), logical properties only; surface = bg/fg/border/
      radius/elevation from `--ki-card-*`; regions in a block flex/grid
      with `gap: var(--_ki-card-gap)`; per-region padding consumed as
      `padding-block`/`padding-inline` from the single
      `--ki-card-{region}-padding` token (logical-properties lint); empty
      regions `display: none` (removes their gap contribution).
- [ ] T009 [US1] Complete JSDoc on the host, every slot and every part
      (description, when-to-use/when-NOT-to-use per
      contracts/card-contract.md §Agent-facing metadata — including "author
      supplies the heading element in `header`" and "never as a button or
      link") — an undocumented member is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T010 [US1] axe zero violations across region subsets (asserted in
      T007; run `pnpm --filter @kimen/elements run test-browser` green).
      No manual APG walkthrough: no APG pattern applies to a
      non-interactive container (plan.md Art. V, charter).
- [ ] T011 [US1] Add both ki-card size-limit entries to
      `packages/elements/package.json` (marginal cost of
      `dist/components/ki-card.js` with `@stencil/core` ignored ≤ 9 KB;
      worst case with runtime ≤ 25 KB — same caps as ki-button) and run
      `pnpm --filter @kimen/elements run size` green (Art. IV, SC-005).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S3 pass.

---

## Phase 4: User Story 2 — Contain interactive content without interfering (Priority: P2)

**Goal**: behavioral transparency — zero added tab stops, zero added
roles, zero intercepted events.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T012 [US2] Extend `ki-card.browser.spec.ts` with transparency
      scenarios: S4 with a `ki-button` slotted in `footer`, Tab lands on
      the button and never on the card host; S5 the accessibility tree
      exposes the slotted heading and body text while the card contributes
      no role, name or state of its own; S8 one real click on the slotted
      button → the page observes exactly one activation (no duplicate, no
      interception). Verify failing — and if T008's by-construction
      transparency already turns these green (expected, research D3),
      record that instead and keep the assertions as regression tests
      (002 T013 precedent).

### GREEN

- [ ] T013 [US2] Close any gap S4/S5/S8 expose (a stray `tabindex`, role,
      `delegatesFocus` or event handling would be a defect of T008); the
      expected diff is empty — transparency is by construction (research
      D3). Record the outcome.

**Checkpoint**: S4, S5, S8 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of a pure container, M3 style axis proven to
live in token values alone.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T014 [US3] Extend the theming coverage following the 001/002 pattern
      (inject built token stylesheets): in `ki-card.browser.spec.ts`, S6
      declaring `data-ki-theme="material3"` restyles the card — assert
      surface, border and elevation resolve to material3 values with
      unchanged markup; create
      `packages/elements/browser-tests/ki-card.dark.browser.spec.ts`
      (marker `// @spec:009-ki-card`, the ki-button.dark precedent): S7
      `data-ki-color-scheme="dark"` under onmars resolves dark token
      values, plus axe in dark. Verify failing (tokens exist from Phase 2;
      failure must come from component CSS not consuming them — if Phase 3
      already turns these green, record that and keep them as regression
      tests).

### GREEN

- [ ] T015 [US3] Close any gap the S6/S7 tests expose in `ki-card.css`
      token consumption; `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S6, S7 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent composes a valid card (Priority: P3)

**Goal**: the generated contract answers when-to-use/when-NOT-to-use;
malformed attributes are safe (S3 already tested in US1, T006).

- [ ] T016 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use, all four slots, all five parts) for
      `ki-card`, and that `src/components.d.ts` includes the element with
      no props. Commit regenerated artifacts (never hand-edited, Art. I).
      Machine surfaces scope note: CEM and llms.txt arrive with
      017-agent-surfaces; the Zod catalog is Fase 3 (founder 2026-07-08) —
      docs.json + components.d.ts are the surfaces this feature
      regenerates.

**Checkpoint**: S3 covered (T006); generated docs surface committed.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T017 [P] Write
      `packages/elements/src/components/ki-card/ki-card.stories.tsx`
      following the ki-button stories pattern (tag string component, lazy
      loader registration): a Playground story (slots exposed via
      `parameters.slots`) plus composed-slot stories — full card
      (media image + `h2` header + body + `ki-button` footer), body-only,
      media+body — so the workshop demonstrates region collapse and
      composition.
- [ ] T018 [P] RTL render check (Art. IV, FR-012): assert in the browser
      suite (no S-ID — spec Assumptions exclude an RTL scenario) that under
      `dir="rtl"` regions still stack in the block direction and per-region
      padding mirrors via logical properties.
- [ ] T019 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes traceability (S1–S8 ↔
      tests), scenario families (form N/A justified in the spec table),
      tokens-sync, contrast, styles, deadcode, packaging, budgets, mock-doc
      and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004 (P) → T005 ─┤ (tokens before any component CSS)
             ├─ Phase 3 (US1): T006, T007 (P, RED) → T008 → T009 → T010, T011
             ├─ Phase 4 (US2): T012 (RED) → T013      (after US1 GREEN)
             ├─ Phase 5 (US3): T014 (RED) → T015      (after Phase 2 + T008)
             ├─ Phase 6 (US4): T016                    (after T009 + build)
             └─ Phase 7: T017, T018 (P) → T019        (last)
```

- Single writer on `feat/ki-card`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 (different token files); T006 ∥ T007
  (different test files); T017 ∥ T018 (different files). Everything else is
  ordered.
- RED before GREEN is NON-NEGOTIABLE: T006/T007 before T008; T012 before
  T013; T014 before T015. Each RED task records the failure reason (or the
  documented green-by-construction outcome for T012/T014).
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Machine surfaces: CEM and llms.txt arrive with 017-agent-surfaces; the
  Zod catalog is Fase 3 (founder 2026-07-08). This feature regenerates and
  commits `generated/docs.json` + `src/components.d.ts` only (T016).
- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control lives in T006 (exhaustive
  unit cases for the slot-emptiness predicate, the component's only pure
  logic). Wiring Stryker is a factory chore outside this spec.
- Form-participation family: N/A for ki-card — non-interactive grouping
  container, justified in spec.md's Scenario Family Coverage table; no
  ElementInternals test task exists on purpose (the template's T013-style
  form task does not apply).
- Keyboard/assistive families are covered through transparency scenarios
  (S4, S5 in T012), not through widget behavior: the card's keyboard
  contract is adding nothing.
- Every S-ID S1–S8 maps to a test task: S1/S2 → T006+T007, S3 → T006,
  S4/S5/S8 → T012, S6 → T014 (browser spec), S7 → T014 (dark spec)
  (CI-gated by check-traceability.sh).
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
