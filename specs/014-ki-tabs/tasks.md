# Tasks: ki-tabs

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/014-ki-tabs/`

**Prerequisites**: plan.md, spec.md with S1–S18, research.md (D1–D10),
data-model.md,
contracts/tabs-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). RED tests are written
first and verified failing for the right reason. Every test file carries
the file-level marker `// @spec:014-ki-tabs`; S-IDs appear on code lines
(test titles), never only in comments (check-traceability.sh).

**Organization**: grouped by the spec's user stories. US1 = switch between
content views (P1, MVP), US2 = operate the tabs from the keyboard (P2),
US3 = re-theme without touching markup (P2), US4 = an agent composes tabs
correctly (P3).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Scaffold the GROUP via the Nx generator (never by hand,
      Art. X): `pnpm exec nx g @kimen/nx-plugin:component ki-tabs
      --spec 014-ki-tabs`. Creates
      `packages/elements/src/components/ki-tabs/{ki-tabs.tsx,ki-tabs.css,ki-tabs.spec.tsx}`
      and `packages/elements/browser-tests/ki-tabs.browser.spec.ts` with
      traceability markers wired, and adds the export to
      `packages/elements/src/index.ts`.
- [ ] T002 Scaffold the TAB via the Nx generator (second invocation — the
      composite is three elements, all generator-born, 007/016 precedent):
      `pnpm exec nx g @kimen/nx-plugin:component ki-tab --spec
      014-ki-tabs`. Creates the `ki-tab/` component directory and
      `packages/elements/browser-tests/ki-tab.browser.spec.ts` (this file
      will carry tab-anatomy assertions only and defer every S-ID
      scenario to the group suite — research D9), and adds the second
      export to `packages/elements/src/index.ts`.
- [ ] T003 Scaffold the PANEL via the Nx generator (third invocation):
      `pnpm exec nx g @kimen/nx-plugin:component ki-tab-panel --spec
      014-ki-tabs`, then
      `pnpm exec nx run @kimen/elements:build && pnpm run format`. Creates
      the `ki-tab-panel/` component directory and
      `packages/elements/browser-tests/ki-tab-panel.browser.spec.ts`
      (anatomy-only, deferring S-IDs to the group suite — research D9),
      and adds the third export to `packages/elements/src/index.ts`.
- [ ] T004 Verify the deterministic layer passes on the raw scaffolds:
      `pnpm run lint && pnpm run lint:styles && pnpm run typecheck` from
      the repo root (fail here = generator bug, fix the generator first).

---

## Phase 2: Foundational — component token layer + contrast-gate extension + reduced-motion command (blocks all component CSS and the S17 RED)

**Purpose**: `--ki-tabs-*`, `--ki-tab-*` and `--ki-tab-panel-*` must exist
and ship in both themes BEFORE any component CSS consumes them
(research.md D8), the contrast sweep must cover the new family in the SAME
change or the gate silently ignores it (Art. X), and the browser harness
must be able to emulate reduced motion for S17's determinism
(user-story-independent).

- [ ] T005 [P] Author `packages/tokens/tokens/component/tab.tokens.json`
      (theme-neutral schema, onmars by inheritance, modeled on
      `button.tokens.json`): structure tokens (single scale, NO size
      axis — `min-block-size` ≥ 24 px per Art. V, `padding-inline`,
      `gap`, `radius`, `font-size`, `font-weight`, `line-height`);
      selection × interaction label-ink matrix
      `--ki-tab-{selected|unselected}-{rest|hover|active|disabled}-{fg|bg}`
      (2 × 4 × 2 = 16; `fg` = label TEXT ink; `-bg` names the effective
      backdrop the label renders over — 007/008 convention, so a visually
      transparent tab references the surface it sits on, keeping the
      sweep measurable); indicator `--ki-tab-indicator-{size|color|radius}`
      (pure-CSS bar, no SVG); focus ring
      `--ki-tab-focus-ring-{color|width|offset}`. Every value a reference
      into the 001 semantic layer (`ki.surface.*`, `ki.text.*`,
      `ki.outline.*`, `ki.accent.*`, `ki.space.*`, `ki.radius.*`,
      `ki.typography.*`) — 29 tokens (data-model.md).
- [ ] T006 [P] Author `packages/tokens/tokens/component/tabs.tokens.json`:
      strip structure only — `--ki-tabs-gap` (inter-tab spacing) and
      `--ki-tabs-divider-{width|color}` (the block-end rule under the
      strip; the color references the semantic outline family) — 3
      theme-neutral tokens. NO material3 override file for the strip:
      structure and semantic references inherit through the base layer
      (research D8; an override arrives additively if M3 ever remaps the
      divider's semantic role).
- [ ] T007 [P] Author
      `packages/tokens/tokens/component/tab-panel.tokens.json`: panel
      surface — `--ki-tab-panel-padding-{block|inline}`,
      `--ki-tab-panel-bg` (MUST reference a semantic surface so slotted
      text stays on a swept surface — research D8) and
      `--ki-tab-panel-focus-ring-{color|width|offset}` (the visible panel
      is a focus stop, research D6) — 6 theme-neutral tokens. NO
      material3 override file (inherits through the base layer).
- [ ] T008 [P] Author
      `packages/tokens/tokens/component/tab.material3.tokens.json`:
      material3 overrides for the tab ink matrix and indicator — M3
      primary-tab mapping: selected label + indicator from the primary
      family, unselected label from the on-surface family, disabled cells
      from the disabled ramp — honoring the `-bg`-as-backdrop convention.
      The M3 primary/secondary distinction is expressed entirely in these
      cells, never as an attribute (FR-009; 002 shape precedent).
- [ ] T009 [P] Extend the contrast sweep in
      `packages/tokens/scripts/check-contrast.mjs` (the script's own
      contract mandates per-component extension): add the tab pattern
      `/^--ki-tab-(?:selected|unselected)-(?:rest|hover|active)-bg$/u`
      pairing each `-bg` with its `-fg` label ink at the **4.5:1 text
      minimum** (unlike 007's dot, the tab `fg` IS text — WCAG 1.4.3),
      plus ONE explicit non-text pair — `--ki-tab-indicator-color`
      against `--ki-tab-selected-rest-bg` — at a **3:1 per-pair minimum**
      (WCAG 1.4.11). Batch coordination: REUSE the per-pair-minimum +
      per-pattern zero-match-guard mechanism from 008 ki-switch / 007
      ki-radio-group if either has landed on the integration branch;
      otherwise introduce it here identically (008 research D8 is the
      normative description — the script currently has a single global
      `MIN_RATIO`). Keep disabled cells exempt and `--ki-tab-panel-bg`
      OUT of the sweep (no component-owned text ink — research D8). Add
      unit cases to `packages/tokens/scripts/check-contrast.test.mjs`
      (pattern matching, both minimums, zero-match guard).
- [ ] T010 Wire the four token files into
      `packages/tokens/style-dictionary.config.mjs` (append
      `tabs.tokens.json`, `tab.tokens.json` and `tab-panel.tokens.json`
      to `LAYERS`, `tab.material3.tokens.json` to `MATERIAL3_LAYERS`),
      rebuild (`pnpm --filter @kimen/tokens build`), run
      `pnpm --filter @kimen/tokens contrast` (extended sweep green: label
      pairs ≥ 4.5:1 and indicator pair ≥ 3:1 in every theme × scheme) and
      `pnpm --filter @kimen/tokens size` (stylesheets stay ≤ their 9 KB
      caps), and commit the regenerated `dist/css` (tokens-sync gate
      contract: generated, committed, diffable). Any semantic-layer delta
      the sweep forces gets declared for founder sign-off at the merge
      gate (002 precedent).
- [ ] T011 [P] Ensure the `emulateReducedMotion` browser command exists in
      `packages/elements/vitest.browser.config.ts` next to the existing
      `emulateColorScheme` (same `defineBrowserCommand` mechanism:
      `page.emulateMedia({ reducedMotion: 'reduce' | 'no-preference' |
      null })`). Batch coordination: this is 012 ki-dialog's T007 — if 012
      has landed on the integration branch, this task is a no-op
      verification; otherwise add it identically (012 research D8 is the
      normative description). S17's determinism depends on it (research
      D9; computed styles asserted, never animation frames).

**Checkpoint**: `--ki-tabs-*`, `--ki-tab-*` and `--ki-tab-panel-*` resolve
in onmars (light+dark) and material3 (light+dark) stylesheets; extended
contrast sweep, token budgets and tokens-sync green; reduced-motion
emulation available to the suite.

---

## Phase 3: User Story 1 — Switch between content views (Priority: P1) 🎯 MVP

**Goal**: the selection invariant across the composite: pointer selection,
value→{tab,panel} pairing with first-in-document-order duplicate
resolution, the fallback matrix (unknown/disabled/all-disabled), at most
one visible panel (exactly one when the selected tab has a pair), exactly
one `ki-change` per user-driven change, disabled-tab inertness, malformed
composition never fatal, and the APG tablist/tab/tabpanel exposure with
co-tree naming.

**Independent Test**: quickstart.md §Manual validation 1 and 3 on a page
with only US1 done.

### RED: failing tests first (MANDATORY, Art. III)

- [ ] T012 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-tab/ki-tab.spec.tsx`
      (marker `// @spec:014-ki-tabs`): anatomy assertions — purely
      presentational shadow with `part="tab"` wrapping `start`/default/
      `end` slots and `part="indicator"` with `aria-hidden="true"`, NO
      inner button or focusable element (the host is the `role="tab"`
      element — research D1); `internals.role === 'tab'` (016 D6
      convention for internals assertions); `internals.ariaSelected`
      derives from the reflected `selected` attribute and
      `internals.ariaDisabled` from `disabled`; `value` reflects with
      effective default `""`; `disabled` presence semantics
      (`disabled="false"` still disables — 006 D2 normalizer). Run
      `pnpm --filter @kimen/elements run test` and record the failure
      reason (component renders scaffold placeholder).
- [ ] T013 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-tab-panel/ki-tab-panel.spec.tsx`
      (marker `// @spec:014-ki-tabs`): anatomy — shadow
      `<div part="panel">` wrapping the default slot;
      `internals.role === 'tabpanel'`; `value` reflects with effective
      default `""`; the stylesheet carries the
      `:host([hidden]) { display: none !important; }` guard (research D7
      — the box-level proof lives in the browser suite). Verify failing.
- [ ] T014 [P] [US1] Write mock-doc spec
      `packages/elements/src/components/ki-tabs/ki-tabs.spec.tsx`
      (marker `// @spec:014-ki-tabs`, rendering ALL THREE components via
      `newSpecPage`): anatomy — shadow `role="tablist"` wrapper with
      `part="tablist"` containing the named tab slot, `aria-label`
      present only when `label` is provided, default slot outside the
      wrapper (research D1); auto-assignment — ki-tab children get
      `slot="tab"` stamped, ki-tab-panel children stay in the default
      slot; id generation only when absent (author ids never
      overwritten) and `aria-controls`/`aria-labelledby` pairing wires
      (research D2); exhaustive unit cases for the pure core —
      `resolveSelection` in `ki-tabs.selection.ts` (declared match /
      unknown value / disabled owner / no value / duplicate owners /
      all-disabled → none, × programmatic re-write), the pairing map
      (first-in-document-order ownership, orphans, duplicates, unset
      values as `""`), `nextSelectableIndex` in `ki-tabs.keyboard.ts`
      (next/previous × wrap at both ends × disabled runs × duplicate
      skipping × single-tab self-wrap × none-selectable),
      first/last-selectable, the arrow→direction map
      (ArrowLeft/ArrowRight × LTR/RTL + Home/End) and the boolean
      presence normalizer — the mutation-gap compensating control
      (research D4/D6/D9). Verify failing.
- [ ] T015 [P] [US1] Write the core-behavior section of the browser suite
      `packages/elements/browser-tests/ki-tabs.browser.spec.ts`
      (marker `// @spec:014-ki-tabs`), consuming the BUILT
      `../dist/components/ki-tabs.js` + `ki-tab.js` + `ki-tab-panel.js`
      and injecting `@kimen/tokens/css` (002/003 pattern): S1 clicking
      "Notifications" shows its panel, hides the "Email" panel, and
      exactly one composed `ki-change` with
      `detail.value === 'notifications'` is observed on the group with
      `tabs.value` already current; S2 a disabled tab never selects and
      emits nothing; clicking the already-selected tab emits nothing; S3
      a group declared with a value matching no tab renders with the
      first non-disabled tab selected and its panel shown; S12 a declared
      value on a disabled first tab resolves to the second tab; S18 a
      group whose every tab is disabled selects nothing and shows no
      panel; author-set `selected` on a tab is overwritten on first
      render (FR-003); programmatic `tabs.value = 'email'` updates the
      display silently; malformed composition — an orphan tab selects
      with no visible panel, an orphan panel stays hidden, a duplicate
      tab never selects (FR-014). Verify failing.
- [ ] T016 [P] [US1] Write the assistive-tech section of the browser
      suite: S7 the accessibility tree exposes a tab list named
      "Settings" containing tabs "Email" and "Notifications" named from
      their slotted labels, with the selected tab exposed as selected —
      and NO tabpanel inside the tab list (the containment guarantee,
      research D1); S8 the visible panel is exposed as a tab panel whose
      accessible name is "Email" (co-tree `aria-labelledby`); the
      disabled tab is exposed as unavailable; axe zero violations across
      selection × disabled states under the default theme (including
      `aria-required-children` on the tablist). Also: anatomy browser
      assertions go in
      `packages/elements/browser-tests/ki-tab.browser.spec.ts` (parts
      exposed; pointer target ≥ 24×24 px from the rendered box) and
      `packages/elements/browser-tests/ki-tab-panel.browser.spec.ts`
      (`panel` part exposed; a `hidden` panel renders NO box — the
      research D7 guard beats `:host { display }`), each with the marker
      + a header note deferring S-IDs to the group suite (research D9).
      Verify failing.

### GREEN: implementation

- [ ] T017 [US1] Implement `ki-tab` per research D1/D2/D8/D10 in
      `packages/elements/src/components/ki-tab/ki-tab.tsx` + `ki-tab.css`:
      presentational shadow —
      `<span part="tab"><slot name="start"/><slot/><slot name="end"/></span>`
      + `<span part="indicator" aria-hidden="true"></span>`, NO inner
      interactive element; `@AttachInternals()` with
      `internals.role = 'tab'`, `ariaSelected` synced from the reflected
      `selected` prop (output-only — only the group writes it) and
      `ariaDisabled` from `disabled` (reflected, presence-normalized);
      `value` reflected. CSS tokens-only via the `--_ki-tab-*`
      indirection on `:host` — base = unselected-rest, swapped under
      `:host([selected])`, `:host(:hover)`, `:host(:active)`,
      `:host([disabled])`; indicator rendered only under
      `:host([selected])` from `--ki-tab-indicator-*`; focus ring via
      `:host(:focus-visible)` from `--ki-tab-focus-ring-*`;
      `min-block-size` ≥ 24 px target; ZERO transitions (research D10);
      logical properties only.
- [ ] T018 [US1] Implement `ki-tab-panel` per research D1/D7 in
      `packages/elements/src/components/ki-tab-panel/ki-tab-panel.tsx` +
      `ki-tab-panel.css`: shadow `<div part="panel"><slot /></div>`;
      `@AttachInternals()` with `internals.role = 'tabpanel'`; `value`
      reflected. CSS tokens-only via `--_ki-tab-panel-*` indirection
      (padding, bg); the mandatory
      `:host([hidden]) { display: none !important; }` guard; focus ring
      via `:host(:focus-visible)` from `--ki-tab-panel-focus-ring-*`;
      logical properties only.
- [ ] T019 [US1] Implement the group's core per research D1–D5/D7 in
      `packages/elements/src/components/ki-tabs/ki-tabs.tsx` +
      `ki-tabs.css` + the pure modules: shadow
      `<div role="tablist" part="tablist" aria-label?><slot name="tab"/></div><slot/>`;
      discovery — default-slot `slotchange` as intake stamping
      `slot="tab"` on ki-tab children (idempotent re-stamp heals
      framework re-renders), named-slot `slotchange` rebuilding the tab
      roster, default-slot roster for panels, `MutationObserver` on tab
      `disabled` attributes (research D3); pairing map
      (first-in-document-order owns a value; orphans/duplicates inert —
      FR-014); `resolveSelection` fallback matrix driving the idempotent
      stamps — `selected` on the resolved tab only (author-set
      overwritten), roving `tabindex` (0/-1; none when no selection),
      `hidden` on every non-paired panel + `tabindex="0"` on the visible
      panel, generated ids + `aria-controls`/`aria-labelledby` wires
      (research D2/D4/D6/D7); `@Prop({ mutable: true }) value` as the
      resolved projection (silent programmatic writes); one `click`
      listener (composedPath → closest ki-tab; disabled/duplicate
      ignored) driving `select()`, which stamps then dispatches
      `@Event({ eventName: 'ki-change' })` as composed + bubbling with
      `detail: { value }` on the user-driven path only (research D5).
      Group CSS: strip gap + divider from `--_ki-tabs-*` indirection,
      tokens-only, logical properties only.
- [ ] T020 [US1] Complete JSDoc on every public member of ALL THREE
      elements (description, `@default`,
      when-to-use/when-NOT-to-use per contracts/tabs-contract.md
      §Agent-facing metadata — the view-switching vs value-selection vs
      page-navigation distinction, the "ki-tab/ki-tab-panel only inside
      ki-tabs" rule, and the "`selected` is output-only; set the group's
      `value`" warning) — an undocumented member is a build failure
      (Art. I).

### Component quality gates (US1)

- [ ] T021 [US1] Per-story gates: axe zero violations (asserted in T016;
      `pnpm --filter @kimen/elements run test-browser` green); add the
      composite-trio entries to the `size-limit` array in
      `packages/elements/package.json` (marginal: paths
      `dist/components/ki-tabs.js` + `dist/components/ki-tab.js` +
      `dist/components/ki-tab-panel.js` ignoring `@stencil/core`, limit
      9 KB — SC-005's single-digit budget is for the TRIO; worst case:
      same paths with runtime, limit 25 KB — mirror the ki-button entry
      style, which stays) and run
      `pnpm --filter @kimen/elements run size`; rebuild and commit the
      regenerated `generated/docs.json` + `src/components.d.ts` (Art. I —
      docs.json is today's machine surface). Nota superficies máquina
      (estándar del batch): CEM/llms.txt llegan con 017-agent-surfaces
      (en curso); catálogo Zod diferido a Fase 3 (decisión founder
      2026-07-08).

**Checkpoint**: US1 green in mock-doc + browser suites; S1–S3, S7, S8,
S12, S18 pass.

---

## Phase 4: User Story 2 — Operate the tabs from the keyboard (Priority: P2)

**Goal**: the full APG Tabs keyboard contract owned by the group with
AUTOMATIC ACTIVATION: one tab stop (the selected tab), arrows with wrap,
disabled/duplicate skipping and writing-direction mapping that select as
they focus, Home/End, Tab exit into the visible panel (which is focusable
even without focusable content), no tab stop when everything is disabled.

**Independent Test**: quickstart.md §Manual validation 2.

### RED

- [ ] T022 [US2] Extend the browser suite with the keyboard scenarios
      (real Tab/arrow/Home/End key presses): S4 with "Email" selected and
      focused, ArrowRight focuses AND selects "Notifications" (visible
      focus ring computed from `--ki-tab-focus-ring-*`), shows its panel,
      and fires exactly one `ki-change` (automatic activation — research
      D6); S13 from the last tab, ArrowRight wraps past a disabled first
      tab to the next selectable one; S5 End jumps to the last
      non-disabled tab, selecting it; S14 Home jumps back to the first;
      S6 Tab from the focused selected tab skips the remaining tabs and
      lands in the visible panel (single strip tab stop); S15 a panel
      with no focusable content receives focus ITSELF (host `tabindex="0"`
      + visible panel focus ring); S16 in a `dir="rtl"` document,
      ArrowLeft moves to the NEXT tab (writing-direction mapping);
      re-assert S18's no-tab-stop from the keyboard side (Tab skips the
      all-disabled strip). Verify failing.

### GREEN

- [ ] T023 [US2] Implement the keyboard model per research D6 in
      `ki-tabs.tsx` + `ki-tabs.keyboard.ts`: roving tab stop already
      stamped by resolution (T019) — verify the selected-tab-is-the-stop
      invariant holds through navigation; one `keydown` listener on the
      host (key events bubble from the tab hosts through the light tree)
      mapping ArrowRight/ArrowLeft via `host.matches(':dir(rtl)')` plus
      Home/End, `preventDefault()`, target from pure
      `nextSelectableIndex`/first/last-selectable (wrap + skip disabled
      AND duplicates), then `select(target); target.focus()` — automatic
      activation through the exact same path as pointer activation (one
      code path, one `ki-change`). ArrowUp/ArrowDown and Enter/Space NOT
      implemented (Art. II — horizontal-only v1; redundant under
      automatic activation).

### Component quality gates (US2)

- [ ] T024 [US2] Full mock-doc + browser suites green
      (`pnpm --filter @kimen/elements run test && pnpm --filter
      @kimen/elements run test-browser`); spot-check
      `bash scripts/gates/check-traceability.sh specs/014-ki-tabs`; axe
      re-run including focus states; if the public surface changed,
      rebuild and re-commit `generated/docs.json`.

**Checkpoint**: S4–S6, S13–S16 green; the composite passes both behavioral
stories end to end.

---

## Phase 5: User Story 3 — Re-theme without touching markup (Priority: P2)

**Goal**: one-step re-theming of strip, tabs, indicator and panel across
the full selection × interaction matrix, forced dark scheme, RTL strip
order, reduced-motion guarantee measured under real emulation.

**Independent Test**: quickstart.md §Manual validation 4.

### RED

- [ ] T025 [US3] Extend the theming coverage following the 001/002/003
      pattern (inject built token stylesheets): S9 declaring
      `data-ki-theme="material3"` restyles the group — assert resolved
      `--ki-tab-*` values change across selected/unselected ×
      rest/disabled states, the indicator resolves the material3 value,
      and `--ki-tabs-*`/`--ki-tab-panel-*` structure resolves (SC-003);
      S11 under `dir="rtl"` the "Email" tab leads from the right and the
      strip flows right to left (compare inline positions of the tab
      hosts; `start`/`end` slot order follows); S17 under
      `emulateReducedMotion('reduce')` (T011 command) selecting
      "Notifications" shows its panel instantly with NO
      transition/animation computed on panel or indicator (v1 ships zero
      motion — research D10; computed styles asserted, never animation
      frames); S10 forced dark under onmars resolves dark ink values, in
      `packages/elements/browser-tests/ki-tabs.dark.browser.spec.ts`
      with its own `// @spec:014-ki-tabs` marker (the vitest config
      routes `*.dark.browser.spec.ts` to the dark-emulating instance,
      002 split). Verify failing (tokens exist from Phase 2; failure must
      come from component CSS not consuming them — if earlier phases
      already turn any of these green, record that instead and keep the
      assertions as regression tests).

### GREEN

- [ ] T026 [US3] Close any gap the S9/S10/S11/S17 tests expose in
      `ki-tabs.css` / `ki-tab.css` / `ki-tab-panel.css` token consumption
      (every ink through the `--_ki-*` indirection → component tokens,
      logical properties only, zero transitions/animations — research
      D10's declared discipline: any future motion goes inside
      `@media (prefers-reduced-motion: no-preference)`);
      `pnpm run lint:styles` (allowlist) and
      `git diff --exit-code -- packages/tokens/dist/css` stay green.

**Checkpoint**: S9–S11, S17 green; stylelint token allowlist green.

---

## Phase 6: User Story 4 — An agent composes tabs correctly (Priority: P3)

**Goal**: the generated contract answers when-to-use (view switching vs
value selection vs navigation) and documents `selected` as output-only;
malformed values are safe (S3 already tested in US1).

- [ ] T027 [US4] Verify the regenerated
      `packages/elements/generated/docs.json` carries the JSDoc contract
      for every member of ALL THREE tags (when-to-use/when-NOT-to-use
      with the view-switching rule, ki-radio-group/links/stepper
      redirections, the "children only inside ki-tabs" rule, the
      output-only `selected` warning, defaults incl. the `""` effective
      values and the `ki-change` `detail.value` payload), and that
      `src/components.d.ts` exposes the three typed surfaces with NO
      leaked coordination API (research D1/D2 — the stamped-attribute
      channel and the internal named slot must not appear as public
      surface). Commit regenerated artifacts (never hand-edited, Art. I).
      Nota superficies máquina: CEM/llms.txt llegan con
      017-agent-surfaces (en curso); catálogo Zod diferido a Fase 3
      (decisión founder 2026-07-08) — this task's scope is docs.json
      completeness only.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T028 [P] Write
      `packages/elements/src/components/ki-tabs/ki-tabs.stories.tsx`
      following the ki-button.stories.tsx pattern (tag string component,
      lazy loader registration — registering ALL THREE tags):
      `Playground` (group props as controls over a three-tab composite
      with panels) plus `States` (selected/unselected/hover-hint side by
      side), `DisabledTab`, `AllDisabled`, `WithIcons` (`start` slot),
      `Fallback` (unknown `value` demo), `RTL`. No standalone
      ki-tab/ki-tab-panel stories (valid only inside a group — contract)
      and no axis for size/variant/tone/orientation — they do not exist
      in v1.
- [ ] T029 [P] RTL render check in Storybook/manual page (`dir="rtl"`:
      strip order, `start`/`end` slots, indicator alignment,
      arrow-direction sanity — S11/S16 automated in T025/T022) and the
      reduced-motion manual check (emulate
      `prefers-reduced-motion: reduce`, switch tabs: instant — S17
      automated in T025; this pass is the human eyeball on top).
- [ ] T030 **Manual APG walkthrough — REQUIRED (spec constitutional
      surface: first tablist/automatic-activation composite = new
      interaction pattern, Art. V)**. Against the built Storybook/manual
      page, with the APG Tabs pattern in hand, document in the PR:
      Tab/Shift+Tab entry and exit (selected tab on entry; into the
      visible panel on exit; strip skipped when all tabs disabled),
      ArrowLeft/ArrowRight with wrap and disabled skipping in LTR AND
      RTL, Home/End, automatic activation while arrowing, AND the
      screen-reader outcomes automation cannot pin — three NAMED
      verification points (research D1/D10): (1) **"tab, n of N,
      selected"** — position-in-set computed through the shadow tablist
      wrapper containing slotted hosts; contingency if a target
      browser/AT pair mis-announces: group-managed
      `aria-posinset`/`aria-setsize` on the tab hosts, with a failing
      browser test first (Art. III); (2) the **panel announced as a
      tabpanel named after its tab** on entry; (3) **sane announcements
      during automatic activation** (no double-speak as selection follows
      focus).
- [ ] T031 Run `pnpm exec nx run-many -t size` — composite trio marginal
      ≤ 9 KB gzipped, worst case ≤ 25 KB, existing entries unaffected,
      token stylesheets within caps (Art. IV budget, SC-005).
- [ ] T032 Closing gate: `bash scripts/gates/gates-suite.sh` exits 0 —
      the only definition of done (Art. III). Includes constitution,
      traceability (S1–S18 ↔ tests), tokens-sync, contrast (extended tab
      sweep), lint, styles, typecheck, deadcode (knip sees no dead
      export — all three new exports consumed), packaging, budgets,
      mock-doc and real-browser suites.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 → T004 ─┐
T005, T006, T007, T008, T009, T011 (P) → T010 ─┤ (tokens + extended sweep + emulation before component CSS / S17 RED)
             ├─ Phase 3 (US1): T012–T016 (P, RED) → T017 → T018 → T019 → T020 → T021
             ├─ Phase 4 (US2): T022 (RED) → T023 → T024    (after US1 GREEN — navigation rides the selection pipeline)
             ├─ Phase 5 (US3): T025 (RED) → T026            (after Phase 2 + T017/T018/T019; T025's S17 needs T011)
             └─ Phase 7: T028, T029 (P) → T030 → T031 → T032   (last; T027 [US4] after T020 + build)
```

- Single writer on `feat/ki-tabs`; no parallel worktrees needed.
- Parallel opportunities: T005 ∥ T006 ∥ T007 ∥ T008 ∥ T009 ∥ T011
  (different files); T012 ∥ T013 ∥ T014 ∥ T015 ∥ T016 (different
  files/sections written independently, merged into the test files
  before running); T028 ∥ T029. Everything else is ordered.
- RED before GREEN is NON-NEGOTIABLE: T012–T016 before T017/T018/T019;
  T022 before T023; T025 before T026. Each RED task records the failure
  reason.
- MVP scope: Phases 1–3 (US1). Phase 4 completes the interaction pair;
  Phases 5–6 are incremental; Phase 7 closes (T030's walkthrough is a
  hard requirement, not polish-optional).

## Notes

- Mutation gate (template task): N/A in this feature — Stryker is not yet
  wired into gates-suite.sh (factory gap declared in plan.md Art. III,
  inherited from 001–016). Compensating control lives in T014/T019/T023
  (pure `ki-tabs.selection.ts` + `ki-tabs.keyboard.ts` logic —
  `resolveSelection`, the pairing map, `nextSelectableIndex`,
  first/last-selectable, the arrow/direction map, the presence
  normalizer — with exhaustive unit cases per branch). Wiring Stryker is
  a factory chore outside this spec.
- Superficies máquina (estándar del batch): docs.json es la superficie
  máquina que existe hoy y se regenera/commitea en T021/T024/T027;
  CEM/llms.txt llegan con 017-agent-surfaces (en curso); catálogo Zod
  diferido a Fase 3 (decisión founder 2026-07-08).
- Every S-ID S1–S18 maps to a test task (CI-gated by
  check-traceability.sh):
  - S1, S2, S3, S12, S18 → T015
  - S7, S8 → T016
  - S4, S5, S6, S13, S14, S15, S16 → T022
  - S9, S11, S17 → T025 (S10 → T025, dark split file)
- FR coverage: FR-001 → T012/T013/T014/T017–T019; FR-002 →
  T014(resolveSelection)/T015(S3,S12,S18)/T019; FR-003 →
  T015(selected-overwrite)/T012(ariaSelected)/T019; FR-004 →
  T015(S1, at-most-one-visible, orphan/duplicate)/T019/T022(S4); FR-005 →
  T022(S4)/T023; FR-006 → T022(S5,S6,S13,S14,S15,S16,S18)/T023; FR-007 →
  T015(S2)/T016/T012; FR-008 → T016(S7,S8)/T014/T017/T019; FR-009 →
  T005–T010/T025(S9,S10)/T026; FR-010 → T017/T026; FR-011 →
  T025(S17)/T026/T029; FR-012 → T012/T017/T025(S11); FR-013 →
  T012/T013/T014(parts)/T016; FR-014 → T014(pairing)/T015/T019; FR-015 →
  T020/T027.
- Gate extension (Art. X): the contrast sweep MUST cover `--ki-tab-*`
  in the same change that ships the tokens (T009/T010, research D8) — an
  unextended sweep silently ignores the component. Batch coordination
  with 008's per-pair-minimum mechanism is annotated in T009; batch
  coordination with 012's `emulateReducedMotion` command is annotated in
  T011.
- Bug found mid-implementation → failing test reproducing it FIRST.
- Commit after each task or logical group; formatting is never reviewed
  (Art. X).
