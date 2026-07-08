# Tasks: ki-list

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/016-ki-list/`

**Prerequisites**: plan.md, spec.md (gate-1 approval required before
implementation), research.md (D1–D6), contracts/list-contract.md.
data-model.md intentionally absent (plan.md Summary, the 009/010
precedent).

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. All test files carry the
file-level marker `// @spec:016-ki-list`; S-IDs appear on code lines (test
titles), never only in comments (check-traceability.sh). The
`ki-list-item.browser.spec.ts` file carries anatomy-only assertions and
defers every S-ID to the list suite (research D6, the 007 convention).

**Organization**: grouped by the spec's user stories. US1 = scan a
collection of similar items (P1, MVP), US2 = assistive technology &
keyboard transparency (P2), US3 = re-theming (P2), US4 = agent legibility &
robustness (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the LIST via the Nx generator (never by hand, Art. X):
      `pnpm exec nx g @kimen/nx-plugin:component ki-list --spec
      016-ki-list`. Creates
      `packages/elements/src/components/ki-list/{ki-list.tsx,ki-list.css,ki-list.spec.tsx}`
      and `packages/elements/browser-tests/ki-list.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Scaffold the ITEM via the Nx generator (second invocation — the
      composite is two elements, both generator-born, 007 precedent):
      `pnpm exec nx g @kimen/nx-plugin:component ki-list-item --spec
      016-ki-list`, then
      `pnpm exec nx run @kimen/elements:build && pnpm run format`. Creates
      the `ki-list-item/` component directory and
      `packages/elements/browser-tests/ki-list-item.browser.spec.ts` (this
      file will carry anatomy-only assertions and defer every S-ID scenario
      to the list suite — research D6, recorded in its header comment), and
      adds the second export to `packages/elements/src/index.ts`.
- [ ] T003 Verify the deterministic layer passes on the raw scaffolds:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer (blocks all component CSS)

**Purpose**: `--ki-list-*` / `--ki-list-item-*` must exist and ship in both
themes BEFORE any component CSS consumes them (research D4;
user-story-independent).

- [ ] T004 [P] Author `packages/tokens/tokens/component/list.tokens.json`:
      one file, two families (DTCG groups `ki.list.*` → `--ki-list-*` and
      nested `ki.list.item.*` → `--ki-list-item-*`, the kebab-join
      transform `button.tokens.json` proves). onmars values by inheritance:
      `ki.list.{bg,padding,gap}` (surface from the `ki.surface.s0–s5` ramp
      — which step is the onmars theme decision recorded here; geometry
      from `ki.space.*`; separation via `gap`, research D3) and
      `ki.list.item.{min-height,min-height-multiline,padding-inline,padding-block,gap,radius,divider-width,divider-color}`
      + `ki.list.item.{primary|secondary}-{font-size,line-height,font-weight,fg}`
      (min-heights: exactly TWO steps per FR-003's discriminator, from the
      `ki.space.*` ramp; text from `ki.typography.{size,line-height,weight}.*`
      roles; `primary-fg` → `ki.text.high-em`, `secondary-fg` →
      `ki.text.med-em`; `divider-width` → `{ki.space.zero}` — onmars
      separates by gap, not divider). 19 tokens. Every value a reference
      into the semantic/primitive layers, zero raw values.
      `padding-block` is the one declared addition over the spec's token
      enumeration (research D4) — keep it flagged in the PR for gate-1
      ratification.
- [ ] T005 [P] Author
      `packages/tokens/tokens/component/list.material3.tokens.json`:
      material3 overrides for the same names. The M3 divider axis lives
      HERE as plain values — hairline `divider-width` + `divider-color`
      from the semantic outline ramp, zero `ki.list.gap`, M3
      surface/container color, M3 one-line vs multi-line min-heights and
      type roles (FR-008: no attribute exists; research D3/D4).
- [ ] T006 Wire both list files into
      `packages/tokens/style-dictionary.config.mjs` (`LAYERS` +
      `MATERIAL3_LAYERS`, after the button entries), and extend the
      component-layer sweep in
      `packages/tokens/scripts/check-contrast.mjs` with the list text
      pairs — the sweep pattern is button-specific today
      (`COMPONENT_BG_PATTERN`, line ~170), so
      `--ki-list-item-primary-fg` and `--ki-list-item-secondary-fg`, each
      on `--ki-list-bg`, must join it at the standard 4.5:1 text minimum or
      the gate never sees the list (Art. X: a finding a rule could produce
      gets ruled, never left to review). Zero-match guard per pattern; unit
      cases in `check-contrast.test.mjs` if present. BATCH COORDINATION:
      009/010/011 extend the same two files on sibling branches —
      extensions are appends; whoever lands second rebases and re-runs the
      tokens gates. Rebuild (`pnpm --filter @kimen/tokens build`), run
      `pnpm --filter @kimen/tokens contrast` and
      `pnpm --filter @kimen/tokens size` (stylesheets stay in their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable).

**Checkpoint**: `--ki-list-*` / `--ki-list-item-*` resolve in onmars
(light+dark) and material3 (light+dark) stylesheets; token budgets and
contrast gate green.

---

## Phase 3: User Story 1 — Scan a collection of similar items (Priority: P1) 🎯 MVP

**Goal**: items in source order; four regions per item in reading order;
any subset renders cleanly with no reserved space; text wraps and grows.

**Independent Test**: quickstart.md §Manual validation 1–2 on a page with
only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T007 [P] [US1] Write mock-doc specs
      `packages/elements/src/components/ki-list/ki-list.spec.tsx` and
      `packages/elements/src/components/ki-list-item/ki-list-item.spec.tsx`
      (both marked `// @spec:016-ki-list`, composed pages via `newSpecPage`
      with both components where composition matters): list anatomy —
      `internals.role === 'list'` on the host, shadow `<div part="list">`
      wrapping the default slot, no other ARIA (research D1); item
      anatomy — `internals.role === 'listitem'`, parts
      `item` → `start` → `content` → `end` with primary above secondary
      inside `content` (research D2); S3 emptiness flags collapse
      `start`/`secondary`/`end` regions, including whitespace-only default
      and secondary slots counting as empty — exhaustive unit cases for the
      emptiness predicate (009 D1 reuse, the mutation-gap compensating
      control); the has-secondary flag switches the min-height state in
      BOTH directions (FR-003 discriminator, research D2); S4 an
      unrecognized `variant="two-line"` attribute changes nothing
      observable. Run `pnpm --filter @kimen/elements run test` and record
      the failure reason (components render scaffold placeholder).
- [ ] T008 [P] [US1] Write browser suite
      `packages/elements/browser-tests/ki-list.browser.spec.ts` (marker
      `// @spec:016-ki-list`), consuming the BUILT
      `../dist/components/ki-list.js` + `../dist/components/ki-list-item.js`:
      S1 three items ("Email", "Notifications", "Storage") stack as one
      vertical list in source order (geometry); S2 avatar leads, primary
      text sits above secondary, timestamp trails (geometry); S3 a
      primary-text-only item reserves no space for absent regions (its
      block size equals the one-line min-height; no phantom inline gaps);
      S10 a secondary text longer than the item's width wraps and grows the
      item past the multi-line min-height with no truncation and no
      internal scrolling (`scrollHeight === clientHeight`); axe zero
      violations across representative region subsets (all four,
      primary-only, start+primary, primary+secondary, primary+end). Also
      seed `ki-list-item.browser.spec.ts` with its anatomy-only assertions
      (parts exposed) and the header comment deferring all S-IDs to this
      suite (research D6). Verify failing.

### GREEN: implementation

- [ ] T009 [US1] Implement `ki-list` per research D1/D3 in
      `packages/elements/src/components/ki-list/ki-list.tsx`: plain
      `shadow: true`; `@AttachInternals()` with `internals.role = 'list'`
      (not form-associated); shadow root `<div part="list"><slot /></div>`;
      no props, no listeners, no tabindex, no other ARIA. CSS in
      `ki-list.css`: tokens-only via `--_ki-list-*` indirection on `:host`
      (002 pattern), logical properties only; surface/padding/gap from
      `--ki-list-*` on `part="list"` (column flex with
      `gap: var(--_ki-list-gap)`); the divider rule
      `::slotted(ki-list-item:not(:last-child)) { border-block-end: … }`
      from `--ki-list-item-divider-{width|color}` (research D3 — between
      items only, never after the last).
- [ ] T010 [US1] Implement `ki-list-item` per research D2 in
      `packages/elements/src/components/ki-list-item/ki-list-item.tsx`:
      plain `shadow: true`; `internals.role = 'listitem'`;
      `<div part="item">` holding always-rendered wrappers
      `part="start"`, `part="content"` (primary span with default slot
      above secondary span with `secondary` slot) and `part="end"`;
      `slotchange` + initial check set per-region has-content state
      (whitespace-filtering predicate for default and secondary slots, 009
      D1 reuse); no props, no listeners beyond slotchange, no tabindex, no
      other ARIA. CSS in `ki-list-item.css`: tokens-only via
      `--_ki-list-item-*` indirection, logical properties only; `item` =
      inline-axis flex with `gap`, `padding-inline`/`padding-block`,
      `radius`; `min-block-size` switches between the one-line and
      multi-line tokens on the has-secondary state (never on rendered
      wrapping — FR-003); empty `start`/`secondary`/`end` wrappers
      `display: none` (removes their gap contribution); primary/secondary
      text styled from their `--ki-list-item-{primary|secondary}-*` tokens;
      no truncation properties of any kind (research D5).
- [ ] T011 [US1] Complete JSDoc on both hosts, every slot and every part
      (description, when-to-use/when-NOT-to-use per
      contracts/list-contract.md §Agent-facing metadata — including "never
      for menus, selectable option lists or tabular data" and
      "ki-list-item only inside ki-list") — an undocumented member is a
      build failure (Art. I).

### Component quality gates (US1)

- [ ] T012 [US1] axe zero violations across region subsets (asserted in
      T008; run `pnpm --filter @kimen/elements run test-browser` green).
      No manual APG walkthrough: no APG widget pattern applies to a
      non-interactive list (plan.md Art. V, charter).
- [ ] T013 [US1] Add size-limit entries for BOTH components to
      `packages/elements/package.json` (marginal cost of
      `dist/components/ki-list.js` and `dist/components/ki-list-item.js`
      with `@stencil/core` ignored ≤ 9 KB each; worst case with runtime
      ≤ 25 KB — same caps as ki-button/ki-card) and run
      `pnpm --filter @kimen/elements run size` green (Art. IV, SC-005:
      the pair stays in low single-digit KB).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S4, S10 pass.

---

## Phase 4: User Story 2 — Understand the collection through assistive technology (Priority: P2)

**Goal**: accurate list semantics in the accessibility tree; zero added tab
stops; slotted controls operable exactly once.

**Independent Test**: quickstart.md §Manual validation 3.

### RED

- [ ] T014 [US2] Extend `ki-list.browser.spec.ts` with the semantics and
      transparency scenarios: S6 the COMPUTED accessibility tree of a
      three-item list exposes a list of exactly three items, each named by
      its text, with no interactive role contributed by list or items —
      this is the declared verification point for research D1's host-role
      architecture (the generic `part="list"` wrapper must not break list
      ownership; contingency `role="none"` on the wrapper is recorded in
      D1); S5 with a `ki-switch` slotted in an item's `end` slot as the
      page's only interactive element, Tab lands on the switch, skipping
      the list and its items; S11 keyboard activation of the focused switch
      toggles it exactly once (no duplicate, no interception). Verify
      failing — and if T009/T010's by-construction transparency already
      turns S5/S11 green (expected, 009 D3 posture), record that instead
      and keep the assertions as regression tests (009 T012 precedent);
      S6 must fail before T009/T010 land the internals roles.
- [ ] T015 [US2] Close any gap S5/S6/S11 expose (a stray `tabindex`, an
      interactive role, `delegatesFocus` or event handling would be a
      defect of T009/T010; an S6 count mismatch triggers the recorded D1
      contingency — `role="none"` on the internal wrapper — never an
      architecture change without re-entering the spec). Record the
      outcome.

**Checkpoint**: S5, S6, S11 green; full browser suite green.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming; the M3 divider axis proven to live in token
values alone; dark scheme and RTL honored.

**Independent Test**: quickstart.md §Manual validation 4–5.

### RED

- [ ] T016 [US3] Extend the theming coverage following the 001/002 pattern
      (inject built token stylesheets): in `ki-list.browser.spec.ts`, S7
      declaring `data-ki-theme="material3"` restyles the list — assert
      spacing, separation (the divider appears between items and not after
      the last) and primary/secondary text styles resolve to material3
      values with unchanged markup; S9 under `dir="rtl"` with an icon in
      `start` and a timestamp in `end`, the icon leads and the timestamp
      trails the item's text (geometry — logical properties, FR-010);
      create `packages/elements/browser-tests/ki-list.dark.browser.spec.ts`
      (marker `// @spec:016-ki-list`, the ki-button.dark precedent): S8
      `data-ki-color-scheme="dark"` under onmars resolves dark token
      values, plus axe in dark. Verify failing (tokens exist from Phase 2;
      failure must come from component CSS not consuming them — if Phase 3
      already turns these green, record that and keep them as regression
      tests).
- [ ] T017 [US3] Close any gap the S7/S8/S9 tests expose in `ki-list.css` /
      `ki-list-item.css` token consumption; `pnpm run lint:styles`
      (allowlist + logical properties) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S7, S8, S9 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent composes a valid list (Priority: P3)

**Goal**: the generated contract answers when-to-use/when-NOT-to-use for
both tags; malformed attributes are safe (S4 already tested in US1, T007).

- [ ] T018 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      (when-to-use/when-NOT-to-use — menus, selectable option lists,
      tabular data, navigation, lone items — all five slots and all five
      parts across the two tags) for `ki-list` AND `ki-list-item`, and that
      `src/components.d.ts` includes both elements with no props. Commit
      regenerated artifacts (never hand-edited, Art. I). Machine surfaces
      scope note: CEM and llms.txt arrive with 017-agent-surfaces; the Zod
      catalog is Fase 3 (founder 2026-07-08) — docs.json + components.d.ts
      are the surfaces this feature regenerates.

**Checkpoint**: S4 covered (T007); generated docs surface committed for
both tags.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T019 [P] Write
      `packages/elements/src/components/ki-list/ki-list.stories.tsx`
      following the ki-button/ki-card stories pattern (tag string
      component, lazy loader registration, both tags registered): a
      Playground story plus composed stories — a contacts list (avatar +
      primary + secondary + timestamp), a settings list (primary +
      trailing `ki-switch`), a text-only list, and a long-secondary story
      demonstrating wrap-and-grow — so the workshop demonstrates region
      collapse, composition and the divider-vs-gap theme axis.
- [ ] T020 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 — the
      only definition of done (Art. III). Includes traceability (S1–S11 ↔
      tests), scenario families (form N/A justified in the spec table),
      tokens-sync, contrast, styles, deadcode, packaging, budgets, mock-doc
      and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 ─┐
T004, T005 (P) → T006 ─┤ (tokens before any component CSS)
             ├─ Phase 3 (US1): T007, T008 (P, RED) → T009 → T010 → T011 → T012, T013
             ├─ Phase 4 (US2): T014 (RED) → T015      (after US1 GREEN)
             ├─ Phase 5 (US3): T016 (RED) → T017      (after Phase 2 + T009/T010)
             ├─ Phase 6 (US4): T018                    (after T011 + build)
             └─ Phase 7: T019 → T020                   (last)
```

- Single writer on `feat/ki-list`; no parallel worktrees needed.
- Parallel opportunities: T004 ∥ T005 (different token files); T007 ∥ T008
  (different test files); T019 is [P] against nothing pending. Everything
  else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T007/T008 before T009/T010; T014
  before T015; T016 before T017. Each RED task records the failure reason
  (or the documented green-by-construction outcome for T014/T016 where it
  applies).
- MVP scope: Phases 1–3 (US1). Phases 4–6 are incremental; Phase 7 closes.

## Notes

- Machine surfaces (standard batch note): CEM and llms.txt arrive with
  017-agent-surfaces; the Zod catalog is Fase 3 (founder 2026-07-08). This
  feature regenerates and commits `generated/docs.json` +
  `src/components.d.ts` only (T018).
- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001/002). Compensating control lives in T007 (exhaustive
  unit cases for the slot-emptiness predicate and the min-height
  discriminator, the composite's only pure logic). Wiring Stryker is a
  factory chore outside this spec.
- Form-participation family: N/A for ki-list — non-interactive data-display
  container, justified in spec.md's Scenario Family Coverage table; no
  ElementInternals form test task exists on purpose (the template's
  T013-style form task does not apply; `ElementInternals` appears here only
  as the role carrier, research D1).
- Keyboard/assistive families are covered through semantics and
  transparency scenarios (S5, S6, S11 in T014), not through widget
  behavior: the list's keyboard contract is adding nothing.
- Batch coordination (Art. X, tokens): T006 appends to
  `style-dictionary.config.mjs` and `check-contrast.mjs`, the same lines
  009/010/011 extend on sibling branches — whoever lands second rebases and
  re-runs the tokens gates before merge.
- Every S-ID S1–S11 maps to a test task: S1/S2/S10 → T008; S3/S4 →
  T007+T008 (S3) / T007 (S4); S5/S6/S11 → T014; S7/S9 → T016 (browser
  spec); S8 → T016 (dark spec) (CI-gated by check-traceability.sh).
- The `padding-block` token addition (research D4) is flagged in T004 for
  gate-1 ratification — a batched founder question, never an idle wait.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
