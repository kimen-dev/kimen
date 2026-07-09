# Implementation Plan: ki-tabs

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-tabs` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-ki-tabs/spec.md`
(gate-1 review in progress on `feat/fase2-specs`; implementation is blocked
by the pre-implement gate until the sha-stamped `.approved` marker exists).

## Summary

First APG Tabs composite in the repo and the first `tablist` +
automatic-activation keyboard pattern: `<ki-tabs>` orchestrates
`<ki-tab>` and `<ki-tab-panel>` light-DOM children paired by a shared
`value`, per the APG Tabs pattern the spec approved. Technical approach:
because both child hosts live in the consumer's light DOM, every IDREF the
pattern needs (`aria-controls` tab→panel, `aria-labelledby` panel→tab) is
same-tree — so the roles live on the HOSTS (`internals.role`, 016 D1
mechanism: `tab` on ki-tab, `tabpanel` on ki-tab-panel), the 005-style
shadow mirror is rejected as unnecessary, and the children are almost
behavior-free (presentational shadow, parts and slots only). The one
containment problem the frozen single-default-slot API poses — the
tablist must own the tabs and NOT the panels — is solved by a shadow
`role="tablist"` wrapper around a named slot into which the group
auto-assigns its `ki-tab` children (a group-stamped `slot="tab"`, managed
output like `selected`/`tabindex`/`hidden`, never authored). The group
owns everything else (007 discipline): value→{tab,panel} pairing with
first-in-document-order duplicate resolution, selection resolution with
the spec's fallback matrix (declared/unknown/disabled/all-disabled),
roving tabindex on the tab hosts, automatic activation (arrows/Home/End
select as they focus, RTL-mapped per event), `hidden` stamping on panels
(with the `:host([hidden])` display guard), co-tree id/ARIA wiring, and
exactly one `ki-change` (composed, bubbling, `detail.value`) per
user-driven change. The manual APG walkthrough is REQUIRED (spec
constitutional surface — new interaction pattern), with the
position-in-set announcement through the shadow tablist wrapper as its
first named verification point. Details and rationales in
[research.md](./research.md) (D1–D10); API surface in
[contracts/tabs-contract.md](./contracts/tabs-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-tabs/`,
`src/components/ki-tab/` and `src/components/ki-tab-panel/` + real-browser
suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002/003 pattern (dark
split file routed by the existing config; reduced-motion via the
`emulateReducedMotion` browser command — 012 T007 batch coordination).
Traceability markers `// @spec:014-ki-tabs` with S-IDs on code lines
(test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: composite component — THREE elements in one feature
(`packages/elements`) + component token layer (`packages/tokens`, three
per-tag families) + one deterministic-gate extension
(`packages/tokens/scripts/check-contrast.mjs`, research D8).

**Performance Goals**: size-limit — marginal cost of the composite TRIO
(`dist/components/ki-tabs.js` + `dist/components/ki-tab.js` +
`dist/components/ki-tab-panel.js`, runtime excluded) ≤ 9 KB gzipped
(SC-005 single-digit budget for the three combined); worst case trio +
Stencil runtime ≤ 25 KB; token stylesheets stay within their existing
9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (tab labels and panel
content are slotted; the tablist name is the `label` attribute rendered
into `aria-label` verbatim), zero transitions/animations in v1 (research
D10 — reduced motion by construction), scaffold via Nx generator (never by
hand — THREE invocations, one per element), single writer on
`feat/ki-tabs`.

**Scale/Scope**: three components, 18 approved scenarios (S1–S18), 38
component tokens per theme (3 `--ki-tabs-*` + 29 `--ki-tab-*` + 6
`--ki-tab-panel-*`, research D8), one gate extension (contrast sweep) and
possibly one browser-command addition (`emulateReducedMotion`, if 012 has
not landed first), no removals — purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiTabs` (2 props, 1 event, 1 slot, 1 part), `KiTab` (2 props + the
  output-only reflected `selected`, 3 slots, 2 parts) and `KiTabPanel`
  (1 prop, 1 slot, 1 part) carries complete JSDoc including
  when-to-use/when-NOT-to-use — the view-switching vs value-selection vs
  page-navigation distinction, the "ki-tab/ki-tab-panel are valid only
  inside ki-tabs" rule, and the "`selected` is output-only; set the
  group's `value`" warning (FR-015, FR-003); `generated/docs.json` and
  `src/components.d.ts` regenerate on build and are committed — docs.json
  is the machine surface that exists today. CEM and llms.txt arrive with
  017-agent-surfaces (in progress); the Zod catalog is deferred to Fase 3
  (founder decision 2026-07-08). This plan's obligation is that the JSDoc
  contract is complete so those surfaces regenerate from it without
  rework. The group-managed child attributes (`slot="tab"`, `tabindex`,
  `hidden`, generated ids, `aria-controls`/`aria-labelledby`) are
  documented as component output, never authoring surface (research
  D1/D2). **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/014-ki-tabs/feature.feature` S1–S18 (gate-1 review in progress;
  the pre-implement gate blocks execution until the `.approved` marker is
  recorded); all five families covered or N/A-justified (form
  participation N/A per the spec table); nothing in this plan exceeds the
  approved scenarios — no vertical orientation, no manual-activation
  opt-in, no ArrowUp/Down or Enter/Space handling, no overflow/scroll
  machinery, no lazy panels, no size/variant/tone axes (the M3
  primary/secondary styles are theme token decisions, FR-009). **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc specs + browser suite written against S1–S18 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, the `ki-change` event, the
  accessibility tree, resolved styles). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001–016, tracked
  as a factory chore); compensating control: the pure logic —
  `resolveSelection` in `ki-tabs.selection.ts`, `nextSelectableIndex` +
  first/last selectable + the arrow/direction map in
  `ki-tabs.keyboard.ts` — lives in small pure functions with exhaustive
  unit cases per branch (research D4/D6/D9). Done = `gates-suite.sh`
  exit 0. **PASS (with declared factory gap, unchanged from the batch)**
- **Art. IV — Web standards & lightness**: the pattern's semantics are
  plain platform surfaces — `internals.role` defaults on the hosts (016
  D1), same-tree IDREF attributes, the native `hidden` attribute for
  panel visibility (with the one-declaration `:host([hidden])` guard,
  research D7), native focus on the tab hosts; hand-rolled machinery
  exists ONLY where ARIA widgets provide no native control (there is no
  native tabs element): roving tabindex, automatic activation, pairing
  (research D1's framing). Logical properties only; no new runtime
  dependency ("none"); budgets as in Technical Context — trio marginal
  ≤ 9 KB gzipped. Not form-associated (spec: form family N/A). **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  full APG Tabs keyboard path owned by the group (single tab stop, arrows
  wrap + skip disabled + follow writing direction with automatic
  activation, Home/End, Tab exit into the visible panel — research D6);
  visible focus ring on tab hosts and the panel from
  `--ki-tab-focus-ring-*` / `--ki-tab-panel-focus-ring-*` under
  `:focus-visible` (research D10); ≥ 24 px targets via
  `--ki-tab-min-block-size` + padding; selected/disabled exposure via
  internals (S7, S2); zero motion in v1 → reduced motion by construction,
  measured under emulation (S17). **Manual APG walkthrough REQUIRED** —
  first tablist/automatic-activation composite, flagged by the spec's
  constitutional surface; scheduled as an explicit task with three named
  verification points (position-in-set through the shadow tablist wrapper;
  panel named after its tab; sane automatic-activation announcements) and
  `aria-posinset`/`aria-setsize` as the recorded contingency (research
  D1/D10). axe across selection × disabled × theme × scheme as the floor.
  **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces three
  per-tag families — `--ki-tabs-*` (strip gap + divider), `--ki-tab-*`
  (structure; selected/unselected × rest/hover/active/disabled × fg/bg
  label matrix; indicator size/color/radius; focus ring) and
  `--ki-tab-panel-*` (padding, semantic-surface bg, focus ring) — 38
  tokens per theme resolving from the 001 semantic layer; zero hardcoded
  visual values (the indicator is pure CSS drawn from tokens); the M3
  primary/secondary tab styles are theme token decisions, never
  attributes. Customization ladder tokens → `::part(tablist)` /
  `::part(tab)` / `::part(indicator)` / `::part(panel)` → slotted
  labels/content. Contrast sweep extended: label pairs at 4.5:1 (text) +
  the indicator pair at the 1.4.11 non-text 3:1 minimum (research D8).
  **PASS**
- **Art. VII — Simplicity & anti-abstraction**: three components ONLY
  because the spec's FR-001 defines the composite; children are data +
  presentation, the group is the single orchestrator — no "composite
  base" abstraction speculated (the extraction question stays deferred as
  recorded since 006). Sibling decisions are CITED and reused, not
  re-derived (research header list: 016 D1 internals roles, 007 D3/D6
  roster + keyboard, 005 D1 constraint analysis, 012 event + emulation
  conventions, 013 D6 motion posture, 002 indirection, 008 D8 sweep
  mechanism). No speculative surface (no orientation/size/variant, no
  Enter/Space/ArrowUp/Down, no overflow, no lazy mounting, no
  closable/badge tabs). Native mechanisms wherever they exist (`hidden`,
  internals roles, name-from-content); hand-rolled only where no native
  tabs machinery exists. **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-tabs`, `ki-tab`, `ki-tab-panel` (props/event/slots/parts/tokens per
  contract); no existing API changes, no removals. Packaging validated by
  the existing publint/attw gate; three new per-component exports follow
  the established build output. The group-managed child-attribute channel
  (incl. the auto-assigned `slot="tab"`) is explicitly non-API (research
  D1) so it can change without SemVer impact. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on all three CSS files, ESLint/tsc strict, knip on exports,
  size-limit budgets, tokens-sync, traceability on S-IDs, scenario
  families). One rule gap is KNOWN IN ADVANCE and closed in this feature:
  the contrast sweep's per-component pattern list does not match
  `--ki-tab-*` — extended (text pairs at 4.5:1, indicator per-pair 3:1,
  per-pattern zero-match guard) in the same change that adds the tokens,
  never left to review (research D8). Scaffolding runs the generator
  THREE times (once per element) so all components carry identical gate
  wiring (Art. X reproducibility). **PASS**
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: the
  implement phase runs as an unattended loop in the Art. XI sandbox
  (`sandbox/loop.sh`, credential-free, egress allowlist) or as a
  supervised local session without permission bypass; no new credential
  surface. **PASS**

**Definition of done (Art. III)**: done is exclusively the deterministic gates
exiting 0 (`bash scripts/gates/gates-suite.sh`: constitution, traceability,
lint, typecheck, build, tests, and per-surface gates). Never self-assessed,
by agent or human.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): three new elements. `ki-tabs` (attributes:
  `value`, `label`; event: `ki-change` with the selected value in `detail`;
  slot: default for tab and panel children; part: `tablist`). `ki-tab`
  (attributes: `value`, `disabled`, reflected managed state `selected`;
  slots: default, `start`, `end`; parts: `tab`, `indicator`). `ki-tab-panel`
  (attribute: `value`; slot: default; part: `panel`). Component token
  families per published tag: `--ki-tabs-*` (strip/tablist), `--ki-tab-*`
  (tab metrics, indicator and states) and `--ki-tab-panel-*` (panel).
  Additive change; catalog and llms.txt regenerate with the three new
  entries.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost for the
  three elements combined; no new runtime dependency ("none").
- **Accessibility** (Art. V): APG Tabs pattern with automatic activation —
  a NEW interaction pattern in the repo → manual APG walkthrough required
  and documented in the PR. axe zero violations across selection ×
  disabled × theme × scheme states.
- **Tokens** (Art. VI): new component token families, one per published tag:
  `--ki-tabs-*` (strip/tablist metrics and layout), `--ki-tab-*` (tab
  metrics, typography, indicator size/color, per-state fg/bg/border, focus
  ring) and `--ki-tab-panel-*` (panel spacing and surface), all resolving
  from the semantic layer; both shipped themes
  (onmars, material3) get component token files. No semantic-layer delta
  anticipated; if the contrast gate surfaces one at implementation it will
  be declared for founder sign-off at the merge gate, as in 002.
- **Catalog/agent legibility** (Art. I): when-to-use — switching between
  peer content views inside the same page context, where exactly one view
  is visible at a time and switching loses no data. When NOT to use —
  choosing a value inside a form (use ki-radio-group, or a future segmented
  control), navigating between pages or routes (use links), sequential
  step-by-step flows (a future stepper). The generated contract documents
  `selected` on `ki-tab` as output-only (the group's `value` is the single
  source of truth), so agents never author it.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/tabs-contract.md (all three elements in one contract — the
sub-components belong to the parent's spec per the batch charter, 007
precedent); budget → the trio size-limit entries (Technical Context);
accessibility → Art. V line + browser suite (S4–S8, S13–S16) + the
mandatory walkthrough task; tokens → research.md D8 + tokens package
changes (material3 override file for the tab ink matrix + indicator only;
strip and panel structure inherit through the base layer, an additive
file arrives if M3 ever diverges — 007 D8 precedent); agent legibility →
JSDoc requirements (Art. I line); guardrail → none. Two notes against the
echo, neither a delta: the spec lists "per-state fg/bg/border" for
`--ki-tab-*` — research D8 ships fg/bg and deliberately no border column
(neither source styles per-state tab borders; the divider and indicator
carry the lines; a border column is additive later), and the `border`
mention is read as the family's *available* vocabulary, not an
obligation; "llms.txt regenerates" is fulfilled through 017-agent-surfaces
(docs.json is today's machine surface — Art. I line).

## Project Structure

### Documentation (this feature)

```text
specs/014-ki-tabs/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S18
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: API/state model (all three elements)
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── tabs-contract.md # Phase 1: public API + token contract (all three elements)
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-tabs/                 # via Nx generator, never by hand
│   ├── ki-tabs.tsx                         # tablist wrapper + named/default slots; discovery, pairing, resolution, stamps, ki-change
│   ├── ki-tabs.css                         # tokens-only, logical properties, --_ki-tabs-* indirection (strip gap + divider)
│   ├── ki-tabs.selection.ts                # pure logic: resolveSelection (fallback matrix), pairing map
│   ├── ki-tabs.keyboard.ts                 # pure logic: nextSelectableIndex, first/last selectable, arrow→direction map
│   ├── ki-tabs.spec.tsx                    # mock-doc; @spec:014-ki-tabs
│   └── ki-tabs.stories.tsx                 # Storybook (Polish phase; composite stories live here)
├── src/components/ki-tab/                  # via Nx generator, never by hand
│   ├── ki-tab.tsx                          # presentational shadow (tab/indicator parts, 3 slots); internals role + ariaSelected/ariaDisabled derivation
│   ├── ki-tab.css                          # tokens-only, logical properties, --_ki-tab-* indirection (ink matrix, indicator, focus ring)
│   └── ki-tab.spec.tsx                     # mock-doc; @spec:014-ki-tabs
├── src/components/ki-tab-panel/            # via Nx generator, never by hand
│   ├── ki-tab-panel.tsx                    # panel part + slot; internals role tabpanel
│   ├── ki-tab-panel.css                    # tokens-only; :host([hidden]) display guard; panel focus ring
│   └── ki-tab-panel.spec.tsx               # mock-doc; @spec:014-ki-tabs
├── src/index.ts                            # exports added by the generator (all three elements)
├── browser-tests/
│   ├── ki-tabs.browser.spec.ts             # composite suite: real browser + axe + reduced-motion command; @spec:014-ki-tabs
│   ├── ki-tab.browser.spec.ts              # tab anatomy/target assertions; defers S-IDs to the group suite
│   ├── ki-tab-panel.browser.spec.ts        # panel anatomy/hidden-guard assertions; defers S-IDs to the group suite
│   └── ki-tabs.dark.browser.spec.ts        # forced-dark theming (002/003 split)
├── vitest.browser.config.ts                # + emulateReducedMotion command (012 T007 coordination)
├── generated/docs.json                     # regenerated on build, committed
└── package.json                            # + composite-trio size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/tabs.tokens.json            # strip layer (gap + divider)
├── tokens/component/tab.tokens.json             # tab layer (structure + onmars ink matrix + indicator + focus ring)
├── tokens/component/tab-panel.tokens.json       # panel layer (padding + surface + focus ring)
├── tokens/component/tab.material3.tokens.json   # material3 ink-matrix + indicator overrides (bg = backdrop convention)
├── scripts/check-contrast.mjs                   # + tab label pairs (4.5:1) + indicator pair (3:1, D8)
├── scripts/check-contrast.test.mjs              # + unit cases for the extension
├── style-dictionary.config.mjs                  # + tabs/tab/tab-panel files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                               # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button — run THREE times, once per element of the composite (the
generator enforces identical gate wiring on all three); group-owned logic
(discovery, pairing, resolution, roving, events) lives under `ki-tabs/`,
child anatomy under `ki-tab/` and `ki-tab-panel/`, and the composite's
behavioral browser suite lives in the group's file because every approved
scenario exercises the tags together (research D9). The component token
layer directory already exists (002); the structural changes are four new
token source files wired into the existing Style Dictionary layer lists
plus the mandated per-component extension of the contrast sweep.

## Complexity Tracking

No constitutional violations to justify. Three deliberate design notes,
recorded here because a reviewer will ask, none a violation:

- **Group-managed attributes on the children's light-DOM hosts**
  (research D1/D2/D4/D6/D7): the group stamps `slot="tab"`, `selected`,
  `tabindex`, `hidden`, generated `id`s and `aria-controls`/
  `aria-labelledby` onto its child hosts. This is not public API and not
  markup authors write — it is the composite's coordination channel made
  attribute-visible, the narrowest construction that keeps every ARIA
  relationship co-tree (the pattern's hard requirement) while the frozen
  public surface stays exactly what the spec approved. The `slot="tab"`
  stamp in particular exists ONLY because the tablist must own the tabs
  and not the panels within a single-default-slot API; the manual
  slot-assignment API that would avoid it is not exposed by Stencil
  (research D1 alternative c). Flagged for gate-1 awareness.
- **`ki-change` detail shape** (research D5): the spec fixes "`detail`
  carrying the selected value"; this plan resolves it as
  `detail: { value }` per the batch's object-detail convention (012's
  `detail.reason`). A bare-string detail would also satisfy the letter —
  the object form is flagged for founder confirmation at gate 1.
- **Mutation gate**: not yet wired into gates-suite.sh (factory gap
  declared in Art. III above, inherited from 001–016 state); compensating
  control is the exhaustively unit-tested pure selection/keyboard logic.
  Wiring Stryker is a factory chore outside this plan.
