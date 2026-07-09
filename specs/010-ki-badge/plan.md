# Implementation Plan: ki-badge

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Branch**: `feat/ki-badge` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-ki-badge/spec.md` (pending
gate-1 approval; this plan is prepared alongside the Fase 2 spec batch and
implementation starts only after the `.approved` marker exists)

## Summary

`<ki-badge>`: a static, non-interactive status pill — the label composes
through the default slot and is the sole carrier of meaning; `tone`
(neutral | success | danger | info | warning) and `size` (sm | md) select
token-resolved appearance, with unknown values falling back to the defaults
by CSS construction (no validation code). The component contains **zero
JavaScript logic**: one shadow wrapper (`<span part="badge">`), two
reflected props, no events, no listeners, no focus surface. Appearance is
100% tokens: a new state-less `--ki-badge-*` family (per-size metrics,
family typography/stroke, per-tone `bg|fg|border`) resolving from the 001
semantic layer — the first component to consume the info/warning ramps at
the component layer, which extends the contrast sweep to those ramps in all
four theme × scheme contexts. Details and rationales in
[research.md](./research.md); API surface in
[contracts/badge-contract.md](./contracts/badge-contract.md).

Proportionality note (Art. VII): ki-badge has no state machine, no form
model, no interaction pattern and no per-state token axis, so this plan is
deliberately shorter than 002's (the 009 precedent for non-interactive
components). **data-model.md is omitted**: the entire public surface is two
closed enum attributes with documented defaults plus the slots/parts/tokens
tables already frozen in contracts/badge-contract.md — there is no state,
no transitions and no relationships to model, and duplicating the attribute
tables would create a second source of truth.

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (components reference `--ki-*`
custom properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc spec in `src/components/ki-badge/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 002 pattern (light + dark spec
files). Traceability markers `// @spec:010-ki-badge` with S-IDs on test
titles.

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded; expected far under — a render-only pill), worst case
component + Stencil runtime ≤ 25 KB (repo-standard caps, new entries added
for ki-badge); token stylesheets stay within their existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (the component renders
slotted content only), scaffold via Nx generator (never by hand), single
writer on `feat/ki-badge`.

**Scale/Scope**: one component, 8 approved scenarios (S1–S8), ~28 component
tokens (onmars) + material3 overrides (see research.md D2). No removals.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiBadge` (2 props, 1 slot, 1 part, host JSDoc) carries complete JSDoc
  including when-to-use/when-NOT-to-use (contracts/badge-contract.md
  §Agent-facing metadata — including "never for counters/dots on navigation
  items" and "feedback that must be announced belongs to ki-alert");
  `generated/docs.json` and `src/components.d.ts` regenerate on build and
  are committed. CEM and llms.txt surfaces arrive with 017-agent-surfaces;
  the Zod catalog is Fase 3 (founder 2026-07-08) — this plan regenerates
  the surfaces that exist today. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/010-ki-badge/feature.feature` S1–S8; four families covered, form
  participation N/A-justified in the spec's coverage table (static
  descriptor, charter-listed valid N/A); nothing here exceeds the approved
  scenarios — no variant attribute, no dot/counter mode, no dismissal, no
  live region. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suites written against S1–S8 and verified
  failing before implementation (tasks enforce the order); tests assert
  through the public API (attributes, computed styles, accessibility tree,
  tab order). Mutation gate: Stryker still not wired into gates-suite.sh
  (factory gap inherited from 001/002/009, tracked as a factory chore);
  ki-badge contains zero pure logic — no predicate exists — so there is
  nothing for the 009-style compensating control to cover. Done =
  `gates-suite.sh` exit 0. **PASS (with declared factory gap, unchanged
  from 002/009)**
- **Art. IV — Web standards & lightness**: semantic HTML first means *no*
  added semantics here — a generic span and a native slot, zero ARIA
  (FR-005); logical properties only (FR-010); no new runtime dependency
  ("none"); budgets as in Technical Context. Not form-associated. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**: no
  APG pattern exists for a static badge and no new interaction pattern is
  introduced → **no manual APG walkthrough** (charter flags dialog/tooltip/
  tabs/select, not badge). The obligation is semantic transparency,
  asserted as behavior: zero tab stops (S4), label as plain static text
  with no role or state (S5), nothing exposed for an empty badge (S8), axe
  zero violations across tone × size × theme × scheme. Meaning lives in the
  text, never in color alone (FR-003, WCAG 1.4.1); every tone's fg/bg pair
  is contrast-gated (FR-008, WCAG 1.4.3 — research D4). No motion, so
  `prefers-reduced-motion` is not applicable. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  state-less component token family `--ki-badge-*` (research D2) whose
  values reference the 001 semantic layer; zero hardcoded visual values;
  customization ladder tokens → `::part(badge)` → default slot. Deviation
  from the button naming template justified in the spec and research D2 (no
  state segments, no focus-ring tokens — the badge is static). Pill radius
  is a token, never an attribute (002 shape precedent); the
  filled-vs-outlined treatment is expressible purely through
  `border-width`/per-tone `border` values. Semantic-layer honesty,
  verified 2026-07-08 (research D2): the info/warning ramps exist in the
  built CSS of both themes and both schemes (material3 inherits them
  through the semantic cascade, 001 contract) — no semantic-token work is
  needed; if the extended contrast sweep surfaces an AA delta on
  info/warning in any context, that delta changes 001-shipped values and
  requires explicit founder sign-off at the merge gate (002 precedent).
  **PASS**
- **Art. VII — Simplicity & anti-abstraction**: two closed enum props and
  nothing else — no events, no methods, no state, no slot-emptiness
  machinery (no scenario demands visual collapse; research D1), no
  truncation machinery (research D3); unknown-value fallback is by CSS
  construction, not validation code. data-model.md omitted for the same
  reason (Summary). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; guardrail boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 additive delta — adds
  `ki-badge` (attributes `tone`/`size`, default slot, `badge` part,
  `--ki-badge-*` tokens; no events, no methods). Additive MINOR; packaging
  validated by the existing publint/attw gate. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on exports,
  size-limit budgets, tokens-sync + contrast on regenerated CSS,
  traceability on S-IDs, scenario families). One rule gap identified and
  closed in-plan: the contrast gate's component-layer sweep
  (`packages/tokens/scripts/check-contrast.mjs`, `COMPONENT_BG_PATTERN`,
  line ~170) only matches `--ki-button-*` pairs today, so the badge's five
  per-tone fg-on-bg pairs join the sweep in the same change that introduces
  the tokens (tasks T005) — the first contrast gating of the info/warning
  ramps in the material3 contexts; the gap is ruled, never left to review.
  **PASS**
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: the
  implement phase runs as an unattended loop in the Art. XI sandbox
  (`sandbox/loop.sh`, credential-free, egress allowlist) or as a supervised
  local session without permission bypass; no new credential surface.
  **PASS**

**Definition of done (Art. III)**: done is exclusively the deterministic gates
exiting 0 (`bash scripts/gates/gates-suite.sh`: constitution, traceability,
lint, typecheck, build, tests, and per-surface gates). Never self-assessed,
by agent or human.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): new element `ki-badge` (attributes:
  `tone`, `size`; slot: default; part: `badge`; component tokens:
  `--ki-badge-*`). No events, no methods, no sub-components. Additive MINOR;
  catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): static presentational component — expected
  marginal cost in the low single-digit KB gzipped, well inside the budget
  gate; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG pattern exists for a static badge and
  no new interaction pattern is introduced → no manual APG walkthrough
  required. Semantic HTML first: no ARIA role added; label exposed as static
  text; zero tab stops. axe zero violations across tone × size × theme ×
  scheme; contrast per FR-008; meaning-in-text per FR-003. No motion, so
  `prefers-reduced-motion` is not applicable.
- **Tokens** (Art. VI): new component token family `--ki-badge-*` —
  structure per size (`--ki-badge-{sm|md}-{height|padding-inline|radius|font-size|line-height}`),
  family-level typography and stroke (`--ki-badge-{font-family|font-weight|border-width}`,
  the 002 button convention; `border-width` is what makes a
  filled-vs-outlined pill treatment expressible as a token-layer decision)
  and color per tone (`--ki-badge-{tone}-{bg|fg|border}`) — resolving from
  the semantic layer; both shipped themes (onmars, material3) get component
  token files covering the full tone × size matrix. Deviation from the
  button naming template, justified: no interaction-state segments
  (`rest|hover|active|disabled`) and no focus-ring tokens, because the badge
  is static and never focusable. Semantic-layer honesty: material3 defines
  no info/warning color roles — under material3 those tones resolve through
  the shared info/warning ramps inherited via the semantic cascade (001
  contract), and FR-008's info/warning contrast in the two material3
  contexts has never been swept by the existing gate, so semantic-layer
  deltas may surface there; any such delta changes 001-shipped values and
  requires explicit founder sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a short textual
  status ("Active", "Beta", "Payment failed") labeling an adjacent item in a
  list, table row, or card header, with `tone` matching the intent. When NOT
  to use — notification counts or dots on navigation items (future overlay
  nav badge), removable/interactive chips (future component), messages that
  need attention, announcement or dismissal (ki-alert), long sentences, or
  empty/icon-only pills.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/badge-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suites; tokens →
research.md D2/D4 + tokens package changes (info/warning ramp existence
verified, contingency declared); agent legibility → JSDoc requirements
(Art. I line; carried today by `generated/docs.json` — the echo's "catalog
and llms.txt regenerate" lands with 017-agent-surfaces per founder decision
2026-07-08); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/010-ki-badge/
├── spec.md               # gate-1 input (approval pending)
├── feature.feature       # extracted Gherkin contract, S1–S8
├── plan.md               # this file
├── research.md           # Phase 0: decisions D1–D5
├── contracts/
│   └── badge-contract.md # Phase 1: public API + token contract
├── quickstart.md         # Phase 1: validation guide
└── tasks.md              # /speckit-tasks output
# data-model.md deliberately omitted (see Summary): no state, transitions or
# relationships exist; the two-enum attribute surface is frozen in
# contracts/badge-contract.md.
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-badge/            # via Nx generator, never by hand
│   ├── ki-badge.tsx                    # two reflected props, zero logic (research D1)
│   ├── ki-badge.css                    # tokens-only, logical properties, per-value selectors
│   ├── ki-badge.spec.tsx               # mock-doc; @spec:010-ki-badge
│   └── ki-badge.stories.tsx            # Storybook workshop (Polish phase)
├── src/index.ts                        # export added by the generator
├── browser-tests/
│   ├── ki-badge.browser.spec.ts        # real browser + axe; @spec:010-ki-badge
│   └── ki-badge.dark.browser.spec.ts   # forced dark scheme; @spec:010-ki-badge
├── generated/docs.json                 # regenerated on build
└── package.json                        # + ki-badge size-limit entries

packages/tokens/
├── tokens/component/badge.tokens.json            # state-less --ki-badge-* family (onmars)
├── tokens/component/badge.material3.tokens.json  # M3 shape/border/tone-role overrides
├── style-dictionary.config.mjs                   # + badge files in LAYERS/MATERIAL3_LAYERS
├── scripts/check-contrast.mjs                    # + badge tone sweep (research D4)
└── dist/css/*.css                                # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: identical factory layout to 002/009; the component
token layer directory already exists, so the structural novelty is the third
pair of component token files (`badge.*`) joining `button.*` (and `card.*`
when 009 lands), plus the badge pattern in the contrast sweep.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002/009 state, and belongs to a factory chore, not to this
plan — and ki-badge ships zero pure logic for it to measure.
