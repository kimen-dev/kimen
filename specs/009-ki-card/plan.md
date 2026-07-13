# Implementation Plan: ki-card

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Branch**: `feat/ki-card` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-ki-card/spec.md`; founder
intent is confirmed in the working conversation or PR.

## Summary

`<ki-card>`: a non-interactive grouping container — the simplest component
of the Fase 2 batch. Four regions compose through slots (`media`, `header`,
default body, `footer`); absent regions collapse completely; the card adds
no role, no focus stop and no events of its own. Appearance is 100% tokens:
a new flat `--ki-card-*` family (surface, border, radius, elevation, gap,
per-region padding) resolving from the 001 semantic layer, with the M3
elevated/filled/outlined style axis expressed purely in theme token values
(no attribute — the 002 Round/Square precedent). The only JavaScript is
slot-emptiness tracking via `slotchange`, because CSS cannot observe
assigned nodes. Details and rationales in [research.md](./research.md); API
surface in [contracts/card-contract.md](./contracts/card-contract.md).

Proportionality note (Art. VII): ki-card has no attribute matrix, no form
model, no state machine and no interaction pattern, so this plan is
deliberately shorter than 002's. **data-model.md is omitted**: there is no
attribute, state or form model to describe — the entire public surface is
the slots/parts/tokens tables already frozen in
contracts/card-contract.md, and duplicating them would create a second
source of truth.

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (components reference `--ki-*`
custom properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc spec in `src/components/ki-card/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 002 pattern (light + dark spec
files). Traceability markers `// @spec:009-ki-card` with S-IDs on test
titles.

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded; expected far under — render-only container), worst case
component + Stencil runtime ≤ 25 KB (repo-standard caps, new entries added
for ki-card); token stylesheets stay within their existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (the component renders
slotted content only), scaffold via Nx generator (never by hand), single
writer on `feat/ki-card`.

**Scale/Scope**: one component, 8 approved scenarios (S1–S8), ~11 component
tokens + material3 overrides (see research.md D2). No removals.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiCard` (4 slots, 5 parts, host JSDoc) carries complete JSDoc including
  when-to-use/when-NOT-to-use (contracts/card-contract.md §Agent-facing
  metadata — including "the author supplies the heading element" and
  "never as a button or link"); `generated/docs.json` and
  `src/components.d.ts` regenerate on build and are committed. CEM and
  llms.txt surfaces arrive with 017-agent-surfaces; the Zod catalog is
  Fase 3 (founder 2026-07-08) — this plan regenerates the surfaces that
  exist today. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/009-ki-card/feature.feature` S1–S8; four families covered, form
  participation N/A-justified in the spec's coverage table (non-interactive
  container, charter-listed valid N/A); nothing here exceeds the approved
  scenarios — no variant/size/tone attribute, no whole-card click, no
  `actions` slot. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suites written against S1–S8 and verified
  failing before implementation (tasks enforce the order); tests assert
  through the public API (slots, geometry, accessibility tree, events).
  Mutation gate: Stryker still not wired into gates-suite.sh (factory gap
  inherited from 001/002, tracked as a factory chore); compensating
  control: the only pure logic (the slot-emptiness predicate, research D1)
  gets exhaustive unit cases per branch. Done = `gates-suite.sh` exit 0.
  **PASS (with declared factory gap, unchanged from 002)**
- **Art. IV — Web standards & lightness**: semantic HTML first means *no*
  added semantics here — generic divs and native slots, zero ARIA (FR-006);
  logical properties only (FR-012); no new runtime dependency ("none");
  budgets as in Technical Context. Not form-associated. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**: no
  APG pattern applies — APG covers interactive widgets and the card is
  deliberately non-interactive, so **no manual APG walkthrough** (charter
  flags dialog/tooltip/tabs/select, not card). The obligation is semantic
  transparency, asserted as behavior: zero added tab stops (S4), zero
  role/name/state contribution (S5), axe zero violations across region
  subsets × themes × schemes. No motion in v1, so no reduced-motion
  surface. Contrast of `--ki-card-fg`-on-`--ki-card-bg` rides the token
  contrast gate. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the flat
  component token family `--ki-card-*` (research D2) whose values reference
  the 001 semantic layer; zero hardcoded visual values; customization
  ladder tokens → `::part(card|media|header|body|footer)` → slots. The M3
  style axis lives in the material3 component-layer values (S6). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: zero props, zero events,
  zero speculative axes (no size/tone/variant, no `actions` slot, no
  whole-card interactivity); the only logic is the platform-mandated
  `slotchange` tracking; unknown-attribute fallback is by construction
  (nothing is observed), not validation code. data-model.md omitted for
  the same reason. **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; guardrail boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 additive delta — adds
  `ki-card` (slots/parts/tokens per contract; no attributes, no events).
  Additive MINOR; packaging validated by the existing publint/attw gate.
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on exports,
  size-limit budgets, tokens-sync + contrast on regenerated CSS,
  traceability on S-IDs, scenario families). One rule gap identified and
  closed in-plan: the contrast gate's component-layer sweep
  (`packages/tokens/scripts/check-contrast.mjs`) only matches
  `--ki-button-*` pairs today, so the card's fg-on-bg pair is added to the
  sweep in the same change that introduces the tokens (tasks T005) — the
  gap is ruled, never left to review. **PASS**
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

- **Public API delta** (Art. IX): new element `ki-card` (attributes: none in
  v1; events: none; slots: default, `media`, `header`, `footer`; parts:
  `card`, `media`, `header`, `body`, `footer`; component tokens:
  `--ki-card-*`). No sub-components. Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost — a
  render-only container with no interaction logic; no new runtime dependency
  ("none").
- **Accessibility** (Art. V): no APG pattern applies — APG covers interactive
  widgets and the card is deliberately non-interactive, so no manual APG
  walkthrough is required (charter flags dialog, tooltip, tabs, select). The
  obligation here is semantic transparency: no role, name or state of the
  card's own; axe zero violations across region combinations × themes ×
  schemes.
- **Tokens** (Art. VI): new component token family `--ki-card-*` in the
  component layer — surface (`bg`, `fg`), `border` color and `border-width`,
  `radius`, `elevation`, per-region `{media|header|body|footer}-padding`
  (padding lives on the regions, never on the surface, so a theme bleeds the
  media region by zeroing its padding — the shipped default in both themes),
  `gap` — resolving from the semantic layer
  (onmars surface ramp s0–s5 available since 001). No size, variant, tone or
  state axes: the card is static and non-interactive. Both shipped themes
  (onmars, material3) get component token files; the elevated/filled/outlined
  choice lives in those theme values. No semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — grouping related
  content (media, heading, supporting text, actions) into one scannable
  surface visually distinct from the page; the summary entry point to a
  detail. The author supplies the heading element itself in the `header`
  slot (e.g. `h2`/`h3`, at the level the surrounding document requires):
  the card neither generates nor wraps a heading, so plain text slotted
  into `header` carries no heading semantics. When NOT to use — as a
  clickable or link target (the card is
  non-interactive: slot a button or link inside instead), as a form control
  or fieldset, as a page landmark or section replacement, or nested inside
  another card.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/card-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suites; tokens →
research.md D2 + tokens package changes; agent legibility → JSDoc
requirements (Art. I line; carried today by `generated/docs.json` — the
echo's "catalog and llms.txt regenerate" lands with 017-agent-surfaces per
founder decision 2026-07-08); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/009-ki-card/
├── spec.md              # gate-1 input (approval pending)
├── feature.feature      # extracted Gherkin contract, S1–S8
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D4
├── contracts/
│   └── card-contract.md # Phase 1: public API + token contract
├── quickstart.md        # Phase 1: validation guide
└── tasks.md             # /speckit-tasks output
# data-model.md deliberately omitted (see Summary): no attribute, state or
# form model exists; the public surface lives in contracts/card-contract.md.
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-card/            # via Nx generator, never by hand
│   ├── ki-card.tsx                    # slots + emptiness tracking (research D1)
│   ├── ki-card.css                    # tokens-only, logical properties
│   ├── ki-card.spec.tsx               # mock-doc; @spec:009-ki-card
│   └── ki-card.stories.tsx            # Storybook workshop (Polish phase)
├── src/index.ts                       # export added by the generator
├── browser-tests/
│   ├── ki-card.browser.spec.ts        # real browser + axe; @spec:009-ki-card
│   └── ki-card.dark.browser.spec.ts   # forced dark scheme; @spec:009-ki-card
├── generated/docs.json                # regenerated on build
└── package.json                       # + ki-card size-limit entries

packages/tokens/
├── tokens/component/card.tokens.json            # flat --ki-card-* family (onmars)
├── tokens/component/card.material3.tokens.json  # M3 style axis in values
├── style-dictionary.config.mjs                  # + card files in LAYERS/MATERIAL3_LAYERS
└── dist/css/*.css                               # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: identical factory layout to 002; the component token
layer directory already exists, so the only structural novelty is the second
pair of component token files (`card.*`) joining `button.*`.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002 state, and belongs to a factory chore, not to this plan.
