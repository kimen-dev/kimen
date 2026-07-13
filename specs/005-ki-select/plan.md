# Implementation Plan: ki-select

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-select` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-ki-select/spec.md`; founder
intent is confirmed in the working conversation or PR, without a repository
approval marker.

## Summary

First Kimen popup control and first combobox: `<ki-select>` lets a person
choose exactly one option from its `<ki-option>` children, closed by
default, following the APG **select-only combobox** keyboard contract the
spec approved (no typeahead in v1 per charter; Tab closes discarding, the
spec's default reading pending gate 1), form-associated via
ElementInternals per the 002/003 pattern. Technical approach — fixed by one
platform constraint: the APG pattern is IDREF-wired
(`aria-activedescendant`, `aria-controls`), and IDREFs cannot cross shadow
boundaries, so the `role="option"` elements must be co-shadow with the
trigger and listbox. Therefore `ki-option` children are declarative DATA
(value, disabled, label text) discovered via `slotchange` (007's composite
discipline), and ki-select renders MIRROR option rows inside its own
shadow listbox — same-scope IDREFs everywhere, which is the entire point
(research D1). The trigger is a native `<button role="combobox">` named by
a component-rendered `<label for>` (003 D1); the popup positions with
CSS alone inside the component (no floating-ui, no popover/top-layer in
v1 — anchor positioning is not baseline; research D4); highlight and
selection are separate states (research D5/D6); a user commit synthesizes
composed `input` then `change` from the host (both synthesized — no native
control exists; sibling event rule otherwise intact); `required` validity
is platform-computed and platform-localized through a hidden native
`<select>` validity donor (research D7). Styling is exclusively
`--ki-select-*` / `--ki-option-*` component tokens over the 001 semantic
layer (research D8). The manual APG walkthrough is REQUIRED (new
interaction pattern — spec constitutional surface), with the
activedescendant-across-the-mirror announcements as its first named
verification point (research D10). Details and rationales in
[research.md](./research.md) (D1–D10); API surface in
[contracts/select-contract.md](./contracts/select-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency — positioning is CSS-only in v1, research D4). Tokens via
`@kimen/tokens` (workspace dev dependency, CSS consumed by tests and docs
only — components reference `--ki-*` custom properties, never import token
sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-select/` and
`src/components/ki-option/` + real-browser suite (Vitest browser mode,
Playwright provider, axe-core) in `packages/elements/browser-tests/`, per
the 001/002/003 pattern (dark split file routed by the existing config).
Traceability markers `// @spec:005-ki-select` with S-IDs on code lines
(test titles).

**Target Platform**: evergreen browsers (current + previous
Chromium/Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`. Everything used is baseline (ElementInternals,
`slotchange`, MutationObserver, absolute positioning); CSS anchor
positioning and cross-root ARIA element reflection are deliberately NOT
used because they are not baseline (research D1/D4).

**Project Type**: composite component — two elements in one feature
(`packages/elements`) + component token layer (`packages/tokens`) + one
deterministic-gate extension (`packages/tokens/scripts/check-contrast.mjs`,
research D8).

**Performance Goals**: size-limit — marginal cost of the composite PAIR
(`dist/components/ki-select.js` + `dist/components/ki-option.js`, runtime
excluded) ≤ 9 KB gzipped (SC-005; the spec expects the upper end of the
form-control batch — popup + highlight machinery); worst case pair +
Stencil runtime ≤ 25 KB; token stylesheets stay within their existing 9 KB
caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (label/placeholder are
attributes; option labels are child content; the required-validation
message is platform-sourced via the validity donor — research D7),
CSS-only popup positioning (documented v1 limitation: ancestor overflow
can clip the open popup; no viewport flipping — research D4), scaffold via
Nx generator (never by hand — TWO invocations, one per element), single
writer on `feat/ki-select`.

**Scale/Scope**: two components, 25 approved scenarios (S1–S25), 56
component tokens per theme (42 `--ki-select-*` + 14 `--ki-option-*`,
research D8), one gate extension (contrast sweep patterns), no removals —
purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiSelect` (6 props, 1 slot, 6 parts incl. the mirror-row `option`
  part) and `KiOption` (2 props, 1 slot) carries complete JSDoc including
  when-to-use/when-NOT-to-use — the select-vs-radio-group-vs-input
  distinction, the "ki-option is valid only inside ki-select" rule, the
  "ki-option is data: it renders through the select" note and the
  documented v1 positioning limitation (research D4);
  `generated/docs.json` and `src/components.d.ts` regenerate on build and
  are committed — docs.json is the machine surface that exists today. CEM
  and llms.txt arrive with 017-agent-surfaces (in progress); the Zod
  catalog is deferred to Fase 3 (founder decision 2026-07-08). This
  plan's obligation is that the JSDoc contract is complete so those
  surfaces regenerate from it without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/005-ki-select/feature.feature` S1–S25; all five families are covered
  (see spec table);
  nothing in this plan exceeds the approved scenarios — no typeahead
  (FR-007's explicit exception, gate-1 open question), no
  multiselect/size/tone axes, no Alt+Arrow or PageUp/PageDown optional
  keys, no invalid visual treatment, no validation-message display, no
  `ki-*` events, no option grouping. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc specs + browser suite written against S1–S25 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, events, form data,
  accessibility tree, resolved styles). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001–008,
  tracked as a factory chore); compensating control: the pure logic —
  `moveHighlight`/`firstEnabled`/`lastEnabled`/`openHighlight` + the
  keydown→intent map in `ki-select.keyboard.ts`,
  `resolveSelection`/`optionValue`/`selectFormValue`/`selectValueMissing`
  + the presence normalizer in `ki-select.form.ts` — lives in small pure
  functions with exhaustive unit cases per branch (research D5/D6/D7/D9).
  Done = `gates-suite.sh` exit 0. **PASS (with declared factory gap,
  unchanged from 002/003/006/007/008)**
- **Art. IV — Web standards & lightness**: native `<button>` trigger
  (focus, disabled, activation from the platform) with the
  ARIA-in-HTML-permitted `combobox` role; native `<label for>` naming;
  ARIA is exactly the APG select-only wiring, all IDREFs same-scope by
  construction (research D1/D2); no positioning dependency ("none" — CSS
  anchoring, research D4); logical properties only (per-side border-width
  tokens are logical, research D8); budgets as in Technical Context —
  pair marginal ≤ 9 KB gzipped; `formAssociated` + ElementInternals per
  constitution; no hardcoded strings (the required message is sourced
  from a native select donor — research D7). **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  full APG select-only combobox keyboard path per FR-007 (open on
  Enter/Space/arrows/Home/End, non-wrapping highlight that skips disabled
  options, Home/End jumps, Enter/Space commit, Escape/Tab discard —
  research D5); visible focus via `:focus-visible` on the native trigger
  from `--ki-select-focus-ring-*`; ≥ 24 px targets on trigger AND on
  every option row (FR-016, research D10); no intrinsic motion, theme
  motion behind `prefers-reduced-motion`, instant highlight scrolling
  (FR-015). **Manual APG walkthrough REQUIRED** — first popup control and
  first combobox in the repo, flagged by the spec's constitutional
  surface; scheduled as an explicit task with the
  activedescendant-across-the-mirror announcements, the combobox
  value exposure and the expanded/collapsed announcements as named
  verification points, and the roving-focus fallback as the recorded
  contingency (research D10). WCAG 2.2 SC 1.3.5 is a recorded v1 deferral
  per the spec's Assumptions (no native entry control to forward
  `autocomplete` to; no machine-consumed mechanism exists for custom
  comboboxes; flagged for the founder at gate 1). axe runs across
  closed/open/disabled/required-invalid × theme × scheme as the floor.
  **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces
  `--ki-select-*` (trigger structure incl. per-logical-side border widths
  so both M3 enclosures are token-expressible; label typography +
  per-state label ink; trigger ink matrix; placeholder ink; listbox
  surface incl. elevation from `ki.elevation.*` and background from the
  `ki.surface.s*` levels; focus ring) and `--ki-option-*` (row structure
  + rest/hover/highlight/selected/disabled ink pairs), 56 tokens per
  theme resolving from the 001 semantic layer; zero hardcoded visual
  values (the indicator is a token-drawn part); customization ladder
  tokens → `::part(trigger|label|value|indicator|listbox|option)` →
  slotted option labels (text). Contrast sweep extended to the new
  families at the 4.5:1 text minimum with per-pattern zero-match guards
  (research D8). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: two components ONLY
  because the spec's FR-001 defines the composite (charter: one feature);
  no "popup base" or "FormControlBase" abstraction speculated (the
  extraction question stays deferred as recorded since 006); sibling
  decisions are CITED and reused, not re-derived (research header list);
  no speculative surface (no typeahead, no size/tone, no open/close
  events, no `selected` on ki-option, no optional APG keys); native
  machinery wherever a native mechanism exists (button trigger, label
  association, donor-sourced validity), hand-rolled ONLY where shadow
  boundaries or the absence of a native control make the platform
  unavailable (mirror rows, synthesized events — research D1/D6's honest
  deviations). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta —
  adds `ki-select` and `ki-option` (props/slots/parts/events/tokens per
  contract); no existing API changes, no removals. Packaging validated by
  the existing publint/attw gate; new per-component exports
  `dist/components/ki-select.js` and `dist/components/ki-option.js`
  follow the established build output. The mirror mechanism and the
  validity donor are explicitly non-API (contract §Compatibility) so they
  can change without SemVer impact; the one contract nuance — the
  `option` part is addressed through `ki-select::part(option)` — is
  frozen in the contract and flagged at gate 1 (Complexity Tracking).
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on both new CSS files, ESLint/tsc strict, knip on exports,
  size-limit budgets, tokens-sync, traceability on S-IDs, scenario
  families). One rule gap is KNOWN IN ADVANCE and closed in this feature:
  the contrast sweep's per-component pattern list does not match
  `--ki-select-*`/`--ki-option-*` — extended (with per-pattern zero-match
  guards) in the same change that adds the tokens, never left to review
  (research D8). Scaffolding runs the generator TWICE (once per element)
  so both components carry identical gate wiring (Art. X
  reproducibility). **PASS**
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

- **Public API delta** (Art. IX): two new elements. `ki-select`
  (attributes: `label`, `placeholder`, `name`, `value`, `disabled`,
  `required`; slot: default, accepting `ki-option` children; parts:
  `trigger`, `label`, `value`, `indicator`, `listbox`; events: composed
  `input` and `change`; component tokens `--ki-select-*`) and the
  sub-component `ki-option` (attributes: `value`, `disabled`; slot:
  default label; part: `option`; component tokens `--ki-option-*`).
  Both tags are declared here — the composite is one feature (charter).
  Catalog and llms.txt regenerate with both entries.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost,
  expected at the upper end of the form-control batch (popup + highlight
  machinery); no new runtime dependency ("none" — positioning stays
  CSS-only in v1, see Assumptions).
- **Accessibility** (Art. V): APG combobox pattern, select-only variant
  with listbox popup. NEW interaction pattern in the repo → manual APG
  walkthrough REQUIRED and documented in the PR (charter flags select's
  listbox explicitly). axe zero violations across closed, open, disabled
  and required-invalid states in both themes, both schemes. WCAG 2.2 SC
  1.3.5 (Identify Input Purpose) is a recorded v1 deferral for this
  component (see spec Assumptions for the full justification and the
  additive path back).
- **Tokens** (Art. VI): new component token family `--ki-select-*` in the
  component layer, resolving from the semantic layer: trigger structure
  (`height`, `padding-inline`, `gap`, `radius`, `border-width`,
  `font-size`), trigger colors
  (`--ki-select-{rest|hover|focus|disabled}-{bg|fg|border}`), popup
  surface (`--ki-select-listbox-{bg|radius|elevation|padding}`) and
  `--ki-select-focus-ring-{color|width|offset}`; plus the sub-component
  family `--ki-option-*` for option states
  (`--ki-option-{rest|hover|highlight|selected|disabled}-{bg|fg}`) — each
  published tag owns its own `--ki-<tag>-*` family, so `ki-option`
  carries its own (radio/list-item precedent), reusable if `ki-option`
  later serves other hosts. Both shipped themes (onmars, material3) get
  component token files; exact values land in implementation.
- **Catalog/agent legibility** (Art. I): when-to-use — a person must pick
  exactly one value from a closed list of known options, especially when
  the options are too many to show at once (roughly five or more) or
  space is limited. When NOT to use — two to four always-visible choices
  (use ki-radio-group), on/off decisions (ki-switch or ki-checkbox), free
  or searchable text entry (ki-input; this select has no typeahead in
  v1), multiple selection (out of v1), command menus or navigation (not a
  menu component).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/select-contract.md (both elements in one contract — the
sub-component belongs to the parent's spec per the batch charter; the
contract also freezes research D8's COMPLETION of the abbreviated token
list above — per-side border widths, label typography + per-state label
ink, placeholder ink, listbox max-block-size/offset, option structure —
all inside the two declared families, mandated by FR-011's "every visual
property"); budget → the pair size-limit entries (Technical Context);
accessibility → Art. V line + browser suite (S6–S12, S21–S23) + the
mandatory walkthrough task; tokens → research.md D8 + tokens package
changes; agent legibility → JSDoc requirements (Art. I line); guardrail →
none. One flagged mismatch, carried to gate 1: FR-013 places the `option`
part "on ki-option", and the mirror architecture research D1 selects
hosts the rendered option rows in ki-select's shadow — the part exists
with the declared name but is addressed as `ki-select::part(option)`
(Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/005-ki-select/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S25
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: API/state model (both elements)
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── select-contract.md   # Phase 1: public API + token contract (both elements)
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-select/                 # via Nx generator, never by hand
│   ├── ki-select.tsx                         # label + button[role=combobox] + shadow listbox with mirror rows +
│   │                                         #   hidden data slot + validity donor; roster, state machine, ElementInternals
│   ├── ki-select.css                         # tokens-only, logical properties, --_ki-select-*/--_ki-option-* indirection
│   ├── ki-select.keyboard.ts                 # pure logic: moveHighlight, firstEnabled/lastEnabled, openHighlight, keydown→intent map
│   ├── ki-select.form.ts                     # pure logic: resolveSelection, optionValue, selectFormValue, selectValueMissing, presence normalizer
│   ├── ki-select.spec.tsx                    # mock-doc; @spec:005-ki-select
│   └── ki-select.stories.tsx                 # Storybook (Polish phase; composite stories live here)
├── src/components/ki-option/                 # via Nx generator, never by hand
│   ├── ki-option.tsx                         # declarative data element (value, disabled, label content) — never renders
│   ├── ki-option.css                         # :host { display: none } (data element)
│   └── ki-option.spec.tsx                    # mock-doc; @spec:005-ki-select
├── src/index.ts                              # exports added by the generator (both elements)
├── browser-tests/
│   ├── ki-select.browser.spec.ts             # composite suite: real browser + axe; @spec:005-ki-select
│   ├── ki-option.browser.spec.ts             # data-element assertions; defers S-IDs to the select suite
│   └── ki-select.dark.browser.spec.ts        # forced-dark theming (002/003 split)
├── generated/docs.json                       # regenerated on build, committed
└── package.json                              # + composite-pair size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/select.tokens.json             # trigger + label + listbox + focus ring (onmars by inheritance)
├── tokens/component/option.tokens.json             # option row structure + state ink pairs
├── tokens/component/select.material3.tokens.json   # M3 text-field enclosure (per-side widths) + menu surface overrides
├── tokens/component/option.material3.tokens.json   # M3 menu-item state ink overrides
├── scripts/check-contrast.mjs                      # + select/option text pairs (4.5:1) with per-pattern guards (D8)
├── scripts/check-contrast.test.mjs                 # + unit cases for the extension
├── style-dictionary.config.mjs                     # + select/option files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                  # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven
by ki-button — run TWICE, once per element of the composite (the generator
enforces identical gate wiring on both); ALL behavior (roster, mirror,
state machine, form) lives under `ki-select/` because ki-option is a data
element with no behavior of its own (research D1) — the option-facing CSS
(row states) also lives in `ki-select.css` since the rows render in the
select's shadow, while the `--ki-option-*` token family keeps its own
source file in the tokens package (spec: each published tag owns its
family). The composite's behavioral browser suite lives in the select's
file because every approved scenario exercises both tags together
(research D9). The component token layer directory already exists (002);
the structural changes are four new token source files wired into the
existing Style Dictionary layer lists plus the mandated per-component
extension of the contrast sweep.

## Complexity Tracking

No constitutional violations to justify. Three deliberate design notes,
recorded here because a reviewer will ask, none a violation:

- **Mirror options** (research D1): the rendered `role="option"` rows are
  shadow-internal to ki-select, and the light-DOM `ki-option` children
  are data. This is not indirection for its own sake — it is the only
  architecture in which the APG pattern's IDREF wiring
  (`aria-activedescendant`, `aria-controls`) resolves, because IDREFs
  cannot cross shadow boundaries. Consequence flagged for gate 1: the
  `option` part is addressed as `ki-select::part(option)`, a deviation
  from FR-013's letter ("`option` on `ki-option`") that the founder
  should either bless or fold back into the spec text before
  implementation.
- **Validity donor** (research D7): a hidden, permanently empty native
  `<select required>` in the shadow root exists solely so the
  `valueMissing` message is platform-computed and platform-localized (no
  hardcoded user-visible strings, Art. IV). It is display:none (no
  focus/AT surface), non-API, and the narrowest construction available —
  ki-select has no native constituent control to mirror (unlike 003) or
  to forward `required` to (unlike 007).
- **Mutation gate**: not yet wired into gates-suite.sh (factory gap
  declared in Art. III above, inherited from 001–008 state);
  compensating control is the exhaustively unit-tested pure
  keyboard/selection/form logic. Wiring Stryker is a factory chore
  outside this plan.
