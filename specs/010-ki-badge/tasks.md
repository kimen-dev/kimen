# Tasks: ki-badge

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/010-ki-badge/`

**Prerequisites**: plan.md, spec.md (gate-1 approval required before
implementation), research.md (D1–D5), contracts/badge-contract.md.
data-model.md intentionally absent (plan.md Summary).

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. All three test files carry
the file-level marker `// @spec:010-ki-badge`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = read a status at
a glance (P1, MVP), US2 = stay out of the interaction path (P2), US3 =
re-theming (P2), US4 = agent legibility & robustness (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the component via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-badge --spec
      010-ki-badge`, then `pnpm exec nx run @kimen/elements:build && pnpm
      run format`. Creates
      `packages/elements/src/components/ki-badge/{ki-badge.tsx,ki-badge.css,ki-badge.spec.tsx}`
      and `packages/elements/browser-tests/ki-badge.browser.spec.ts` with
      traceability markers wired and the `src/index.ts` export added.
- [ ] T002 Verify the deterministic layer passes on the raw scaffold:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from the
      repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer (blocks all component CSS)

**Purpose**: `--ki-badge-*` must exist and ship in both themes BEFORE any
component CSS consumes it (research.md D2/D4; user-story-independent). This
is the first component-layer consumption of the info/warning ramps.

- [ ] T003 [P] Author `packages/tokens/tokens/component/badge.tokens.json`:
      the state-less onmars family per the contract — per size
      `ki.badge.{sm|md}.{height,padding-inline,radius,font-size,line-height}`
      (geometry from `ki.space.*`/`ki.radius.*`, typography from
      `ki.typography.size.*`/`.line-height.*`; sm on the caption scale, md
      on body-1, following the button size ladder), family-level
      `ki.badge.{font-family,font-weight,border-width}`, and per tone
      `ki.badge.{neutral|success|danger|info|warning}.{bg,fg,border}` with
      the soft-tint treatment (research D2): opaque
      `{ki.surface.{tone}-base-em}` backgrounds, `{ki.text.{tone}-high-em}`
      foregrounds, `{ki.outline.none}` borders; `neutral` resolves from the
      neutral ramp (`ki.surface.s*` + `ki.text.high-em`), NOT the
      brand-primary ramp — the exact ramp steps are the onmars theme
      decision recorded here and ratified by the contrast gate. Every value
      a reference into the semantic/primitive layers; no state segments, no
      focus-ring tokens (documented deviation, spec Art. VI echo).
- [ ] T004 [P] Author
      `packages/tokens/tokens/component/badge.material3.tokens.json`:
      material3 overrides for the same token names — M3 shape
      (`{ki.radius.round}`, the button.material3 precedent), M3
      border-width/border treatment, and tone colors mapped to M3 roles
      where they exist (danger ↔ the error family). Do NOT define
      info/warning colors here: material3 has no such roles and those tones
      resolve through the shared ramps inherited via the semantic cascade
      (001 contract; verified in the built CSS 2026-07-08, research D2).
- [ ] T005 Wire both badge files into
      `packages/tokens/style-dictionary.config.mjs` (`LAYERS` +
      `MATERIAL3_LAYERS`, after the button entries), and extend the
      component-layer sweep in
      `packages/tokens/scripts/check-contrast.mjs` with a second pattern
      for the badge — the existing `COMPONENT_BG_PATTERN` (line ~170) is
      button-specific, so
      `^--ki-badge-(?:neutral|success|danger|info|warning)-bg$` pairing
      each `…-bg` with its `…-fg` must join the sweep or the gate never
      sees the badge (Art. X: a finding a rule could produce gets ruled,
      never left to review). This is the FIRST contrast gating of the
      info/warning ramps in the two material3 contexts: if any pair fails
      AA, STOP — the fix changes 001-shipped semantic values and requires
      explicit founder sign-off at the merge gate (002 precedent; research
      D4). Rebuild (`pnpm --filter @kimen/tokens build`), run
      `pnpm --filter @kimen/tokens contrast` and
      `pnpm --filter @kimen/tokens size` (stylesheets stay in their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable).

**Checkpoint**: `--ki-badge-*` resolves in onmars (light+dark) and material3
(light+dark) stylesheets; all five tone pairs clear 4.5:1 in all four
contexts; token budgets and contrast gate green.

---

## Phase 3: User Story 1 — Read a status at a glance (Priority: P1) 🎯 MVP

**Goal**: the label renders inside a tone-styled pill; five tones × two
sizes, all token-resolved; unknown values fall back to defaults.

**Independent Test**: quickstart.md §Manual validation 1 on a page with only
US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T006 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-badge/ki-badge.spec.tsx`
      (marker `// @spec:010-ki-badge`): S1 shadow anatomy — the label
      slots into `<span part="badge">` and the host reflects the defaults
      (`tone="neutral"`, `size="md"`); structural robustness — unknown
      `tone`/`size` values leave the shadow markup unchanged and render
      without error (the computed-style half of S3 lives in T007, where
      styles actually resolve); no event listeners, no tabindex, no ARIA
      attributes in the rendered output (research D1: zero logic). Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T007 [P] [US1] Write browser suite
      `packages/elements/browser-tests/ki-badge.browser.spec.ts`
      (marker `// @spec:010-ki-badge`), consuming the BUILT
      `../dist/components/ki-badge.js`: S1 the label "Active" is visible
      inside a pill whose computed colors resolve from the neutral tone
      tokens; S2 a `tone="danger"` badge's computed background/foreground
      resolve from the danger tone token values; S3 a badge with
      `tone="banana"` (and one with `size="giant"`) computes identical
      colors and metrics to the default badge; sm vs md metrics differ per
      the size tokens; the long-label edge stays on one line and grows the
      pill (no S-ID — spec Assumptions); axe zero violations across the
      full tone × size matrix (10 renders, includes the first in-component
      info/warning surfaces). Verify failing.

### GREEN: implementation

- [ ] T008 [US1] Implement per research D1/D2/D3 in
      `packages/elements/src/components/ki-badge/ki-badge.tsx`: plain
      `shadow: true`; two typed reflected props (`tone` default `neutral`,
      `size` default `md`); render `<span part="badge"><slot/></span>`; no
      events, no listeners, no tabindex, no ARIA, not form-associated. CSS
      in `ki-badge.css`: tokens-only via `--_ki-badge-*` indirection on
      `:host` (002 pattern) defaulting to the neutral/md tokens;
      `:host([tone="success"])` … `:host([tone="warning"])` and
      `:host([size="sm"])` selectors override per VALID value only (unknown
      values match nothing → defaults, S3 by construction); pill =
      `inline-flex`, centered, `white-space: nowrap`, `block-size`/
      `padding-inline`/`border-radius`/typography/border from the
      indirection; logical properties only (stylelint).
- [ ] T009 [US1] Complete JSDoc on the host, both props, the slot and the
      part (description, default, when-to-use/when-NOT-to-use per
      contracts/badge-contract.md §Agent-facing metadata — including "never
      for counters/dots on navigation items", "announced feedback belongs
      to ki-alert" and "the text IS the meaning") — an undocumented member
      is a build failure (Art. I).

### Component quality gates (US1)

- [ ] T010 [US1] axe zero violations across the tone × size matrix
      (asserted in T007; run `pnpm --filter @kimen/elements run
      test-browser` green). No manual APG walkthrough: no APG pattern
      exists for a static badge (plan.md Art. V, charter).
- [ ] T011 [US1] Add both ki-badge size-limit entries to
      `packages/elements/package.json` (marginal cost of
      `dist/components/ki-badge.js` with `@stencil/core` ignored ≤ 9 KB;
      worst case with runtime ≤ 25 KB — same caps as ki-button/ki-card) and
      run `pnpm --filter @kimen/elements run size` green (Art. IV, SC-004).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S3 pass.

---

## Phase 4: User Story 2 — Stay out of the interaction path (Priority: P2)

**Goal**: behavioral transparency — zero tab stops, zero roles or states,
label as plain static text.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T012 [US2] Extend `ki-badge.browser.spec.ts` with transparency
      scenarios: S4 with a badge between two buttons, Tab from the first
      button lands on the second, never on the badge host; S5 the
      accessibility tree exposes the text "Active" as plain static text
      while the badge contributes no interactive role or state. Verify
      failing — and if T008's by-construction transparency already turns
      these green (expected, research D1), record that instead and keep the
      assertions as regression tests (002 T013 / 009 T012 precedent).

### GREEN

- [ ] T013 [US2] Close any gap S4/S5 expose (a stray `tabindex`, role or
      listener would be a defect of T008); the expected diff is empty —
      transparency is by construction (research D1). Record the outcome.

**Checkpoint**: S4, S5 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of the full tone × size matrix, including the
info/warning tones resolving through the inherited shared ramps under
material3.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T014 [US3] Extend the theming coverage following the 001/002 pattern
      (inject built token stylesheets): in `ki-badge.browser.spec.ts`, S6
      declaring `data-ki-theme="material3"` restyles the badge — assert
      colors, radius and metrics resolve to material3 values with unchanged
      markup, and that info/warning badges resolve (through the inherited
      shared ramps — the values exist, 001 cascade contract); create
      `packages/elements/browser-tests/ki-badge.dark.browser.spec.ts`
      (marker `// @spec:010-ki-badge`, the ki-button.dark precedent): S7
      `data-ki-color-scheme="dark"` under onmars resolves dark token
      values, plus axe in dark across the tone matrix. Verify failing
      (tokens exist from Phase 2; failure must come from component CSS not
      consuming them — if Phase 3 already turns these green, record that
      and keep them as regression tests).

### GREEN

- [ ] T015 [US3] Close any gap the S6/S7 tests expose in `ki-badge.css`
      token consumption; `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S6, S7 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent picks the right badge (Priority: P3)

**Goal**: malformed markup is safe (S3 already tested in US1, T007; S8
here), and the generated contract answers when-to-use/when-NOT-to-use.

### RED

- [ ] T016 [US4] Extend `ki-badge.browser.spec.ts`: S8 an empty
      `<ki-badge></ki-badge>` renders without error (no console error, page
      intact) and the accessibility tree exposes no content for the badge —
      no name, no text, no role. Verify failing — expected
      green-by-construction (research D1: an empty generic span exposes
      nothing); if so, record that and keep the assertions as regression
      tests; any gap is a defect of T008.

### Docs surface

- [ ] T017 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use, both props with values and defaults,
      the slot, the part) for `ki-badge`, and that `src/components.d.ts`
      includes the element with the `tone`/`size` unions. Commit
      regenerated artifacts (never hand-edited, Art. I). Machine surfaces
      scope note: CEM and llms.txt arrive with 017-agent-surfaces (in
      progress); the Zod catalog is Fase 3 (founder 2026-07-08) —
      docs.json + components.d.ts are the surfaces this feature
      regenerates.

**Checkpoint**: S3 (T007) and S8 covered; generated docs surface committed.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T018 [P] Write
      `packages/elements/src/components/ki-badge/ki-badge.stories.tsx`
      following the ki-button stories pattern (tag string component, lazy
      loader registration): a Playground story (tone/size controls, default
      slot exposed) plus a full tone × size matrix story — all five tones
      including info and warning at both sizes — so the workshop
      demonstrates the complete feedback vocabulary and both themes can be
      eyeballed.
- [ ] T019 [P] RTL render check (Art. IV, FR-010): assert in the browser
      suite (no S-ID — spec Assumptions exclude an RTL scenario: with only
      a default slot there is no start/end order) that under `dir="rtl"`
      the pill's inline padding mirrors via logical properties.
- [ ] T020 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes traceability (S1–S8 ↔
      tests), scenario families (form N/A justified in the spec table),
      tokens-sync, contrast (five tone pairs × four contexts), styles,
      deadcode, packaging, budgets, mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 ─┐
T003, T004 (P) → T005 ─┤ (tokens before any component CSS)
             ├─ Phase 3 (US1): T006, T007 (P, RED) → T008 → T009 → T010, T011
             ├─ Phase 4 (US2): T012 (RED) → T013      (after US1 GREEN)
             ├─ Phase 5 (US3): T014 (RED) → T015      (after Phase 2 + T008)
             ├─ Phase 6 (US4): T016 (RED) → T017      (T017 after T009 + build)
             └─ Phase 7: T018, T019 (P) → T020        (last)
```

- Single writer on `feat/ki-badge`; no parallel worktrees needed.
- Parallel opportunities: T003 ∥ T004 (different token files); T006 ∥ T007
  (different test files); T018 ∥ T019 (different files). Everything else is
  ordered.
- RED before GREEN is NON-NEGOTIABLE: T006/T007 before T008; T012 before
  T013; T014 before T015; T016 before its closure. Each RED task records
  the failure reason (or the documented green-by-construction outcome for
  T012/T014/T016).
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Machine surfaces: CEM and llms.txt arrive with 017-agent-surfaces (in
  progress); the Zod catalog is Fase 3 (founder 2026-07-08). This feature
  regenerates and commits `generated/docs.json` + `src/components.d.ts`
  only (T017).
- Semantic-layer status: the info/warning ramps EXIST in both themes' built
  CSS (material3 inherits them via the semantic cascade — verified
  2026-07-08, research D2), so no semantic-token task exists. The
  contingency is ruled in T005: an AA failure surfaced by the extended
  sweep changes 001-shipped values and requires founder sign-off at the
  merge gate (002 precedent).
- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002/009), and ki-badge ships zero pure logic — no
  predicate exists — so the 009-style compensating control has nothing to
  cover. Wiring Stryker is a factory chore outside this spec.
- Form-participation family: N/A for ki-badge — static, non-interactive
  descriptor, justified in spec.md's Scenario Family Coverage table; no
  ElementInternals test task exists on purpose.
- Keyboard/assistive families are covered through transparency scenarios
  (S4, S5 in T012), not through widget behavior: the badge's keyboard
  contract is adding nothing.
- No live region exists and none is tested for: runtime label changes are
  NOT announced (spec-approved; announced feedback is ki-alert, 011).
- Every S-ID S1–S8 maps to a test task: S1 → T006+T007, S2 → T007,
  S3 → T007, S4/S5 → T012, S6 → T014 (browser spec), S7 → T014 (dark spec),
  S8 → T016 (CI-gated by check-traceability.sh).
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
