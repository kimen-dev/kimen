# Implementation Plan: ki-checkbox

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-checkbox` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-ki-checkbox/spec.md`;
founder intent is confirmed in the working conversation or PR, without a
repository approval marker.

## Summary

First Kimen selection control: `<ki-checkbox>`, a form-associated binary
checkbox with an `indeterminate` presentation-only mixed state (the value
stays binary), whose API abstracts the Material 3 checkbox under the batch
charter (MarsUI ships no checkbox frame — full-file sweep verified
2026-07-08; onmars styles the control from the 001 token vocabulary alone),
with no variant/tone/size axes in v1, styled exclusively through a new
`--ki-checkbox-*` component token layer. Technical approach: a native
`<input type="checkbox">` inside the shadow root, wrapped by a shadow
`<label>` that also contains the token-styled control box (inline SVG
check/dash marks in currentColor) and the slotted default-slot label — so
toggle, Space activation, label activation, mixed-state AT exposure and
checkbox validity are all platform behavior, zero ARIA; ElementInternals
(the 002 pattern, planned alongside 003 ki-input) provides form
participation — `setFormValue(checked ? value ?? 'on' : null)` for the
absent-when-unchecked submit semantics, `setValidity` mirroring the internal
checkbox's native ValidityState (`valueMissing` when required and
unchecked), `formResetCallback` restoring the baseline captured at form
association, and a `user-invalid` custom state (`:state(user-invalid)`,
003 D7 reused) for the invalid presentation. `checked` and `indeterminate`
are reflected live per the charter's style-driving rule, with boolean
PRESENCE semantics enforced at load. Details and rationales in
[research.md](./research.md) (D1–D10); API surface in
[contracts/checkbox-contract.md](./contracts/checkbox-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-checkbox/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002 pattern. Traceability
markers `// @spec:006-ki-checkbox` with S-IDs on code lines (test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/Firefox/
Safari); PR gate on Chromium, engine matrix via `KIMEN_BROWSER_MATRIX=1`.
CustomStateSet (`:state()`, research D5 via 003 D7) is baseline across the
target.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (new
entries added alongside ki-button's); token stylesheets stay within their
existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (the label is slotted;
native validation messages come from the platform), scaffold via Nx
generator (never by hand), single writer on `feat/ki-checkbox`.

**Scale/Scope**: one component, 21 approved scenarios (S1–S21), 50
component tokens per theme (see research.md D8), no removals — purely
additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiCheckbox` (6 props, 1 slot, 2 parts) carries complete JSDoc including
  when-to-use/when-NOT-to-use — explicitly the checkbox-vs-switch-vs-radio
  distinction and the `checked="false"` presence-semantics warning (FR-015,
  FR-010); `generated/docs.json` and `src/components.d.ts` regenerate on
  build and are committed — docs.json is the machine surface that exists
  today. CEM and llms.txt arrive with 017-agent-surfaces (in progress); the
  Zod catalog is deferred to Fase 3 (founder decision 2026-07-08). This
  plan's obligation is that the JSDoc contract is complete so those
  surfaces regenerate from it without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/006-ki-checkbox/feature.feature` S1–S21; all five families are covered
  (see spec table);
  nothing in this plan exceeds the approved scenarios — no size axis, no
  checkbox-group, no validation-message display, no `ki-*` events. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suite written against S1–S21 and verified
  failing before implementation (tasks enforce the order); tests assert
  through the public API (attributes, events, form data, accessibility
  tree, resolved styles). Mutation gate: gates-suite.sh still does not wire
  Stryker (factory gap inherited from 001/002, tracked as a factory chore);
  compensating control: the pure logic (`checkboxFormValue`, the
  boolean-presence normalizer) lives in small pure functions in
  `ki-checkbox.form.ts` with exhaustive unit cases per branch. Done =
  `gates-suite.sh` exit 0. **PASS (with declared factory gap, unchanged
  from 002/003)**
- **Art. IV — Web standards & lightness**: native `<input type="checkbox">`
  + native label-by-nesting in shadow DOM (zero ARIA except `aria-hidden`
  on decorative SVGs — semantics come from the elements); marks are inline
  SVG in currentColor, no icon font (research D7); logical properties only;
  no new runtime dependency ("none"); budgets as in Technical Context —
  marginal cost ≤ 9 KB gzipped; `formAssociated` + ElementInternals per
  constitution. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard path native (Tab reaches the control, Space toggles, Enter inert
  per native parity); visible focus ring from `--ki-checkbox-focus-ring-*`
  tokens on the control under `:focus-visible` (research D10); ≥24 px
  pointer target enforced via `--ki-checkbox-min-target` (FR-011); disabled
  and mixed exposed through native input semantics (S8, S9); mark
  state-change animation wrapped in `prefers-reduced-motion` (FR-014, S21).
  NO manual APG walkthrough: the checkbox including its mixed variant is an
  established native pattern, not a new APG interaction pattern (the
  charter flags dialog/tooltip/tabs/select only; spec constitutional
  surface). axe runs across the selection × interaction × validity × theme
  × scheme matrix. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token family `--ki-checkbox-*` (structure — no size axis;
  selection × interaction ink matrix 3×4×3; invalid treatment; focus ring —
  50 tokens/theme, research D8) whose values reference the 001 semantic
  layer; zero hardcoded visual values (motion literals declared as
  implementation detail per spec assumption, with the token fallback named
  in research D7); customization ladder tokens → `::part(control)` /
  `::part(label)` → slotted label. The contrast sweep in
  `check-contrast.mjs` is extended to the new matrix (per that gate's own
  per-component mandate). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: one component; still no
  "FormControlBase" abstraction — ki-checkbox is the third
  ElementInternals consumer (002, 003, 006), so the extraction question is
  now legitimately open per the third-occurrence rule, but the shared
  surface across button/input/checkbox is small and heterogeneous
  (submitter proxy vs value mirror vs binary toggle); extraction is
  deliberately deferred to a factory refactor AFTER 006 proves the third
  variation, not speculated now; no speculative props (no size/variant/
  tone, no checkbox-group); validity is mirrored, never re-implemented;
  toggle semantics are the native input's own. **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; no protocol type enters `@kimen/elements`; guardrail boundary
  untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-checkbox` (props/slot/parts/events/tokens per contract); no existing
  API changes, no removals. Packaging validated by the existing
  publint/attw gate; new per-component export
  `dist/components/ki-checkbox.js` follows the established build output.
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on exports,
  size-limit budgets, tokens-sync + contrast on regenerated CSS,
  traceability on S-IDs, scenario families). One gate needs extension, not
  creation: `check-contrast.mjs`'s `COMPONENT_BG_PATTERN` is per-component
  by design and MUST be extended to `--ki-checkbox-*` in the same change
  that adds the tokens, or the gate silently ignores the component
  (research D8) — tasks make this explicit. **PASS**
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: the
  implement phase runs as an unattended loop in the Art. XI sandbox
  (`sandbox/loop.sh`, credential-free, egress allowlist) or as a supervised
  local session without permission bypass; no new credential surface. **PASS**

**Definition of done (Art. III)**: done is exclusively the deterministic gates
exiting 0 (`bash scripts/gates/gates-suite.sh`: constitution, traceability,
lint, typecheck, build, tests, and per-surface gates). Never self-assessed,
by agent or human.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): new element `ki-checkbox` (attributes:
  `checked`, `indeterminate`, `disabled`, `required`, `name`, `value`;
  events: `input`, `change` — composed, platform semantics, no `ki-*`
  events in v1; slot: default (label); parts: `control`, `label`; component
  tokens: `--ki-checkbox-*`). No sub-components. Additive MINOR. Catalog
  and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no
  new runtime dependency ("none").
- **Accessibility** (Art. V): APG checkbox pattern including its
  mixed-state variant. Not a new interaction pattern in this batch (the
  charter's manual-walkthrough list covers dialog, tooltip, tabs and
  select's listbox) → no manual APG walkthrough required; axe zero
  violations across selection × interaction × validity states in both
  themes and both schemes; mixed-state exposure verified by S8.
- **Tokens** (Art. VI): new component token family `--ki-checkbox-*` in the
  component layer, resolving from the semantic layer: structure
  (`control-size`, `gap`, `radius`, `border-width`), color per
  selection-state × interaction-state
  (`{unchecked|checked|indeterminate}-{rest|hover|active|disabled}-{bg|fg|border}`),
  an invalid treatment, and `focus-ring-{color|width|offset}`. Both shipped
  themes (onmars, material3) get component token files. No semantic-layer
  deltas anticipated; if the contrast gate reveals any, they will be
  declared for founder sign-off as in 002.
- **Catalog/agent legibility** (Art. I): when-to-use — selecting one or
  more independent options that a form submits later; a "select all" parent
  reflects partial selection through the indeterminate presentation. When
  NOT to use — a single mutually exclusive choice (ki-radio-group), an
  immediate on/off effect (ki-switch), triggering an action (ki-button),
  unlabeled/icon-only usage (no accessible name), and writing
  `checked="false"` to mean unchecked. Usage note for agents: boolean
  attributes follow presence semantics — `checked="false"` still renders
  checked; omit the attribute to express unchecked.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/checkbox-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suite (S5–S9, S21); tokens →
research.md D8 + tokens package changes (including the label typography
tokens FR-008's "typography" requires — an additive refinement of the
spec's structure list, same layer and naming convention); agent legibility →
JSDoc requirements (Art. I line); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/006-ki-checkbox/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S21
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: API/state model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── checkbox-contract.md  # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-checkbox/            # via Nx generator, never by hand
│   ├── ki-checkbox.tsx                    # shadow <label> + native checkbox + SVG marks + ElementInternals
│   ├── ki-checkbox.css                    # tokens-only, logical properties, --_ki-checkbox-* indirection
│   ├── ki-checkbox.form.ts                # pure logic: checkboxFormValue, boolean-presence normalizer
│   ├── ki-checkbox.spec.tsx               # mock-doc; @spec:006-ki-checkbox
│   └── ki-checkbox.stories.tsx            # Storybook (Polish phase)
├── src/index.ts                           # export added by the generator
├── browser-tests/
│   ├── ki-checkbox.browser.spec.ts        # real browser + axe; @spec:006-ki-checkbox
│   └── ki-checkbox.dark.browser.spec.ts   # forced-dark theming (002/003 pattern), if split needed
├── generated/docs.json                    # regenerated on build, committed
└── package.json                           # + ki-checkbox size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/checkbox.tokens.json            # component layer (structure + onmars matrix)
├── tokens/component/checkbox.material3.tokens.json  # material3 matrix overrides
├── scripts/check-contrast.mjs                       # + --ki-checkbox-* sweep pattern (research D8)
├── style-dictionary.config.mjs                      # + checkbox files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                   # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button (and planned identically for ki-input); the component token layer
directory already exists (002), so the structural changes are two new token
source files wired into the existing Style Dictionary layer lists plus the
mandated per-component extension of the contrast sweep.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002 state, and belongs to a factory chore, not to this plan.
The FormControlBase extraction question (third ElementInternals consumer) is
recorded under Art. VII as deliberately deferred, not as a violation.
