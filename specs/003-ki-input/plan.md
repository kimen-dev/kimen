# Implementation Plan: ki-input

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-input` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-ki-input/spec.md` (gate-1
review in progress on `feat/fase2-specs`; implementation is blocked by the
pre-implement gate until the sha-stamped `.approved` marker exists).

## Summary

Second real Kimen component and first value-carrying form control:
`<ki-input>`, a form-associated single-line text field whose API abstracts
the Material 3 text-field pattern under the batch charter (MarsUI ships no
input frame — full-file sweep verified 2026-07-08; onmars styles the field
from the 001 token vocabulary alone), with six entry kinds and no
variant/tone/size axes in v1, styled exclusively through a new
`--ki-input-*` component token layer so both shipped themes — and the M3
filled/outlined enclosure choice — resolve from tokens alone. Technical
approach: a native `<input>` inside the shadow root provides entry
semantics, caret/selection, IME and per-kind behavior for free; the visible
label is rendered by the component from the `label` attribute and associated
to the entry control via internal `for`/`id` (same shadow tree);
ElementInternals (the 002 pattern) provides form participation —
`setFormValue` for submission, `setValidity` mirroring the internal input's
native ValidityState for constraint validation, `requestSubmit()` for
implicit Enter submission, `formResetCallback` for native dirty-value reset.
`value` is a mutable non-reflected property holding the live value; the
`value` attribute declares the default only. Details and rationales in
[research.md](./research.md) (D1–D10); API surface in
[contracts/input-contract.md](./contracts/input-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-input/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002 pattern. Traceability
markers `// @spec:003-ki-input` with S-IDs on code lines (test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/Firefox/
Safari); PR gate on Chromium, engine matrix via `KIMEN_BROWSER_MATRIX=1`.
CustomStateSet (`:state()`, research D7) is baseline across the target.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (new
entries added alongside ki-button's); token stylesheets stay within their
existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (label/placeholder come
from attributes; native validation messages come from the platform),
scaffold via Nx generator (never by hand), single writer on `feat/ki-input`.

**Scale/Scope**: one component, 28 approved scenarios (S1–S28), ~51
component tokens per theme (see research.md D8), no removals — purely
additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiInput` (9 props, 2 slots, 3 parts) carries complete JSDoc including
  when-to-use/when-NOT-to-use; `generated/docs.json` and
  `src/components.d.ts` regenerate on build and are committed — docs.json is
  the machine surface that exists today. CEM and llms.txt arrive with
  017-agent-surfaces (in progress); the Zod catalog is deferred to Fase 3
  (founder decision 2026-07-08). This plan's obligation is that the JSDoc
  contract is complete so those surfaces regenerate from it without rework.
  **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/003-ki-input/feature.feature` S1–S28 (gate-1 review in progress;
  the pre-implement gate blocks execution until the `.approved` marker is
  recorded); all five families are covered (see spec table); nothing in
  this plan exceeds the approved scenarios — helper text, on-screen
  validation messages, `type="number"`, size/variant axes and floating-label
  motion stay out. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suite written against S1–S28 and verified
  failing before implementation (tasks enforce the order); tests assert
  through the public API (attributes, events, form data, accessibility
  tree, resolved styles). Mutation gate: gates-suite.sh still does not wire
  Stryker (factory gap inherited from 001/002, tracked as a factory chore);
  compensating control: the pure logic (`normalizeKiInputType`, the
  value/dirty/reset rules) lives in small pure functions with exhaustive
  unit cases per branch. Done = `gates-suite.sh` exit 0. **PASS (with
  declared factory gap, unchanged from 002)**
- **Art. IV — Web standards & lightness**: native `<input>` + native
  `<label for>` in shadow DOM (no ARIA at all — semantics come from the
  elements); logical properties only (per-side border-width tokens are
  logical: `border-block-end-width` etc.); no new runtime dependency
  ("none"); budgets as in Technical Context — marginal cost ≤ 9 KB gzipped;
  `formAssociated` + ElementInternals per constitution. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard path native (Tab into the field, full text editing, Enter
  submits); visible focus ring from `--ki-input-focus-ring-*` tokens on the
  field enclosure; ≥24 px pointer target enforced via
  `--ki-input-min-target`; disabled/readonly/required exposed through
  native input semantics; no intrinsic motion, theme transitions behind
  `prefers-reduced-motion`. NO manual APG walkthrough: a labeled single-line
  text field is a native pattern, not a new APG interaction pattern (the
  charter flags dialog/tooltip/tabs/select only). WCAG 2.2 SC 1.3.5 is met
  by forwarding `autocomplete` to the entry control (FR-017, S25) — a gap
  axe cannot detect, covered by contract tests instead. axe runs across the
  type × state × theme matrix. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token family `--ki-input-*` (single geometry scale — no size
  axis; per-state color for five inks: bg, fg, border, label, placeholder;
  border width per logical side so filled and outlined enclosures are both
  token-expressible; focus ring) whose values reference the 001 semantic
  layer; zero hardcoded visual values; customization ladder tokens →
  `::part(field)`/`::part(input)`/`::part(label)` → `start`/`end` slots.
  material3 proves the enclosure-is-a-theme-decision claim (S16). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: one component, no
  "FormControlBase" abstraction shared with ki-button (duplication before
  the wrong abstraction — extraction is considered at the third form
  control, per the rule); no speculative props (no size, variant, tone,
  helper-text, error-message props); validity is mirrored, never
  re-implemented; unknown `type` handled by one tiny pure function. **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; no protocol type enters `@kimen/elements`; guardrail boundary
  untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-input` (props/slots/parts/events/tokens per contract); no existing
  API changes, no removals. Packaging validated by the existing
  publint/attw gate; new per-component export `dist/components/ki-input.js`
  follows the established build output. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on exports,
  size-limit budgets, tokens-sync + contrast on regenerated CSS,
  traceability on S-IDs, scenario families). No new rule gap identified; if
  implementation surfaces one, the rule is added in the same change. **PASS**
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: the
  implement phase runs as an unattended loop in the Art. XI sandbox
  (`sandbox/loop.sh`, credential-free, egress allowlist) or as a supervised
  local session without permission bypass; no new credential surface. **PASS**

**Definition of done (Art. III)**: done is exclusively the deterministic gates
exiting 0 (`bash scripts/gates/gates-suite.sh`: constitution, traceability,
lint, typecheck, build, tests, and per-surface gates). Never self-assessed,
by agent or human.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): new element `ki-input` (attributes:
  `type`, `label`, `placeholder`, `value`, `name`, `required`, `readonly`,
  `disabled`, `autocomplete`; slots: `start`, `end` — no default slot, the label is an
  attribute; parts: `field`, `input`, `label`; events: composed `input` and
  `change` with platform semantics, no component-specific events; component
  tokens: `--ki-input-*`). Purely additive — no existing API changes.
  Catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no
  new runtime dependency ("none").
- **Accessibility** (Art. V): native text-input semantics with a visible
  label as the accessible name — an established pattern, NOT a new APG
  interaction pattern, so no manual APG walkthrough is required (charter
  flags dialog/tooltip/tabs/select only). axe zero violations across
  type × state × theme; keyboard family covered by S7/S8/S22. WCAG 2.2
  SC 1.3.5 (Identify Input Purpose) is met through the forwarded
  `autocomplete` attribute (FR-017, S25) — a gap axe cannot detect, so it
  is contract-covered rather than gate-covered.
- **Tokens** (Art. VI): new component token family `--ki-input-*` in the
  component layer, following the 002 convention — structure
  (`height`, `padding-inline`, `gap`, `radius`, `font-size`, `font-weight`,
  plus border width per logical side: `border-width` with per-side
  overrides such as `border-block-end-width`, so a theme can express
  either M3 enclosure — outlined's full border or filled's bottom-only
  active indicator — as 002 included `border-width` explicitly),
  per-state color (`{rest|hover|focus|disabled|readonly|invalid}-{bg|fg|border}`
  plus placeholder and label color), and
  `--ki-input-focus-ring-{color|width|offset}` — resolving from the
  semantic layer in both shipped themes (onmars, material3). No
  semantic-layer deltas anticipated; if the contrast gate's WCAG arithmetic
  forces any (as in 002), they will be declared explicitly for founder
  sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — collecting one line
  of free text from a person (name, email, password, URL, phone, search
  query), always with a visible label. When NOT to use — multiline text
  (future ki-textarea), choosing among predefined options (future
  ki-select / ki-radio-group), boolean state (future ki-checkbox /
  ki-switch), numeric stepper entry (`type="number"` is post-v1).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/input-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suite (S7–S11, S22–S25);
tokens → research.md D8 + tokens package changes; agent legibility → JSDoc
requirements (Art. I line); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/003-ki-input/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S28
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: API/state model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── input-contract.md    # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-input/            # via Nx generator, never by hand
│   ├── ki-input.tsx                    # native <input> + label + ElementInternals
│   ├── ki-input.css                    # tokens-only, logical properties, --_ki-input-* indirection
│   ├── ki-input.form.ts                # pure logic: type allowlist, value/validity helpers
│   ├── ki-input.spec.tsx               # mock-doc; @spec:003-ki-input
│   └── ki-input.stories.tsx            # Storybook (Polish phase)
├── src/index.ts                        # export added by the generator
├── browser-tests/
│   ├── ki-input.browser.spec.ts        # real browser + axe; @spec:003-ki-input
│   └── ki-input.dark.browser.spec.ts   # forced-dark theming (002 pattern), if split needed
├── generated/docs.json                 # regenerated on build, committed
└── package.json                        # + ki-input size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/input.tokens.json            # component layer (structure + onmars state matrix)
├── tokens/component/input.material3.tokens.json  # material3 state matrix + enclosure overrides
├── style-dictionary.config.mjs                   # + input files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button; the component token layer directory already exists (002), so the
only structural change is two new token source files wired into the existing
Style Dictionary layer lists.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002 state, and belongs to a factory chore, not to this plan.
