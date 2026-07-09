# Implementation Plan: ki-radio-group

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-radio-group` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-ki-radio-group/spec.md`
(gate-1 review in progress on `feat/fase2-specs`; implementation is blocked
by the pre-implement gate until the sha-stamped `.approved` marker exists).

## Summary

First Kimen composite and first roving-tabindex pattern in the repo:
`<ki-radio-group>` models the radio GROUP as the single form-associated
control (name, value projection, group label, required, disabled, keyboard
model) with `<ki-radio>` children carrying each option's value, disabled
flag and slotted label — per the APG Radio Group pattern the spec approved.
Technical approach: each option is the 006 D1 anatomy adapted to a radio —
a visually hidden, UNNAMED native `<input type="radio">` inside a shadow
`<label>` with a token-styled ring/dot `control` part — so role, checked
and disabled exposure, pointer/label activation and Space are platform
behavior with zero option-level ARIA. Because native radio grouping (by
tree + form owner + name) cannot cross shadow roots, the GROUP owns what
the platform cannot provide: mutual exclusivity (identity-tracked
selection; `value` is a projection, first-match on programmatic
assignment), the roving tabindex (selected option, else first enabled),
arrow-key navigation with wrap, disabled skipping and writing-direction
mapping (selection follows focus via the target input's native `click()` —
one code path for every modality), option discovery via `slotchange` plus
a disabled-attribute observer, and ElementInternals form participation —
`setFormValue(null when unselected or selected-disabled, else value)`,
`valueMissing` mirrored from a constituent native input (localized
platform message, no hardcoded strings), reset snapshot captured in
`formAssociatedCallback`, composed `change` re-dispatched from the group
(the form-associated host, sibling convergence). Group semantics: a shadow
`role="radiogroup"` wrapper named by the rendered visible `label`
(a11y-required, 003 precedent) carrying `aria-required`/`aria-invalid`/
`aria-disabled`. The manual APG walkthrough is REQUIRED (spec
constitutional surface — new interaction pattern), with the cross-shadow
position-in-set announcement as its declared verification point. Details
and rationales in [research.md](./research.md) (D1–D10); API surface in
[contracts/radio-group-contract.md](./contracts/radio-group-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-radio-group/`
and `src/components/ki-radio/` + real-browser suite (Vitest browser mode,
Playwright provider, axe-core) in `packages/elements/browser-tests/`, per
the 001/002/003 pattern (dark split file routed by the existing config).
Traceability markers `// @spec:007-ki-radio-group` with S-IDs on code
lines (test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: composite component — two elements in one feature
(`packages/elements`) + component token layer (`packages/tokens`) + one
deterministic-gate extension (`packages/tokens/scripts/check-contrast.mjs`,
research D8).

**Performance Goals**: size-limit — marginal cost of the composite PAIR
(`dist/components/ki-radio-group.js` + `dist/components/ki-radio.js`,
runtime excluded) ≤ 9 KB gzipped (SC-006 single-digit budget); worst case
pair + Stencil runtime ≤ 25 KB; token stylesheets stay within their
existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (option labels are
slotted; the group label is the `label` prop rendered verbatim; the
required-validation message is platform-sourced — research D7), scaffold
via Nx generator (never by hand — TWO invocations, one per element),
single writer on `feat/ki-radio-group`.

**Scale/Scope**: two components, 25 approved scenarios (S1–S25), 40
component tokens per theme (36 `--ki-radio-*` + 4 `--ki-radio-group-*`,
research D8), one gate extension (contrast sweep), no removals — purely
additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiRadioGroup` (5 props, 1 slot, 1 part) and `KiRadio` (2 props, 1 slot,
  2 parts) carries complete JSDoc including when-to-use/when-NOT-to-use —
  the radio-group-vs-select-vs-checkbox distinction, the
  "ki-radio is valid only inside ki-radio-group" rule, and the
  "never author selection on an option" warning (FR-015, FR-002);
  `generated/docs.json` and `src/components.d.ts` regenerate on build and
  are committed — docs.json is the machine surface that exists today. CEM
  and llms.txt arrive with 017-agent-surfaces (in progress); the Zod
  catalog is deferred to Fase 3 (founder decision 2026-07-08). This plan's
  obligation is that the JSDoc contract is complete so those surfaces
  regenerate from it without rework. The intra-composite coordination is
  deliberately NOT public API (research D4) so no agent-visible surface
  invites authoring selection. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/007-ki-radio-group/feature.feature` S1–S25 (gate-1 review in
  progress; the pre-implement gate blocks execution until the `.approved`
  marker is recorded); all five families are covered (see spec table);
  nothing in this plan exceeds the approved scenarios — no
  size/tone/orientation axes, no Home/End keys, no invalid VISUAL
  treatment (S23 is assistive-tech exposure only — research D7), no
  validation-message display, no `ki-*` events. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc specs + browser suite written against S1–S25 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, events, form data,
  accessibility tree, resolved styles). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001/002/003,
  tracked as a factory chore); compensating control: the pure logic —
  `nextEnabledIndex` + the arrow/direction map in
  `ki-radio-group.keyboard.ts`, `radioGroupFormValue` + the presence
  normalizer in `ki-radio-group.form.ts` — lives in small pure functions
  with exhaustive unit cases per branch (research D6/D7/D9). Done =
  `gates-suite.sh` exit 0. **PASS (with declared factory gap, unchanged
  from 002/003/006/008)**
- **Art. IV — Web standards & lightness**: native `<input type="radio">`
  per option inside a native shadow `<label>`; option-level ARIA is zero
  (only `aria-hidden` on the decorative control span); group-level ARIA is
  the APG-sanctioned `role="radiogroup"` + `aria-labelledby` +
  `aria-required`/`aria-invalid`/`aria-disabled` on one wrapper (research
  D1/D2) — everything else (activation, Space, focus, disabled, event
  ordering) is platform behavior; logical properties only; no new runtime
  dependency ("none"); budgets as in Technical Context — pair marginal
  ≤ 9 KB gzipped; `formAssociated` + ElementInternals on the group per
  constitution; no hardcoded strings (the required message is sourced from
  a constituent native input — research D7). **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  full APG Radio Group keyboard path owned by the group (single tab stop,
  arrows wrap + skip disabled + follow writing direction, Space,
  no-selection-on-entry — research D6); visible focus ring from
  `--ki-radio-focus-ring-*` under `:focus-visible` (research D10); ≥24 px
  pointer target per option via `--ki-radio-min-target` (FR-011); selected/
  disabled/required/invalid exposure per S10–S11/S19–S20/S22–S23;
  selection-state motion inside `prefers-reduced-motion: no-preference`
  (FR-014). **Manual APG walkthrough REQUIRED** — first roving-tabindex
  composite in the repo, flagged by the spec's constitutional surface as a
  new interaction pattern (deviation from 006/008, which N/A'd it);
  scheduled as an explicit task with the cross-shadow position-in-set
  announcement as its named verification point and
  `aria-posinset`/`aria-setsize` as the recorded contingency (research
  D1/D10). axe runs across selection × disabled × required/invalid × theme
  × scheme as the floor. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces
  `--ki-radio-*` (structure incl. round-by-reference radius; selected/
  unselected × rest/hover/active/disabled × bg/fg/border ink matrix; focus
  ring) and `--ki-radio-group-*` (stack gap, group-label typography), 40
  tokens per theme resolving from the 001 semantic layer; zero hardcoded
  visual values (the dot is pure CSS drawn from tokens — no SVG, research
  D8); customization ladder tokens → `::part(control)`/`::part(label)`
  (option) and `::part(label)` (group) → slotted option labels. Contrast
  sweep extended to the selected dot pairs at the 1.4.11 non-text 3:1
  minimum (008 D8 mechanism, research D8). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: two components ONLY
  because the spec's FR-001 defines the composite (options carry slotted
  labels and parts; the group is the form control) — no "composite base"
  or "FormControlBase" abstraction speculated (the extraction question
  stays deferred as recorded in 006's plan); sibling decisions are CITED
  and reused, not re-derived (research header list: 006 D1 anatomy, 006
  D2/008 D3 reset snapshot, 003 D5 event rule, 002 indirection, 008 D8
  sweep mechanism); no speculative surface (no size/tone/orientation, no
  Home/End, no invalid tokens, no custom states, no public checked on
  ki-radio); selection, activation and validity semantics are native
  machinery wherever a native mechanism exists, hand-rolled ONLY where
  shadow boundaries make the platform unavailable (research D1's fixed-
  cost analysis). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-radio-group` and `ki-radio` (props/slots/parts/events/tokens per
  contract); no existing API changes, no removals. Packaging validated by
  the existing publint/attw gate; new per-component exports
  `dist/components/ki-radio-group.js` and `dist/components/ki-radio.js`
  follow the established build output. The intra-composite coordination
  channel is explicitly non-API (research D4) so it can change without
  SemVer impact. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on both new CSS files, ESLint/tsc strict, knip on exports,
  size-limit budgets, tokens-sync, traceability on S-IDs, scenario
  families). One rule gap is KNOWN IN ADVANCE and closed in this feature:
  the contrast sweep's per-component pattern list does not match
  `--ki-radio-*` — extended (with the 3:1 per-pair minimum and a
  per-pattern zero-match guard) in the same change that adds the tokens,
  never left to review (research D8). Scaffolding runs the generator
  TWICE (once per element) so both components carry identical gate wiring
  (Art. X reproducibility). **PASS**
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

- **Public API delta** (Art. IX): new element `ki-radio-group` (attributes:
  `name`, `value`, `label`, `required`, `disabled`; events: `input`,
  `change` — composed, native names per charter; slot: default for
  `ki-radio` children; part: `label`) and new sub-element `ki-radio`
  (attributes: `value`, `disabled`; slot: default for the option label;
  parts: `control`, `label`). Component tokens `--ki-radio-*` and
  `--ki-radio-group-*`. Additive MINOR; catalog and llms.txt regenerate
  with both new tags.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost for
  the composite pair (two tags sharing group logic); no new runtime
  dependency ("none").
- **Accessibility** (Art. V): APG Radio Group pattern (roving tabindex,
  selection follows focus). First roving-tabindex composite in the repo →
  new interaction pattern → manual APG walkthrough documented in the PR.
  axe zero violations across selected/unselected/disabled/required states
  in all four theme × scheme contexts.
- **Tokens** (Art. VI): new component token family `--ki-radio-*` (control
  size, control/label gap, label typography, selected/unselected state
  colors for rest/hover/active/disabled, focus ring color/width/offset)
  plus group-level structure tokens (`--ki-radio-group-gap`, group-label
  typography), resolving from the semantic layer; both shipped themes
  (onmars, material3) get component token files. No semantic-layer deltas
  anticipated; any contrast finding at implementation follows the 002
  escalation route with explicit founder sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — a person must
  choose exactly one of a small set of mutually exclusive options that
  should all be visible at once (typically 2–5). When NOT to use — many
  options or constrained space (use ki-select), an independent on/off
  setting (use ki-checkbox or ki-switch), multiple selection (use a
  checkbox group).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/radio-group-contract.md (both elements in one contract — the
sub-component belongs to the parent's spec per the batch charter); budget →
the pair size-limit entries (Technical Context); accessibility → Art. V
line + browser suite (S5–S11, S19–S23, S25) + the mandatory walkthrough
task; tokens → research.md D8 + tokens package changes (the group's
material3 file is deliberately omitted — structure-only tokens inherit
through the base layer, an additive file arrives if M3 ever diverges,
research D8); agent legibility → JSDoc requirements (Art. I line);
guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/007-ki-radio-group/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S25
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: API/state model (both elements)
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── radio-group-contract.md  # Phase 1: public API + token contract (both elements)
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-radio-group/           # via Nx generator, never by hand
│   ├── ki-radio-group.tsx                   # visible label + role=radiogroup wrapper + slot; roster, roving, ElementInternals
│   ├── ki-radio-group.css                   # tokens-only, logical properties, --_ki-radio-group-* indirection
│   ├── ki-radio-group.keyboard.ts           # pure logic: nextEnabledIndex, arrow→direction map
│   ├── ki-radio-group.form.ts               # pure logic: radioGroupFormValue, presence normalizer
│   ├── ki-radio-group.spec.tsx              # mock-doc; @spec:007-ki-radio-group
│   └── ki-radio-group.stories.tsx           # Storybook (Polish phase; composite stories live here)
├── src/components/ki-radio/                 # via Nx generator, never by hand
│   ├── ki-radio.tsx                         # shadow <label> + hidden unnamed native radio + control/label parts
│   ├── ki-radio.css                         # tokens-only, logical properties, --_ki-radio-* indirection
│   └── ki-radio.spec.tsx                    # mock-doc; @spec:007-ki-radio-group
├── src/index.ts                             # exports added by the generator (both elements)
├── browser-tests/
│   ├── ki-radio-group.browser.spec.ts       # composite suite: real browser + axe; @spec:007-ki-radio-group
│   ├── ki-radio.browser.spec.ts             # option anatomy/target assertions; defers S-IDs to the group suite
│   └── ki-radio-group.dark.browser.spec.ts  # forced-dark theming (002/003 split)
├── generated/docs.json                      # regenerated on build, committed
└── package.json                             # + composite-pair size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/radio.tokens.json             # option layer (structure + onmars ink matrix + focus ring)
├── tokens/component/radio-group.tokens.json       # group structure (gap + group-label typography)
├── tokens/component/radio.material3.tokens.json   # material3 ink-matrix overrides (bg = backdrop convention)
├── scripts/check-contrast.mjs                     # + selected dot/bg non-text pairs (3:1, D8)
├── scripts/check-contrast.test.mjs                # + unit cases for the extension
├── style-dictionary.config.mjs                    # + radio files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                 # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button — run TWICE, once per element of the composite (the generator
enforces identical gate wiring on both); group-owned logic (roster, roving,
form) lives under `ki-radio-group/`, option anatomy under `ki-radio/`, and
the composite's behavioral browser suite lives in the group's file because
every approved scenario exercises both tags together (research D9). The
component token layer directory already exists (002); the structural
changes are three new token source files wired into the existing Style
Dictionary layer lists plus the mandated per-component extension of the
contrast sweep.

## Complexity Tracking

No constitutional violations to justify. Two deliberate design notes,
recorded here because a reviewer will ask, neither a violation:

- **Intra-composite coupling** (research D4): the group manipulates each
  option's internal native input through the option's open shadow root.
  This is not public API and not an abstraction — it is the narrowest
  channel that keeps `ki-radio`'s public surface at exactly what the spec
  froze (`value`, `disabled`); every alternative leaks selection authoring
  into agent-visible API (Art. I/IX) or violates FR-002.
- **Mutation gate**: not yet wired into gates-suite.sh (factory gap
  declared in Art. III above, inherited from 001–008 state); compensating
  control is the exhaustively unit-tested pure keyboard/form logic. Wiring
  Stryker is a factory chore outside this plan.
