# Implementation Plan: ki-list

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Branch**: `feat/ki-list` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-ki-list/spec.md` (pending
gate-1 approval; this plan is prepared alongside the Fase 2 spec batch and
implementation starts only after the `.approved` marker exists)

## Summary

`<ki-list>` + `<ki-list-item>`: a non-interactive, non-virtualized data
list — the parent renders slotted `ki-list-item` children in source order;
each item composes four regions through slots (`start`, default primary
text, `secondary`, `end`) and absent regions collapse completely. The pair
carries structural `list`/`listitem` semantics on the hosts via
`ElementInternals.role` (the only mechanism that gives AT an accurate item
count across shadow boundaries — research D1), adds zero focus stops, zero
events and zero observed attributes. Appearance is 100% tokens: new flat
families `--ki-list-*` / `--ki-list-item-*` resolving from the 001 semantic
layer, with the M3 divider axis expressed purely in theme token values (no
attribute — the 002 Round/Square precedent, research D3). The only
JavaScript is the 009-proven `slotchange` emptiness tracking, whose
has-secondary flag doubles as FR-003's one-line/multi-line min-height
discriminator (research D2). Details and rationales in
[research.md](./research.md); API surface in
[contracts/list-contract.md](./contracts/list-contract.md).

Proportionality note (Art. VII): like 009/010, this feature has no
attribute matrix, no form model, no state machine and no interaction
pattern, so this plan is deliberately shorter than 002's.
**data-model.md is omitted**: neither element has an attribute, state or
form model to describe — the entire public surface is the
slots/parts/tokens tables already frozen in contracts/list-contract.md, and
duplicating them would create a second source of truth (the 009/010
precedent).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (components reference `--ki-*`
custom properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs co-located with each component +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 002/009 pattern (light + dark
spec files). Traceability markers `// @spec:016-ki-list` with S-IDs on test
titles; the item's browser file carries anatomy only and defers S-IDs to
the list suite (research D6, the 007 composite convention).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: component pair (`packages/elements`) + component token
layer (`packages/tokens`).

**Performance Goals**: size-limit — marginal cost ≤ 9 KB gzipped per
component entry (runtime excluded; expected far under — render-only
containers), worst case component + Stencil runtime ≤ 25 KB (repo-standard
caps; new entries for both `ki-list` and `ki-list-item`); token stylesheets
stay within their existing 9 KB caps. SC-005's "low single-digit KB for the
pair" is asserted by the two marginal entries together.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (the components render
slotted content only), scaffold via Nx generator (never by hand; two
invocations, one per tag), single writer on `feat/ki-list`.

**Scale/Scope**: two elements, 11 approved scenarios (S1–S11), 19 component
tokens per theme + material3 overrides (research D4). No removals.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiList` (1 slot, 1 part) and `KiListItem` (4 slots, 4 parts) carries
  complete JSDoc including when-to-use/when-NOT-to-use
  (contracts/list-contract.md §Agent-facing metadata — including "never for
  menus, selectable option lists or tabular data" and "ki-list-item only
  inside ki-list"); `generated/docs.json` and `src/components.d.ts`
  regenerate on build and are committed. CEM and llms.txt surfaces arrive
  with 017-agent-surfaces; the Zod catalog is Fase 3 (founder 2026-07-08) —
  this plan regenerates the surfaces that exist today. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/016-ki-list/feature.feature` S1–S11; four families covered, form
  participation N/A-justified in the spec's coverage table (non-interactive
  data-display container, charter-listed valid N/A); nothing here exceeds
  the approved scenarios — no variant/size/tone attribute, no divider
  attribute, no selection, no virtualization, no truncation surface.
  **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc specs + browser suites written against S1–S11 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (slots, geometry, accessibility tree,
  keyboard). Mutation gate: Stryker still not wired into gates-suite.sh
  (factory gap inherited from 001/002, tracked as a factory chore);
  compensating control: the only pure logic (the 009 slot-emptiness
  predicate reused for three regions plus the min-height discriminator)
  gets exhaustive unit cases per branch. Done = `gates-suite.sh` exit 0.
  **PASS (with declared factory gap, unchanged from 002/009)**
- **Art. IV — Web standards & lightness**: semantic HTML first — and where
  it cannot reach (native `<ul>`/`<li>` cannot own slotted light-DOM
  children), the platform's designed alternative: default structural
  semantics via `ElementInternals.role`, zero interactive ARIA (research
  D1); logical properties only (FR-010; S9 is a tested scenario); no new
  runtime dependency ("none"); budgets as in Technical Context. Not
  form-associated. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**: no
  APG widget pattern applies — the APG list-adjacent patterns (listbox,
  menu, grid) are interactive widgets and ki-list is deliberately
  non-interactive, so **no manual APG walkthrough** (charter flags
  dialog/tooltip/tabs/select, not list). The obligation is correct
  structural semantics plus transparency, asserted as behavior: accurate
  item count in the computed accessibility tree (S6 — the verification
  point for D1's host-role architecture), zero added tab stops (S5),
  slotted controls operable exactly once (S11), axe zero violations across
  region subsets × themes × schemes × directions. Text contrast of the
  primary/secondary inks on the list surface rides the extended token
  contrast gate (Art. X line). No motion in v1, so no reduced-motion
  surface. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the flat
  component token families `--ki-list-*` (3) and `--ki-list-item-*` (16)
  (research D4) whose values reference the 001 semantic layer (surface ramp,
  text emphasis levels, typography roles, space/radius primitives); zero
  hardcoded visual values; customization ladder tokens →
  `::part(list|item|start|content|end)` → slots. The M3 divider axis lives
  in the material3 component-layer values (S7, research D3). One declared
  additive refinement over the spec's token enumeration:
  `--ki-list-item-padding-block` (research D4, flagged for gate-1
  ratification). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: zero props, zero events,
  zero speculative axes (no size/density/variant/tone, no divider
  attribute, no truncation surface, no third text region, no
  virtualization); the only logic is the platform-mandated `slotchange`
  tracking reused from 009; unknown-attribute fallback is by construction
  (nothing is observed), not validation code. data-model.md omitted for the
  same reason. **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; guardrail boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 additive delta — adds
  `ki-list` and its sub-component `ki-list-item` (slots/parts/tokens per
  contract; no attributes, no events on either). Additive MINOR; packaging
  validated by the existing publint/attw gate; the two tags ship and
  version together in `@kimen/elements` (sub-component rule, FR-012).
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on both CSS files, ESLint/tsc strict on the TSX, knip on
  exports, size-limit budgets, tokens-sync on regenerated CSS, traceability
  on S-IDs, scenario families). One rule gap identified and closed in-plan:
  the contrast gate's component-layer sweep
  (`packages/tokens/scripts/check-contrast.mjs`) only matches
  `--ki-button-*` pairs today, so the list's two text pairs
  (`--ki-list-item-{primary|secondary}-fg` on `--ki-list-bg`, 4.5:1 text
  minimum) are added to the sweep in the same change that introduces the
  tokens (tasks T006) — the gap is ruled, never left to review. Batch
  coordination with 009/010/011 (same file, sibling branches) noted in
  tasks.md. **PASS**
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

- **Public API delta** (Art. IX): two new elements. `ki-list` (attributes:
  none in v1; events: none; slots: default, restricted to `ki-list-item`
  children; parts: `list`; component tokens: `--ki-list-*`) and its
  sub-component `ki-list-item` (attributes: none in v1; events: none; slots:
  default (primary text), `secondary`, `start`, `end`; parts: `item`,
  `start`, `content`, `end`; component tokens: `--ki-list-item-*`). Additive
  MINOR; catalog and llms.txt regenerate with both entries.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost for
  the pair — render-only containers with no interaction logic, no
  virtualization; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG widget pattern applies — the APG
  list-adjacent patterns (listbox, menu, grid) are interactive widgets and
  ki-list is deliberately non-interactive, so no manual APG walkthrough is
  required (the charter flags dialog, tooltip, tabs and select's listbox).
  The obligation here is correct list/list-item semantics plus transparency
  for slotted interactive content: accurate item count, no spurious
  interactive roles or focus stops. Semantic HTML alone cannot carry the
  semantics in this architecture — the items are slotted custom elements in
  the light DOM, so a `<ul>` inside the ki-list shadow root would wrap only
  a `<slot>` and expose a list of zero items — therefore the hosts carry
  the structural roles `list` / `listitem` (host `role` attribute or
  `ElementInternals.role`), per FR-005. These are document-structure roles,
  not an APG interactive widget pattern, so the "no ARIA is better than
  wrong ARIA" rule is not contradicted. axe zero violations across region
  combinations × themes × schemes × directions.
- **Tokens** (Art. VI): new component token families `--ki-list-*` (surface,
  padding, gap) and `--ki-list-item-*` (min-height per line count — exactly
  two steps, one-line and multi-line, per FR-003's discriminator —
  padding-inline, gap, divider color/width, radius, primary/secondary font
  and foreground tokens) resolving from the semantic layer — onmars surface
  ramp s0–s5 and text emphasis levels available since 001. No variant, tone,
  size or state axes: the list is static and non-interactive. Both shipped
  themes (onmars, material3) get component token files; the divider-vs-
  spacing choice lives in those theme values. No semantic-layer deltas
  expected.
- **Catalog/agent legibility** (Art. I): when-to-use — a read-only vertical
  collection of similar entries (settings, contacts, results, activity
  feeds) where each item composes leading media, up to two text lines and
  trailing meta or a slotted control. When NOT to use — menus or command
  lists (future menu component), selectable option lists (use ki-select),
  multi-column tabular data (the complex data table is a separate roadmap
  item, explicitly out of v1), navigation, or a single item outside a list.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/list-contract.md; budget → new size-limit entries for both tags
(Technical Context); accessibility → Art. V line + research D1 + browser
suites; tokens → research D4 + tokens package changes (with the
`padding-block` addition declared in the Art. VI line and batched for
gate-1); agent legibility → JSDoc requirements (Art. I line; carried today
by `generated/docs.json` — the echo's "catalog and llms.txt regenerate"
lands with 017-agent-surfaces per founder decision 2026-07-08); guardrail →
none.

## Project Structure

### Documentation (this feature)

```text
specs/016-ki-list/
├── spec.md              # gate-1 input (approval pending)
├── feature.feature      # extracted Gherkin contract, S1–S11
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D6
├── contracts/
│   └── list-contract.md # Phase 1: public API + token contract (both tags)
├── quickstart.md        # Phase 1: validation guide
└── tasks.md             # /speckit-tasks output
# data-model.md deliberately omitted (see Summary): no attribute, state or
# form model exists; the public surface lives in contracts/list-contract.md.
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-list/                 # via Nx generator, never by hand
│   ├── ki-list.tsx                         # internals.role='list' + slot (research D1/D2)
│   ├── ki-list.css                         # tokens-only; ::slotted divider rule (research D3)
│   ├── ki-list.spec.tsx                    # mock-doc; @spec:016-ki-list
│   └── ki-list.stories.tsx                 # Storybook workshop (Polish phase)
├── src/components/ki-list-item/            # second generator invocation
│   ├── ki-list-item.tsx                    # internals.role='listitem' + regions (research D2)
│   ├── ki-list-item.css                    # tokens-only, logical properties
│   └── ki-list-item.spec.tsx               # mock-doc; @spec:016-ki-list
├── src/index.ts                            # exports added by the generator
├── browser-tests/
│   ├── ki-list.browser.spec.ts             # real browser + axe; S-ID carrier
│   ├── ki-list-item.browser.spec.ts        # anatomy only; defers S-IDs (research D6)
│   └── ki-list.dark.browser.spec.ts        # forced dark scheme; S8
├── generated/docs.json                     # regenerated on build
└── package.json                            # + ki-list & ki-list-item size-limit entries

packages/tokens/
├── tokens/component/list.tokens.json            # ki.list.* + ki.list.item.* (onmars)
├── tokens/component/list.material3.tokens.json  # M3 divider axis in values
├── scripts/check-contrast.mjs                   # + list text pairs in the sweep
├── style-dictionary.config.mjs                  # + list files in LAYERS/MATERIAL3_LAYERS
└── dist/css/*.css                               # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: identical factory layout to 002/009 with the 007
two-element convention (one generator invocation per tag, both under this
spec); the only structural novelty is the third pair of component token
files (`list.*`) joining `button.*` (and the batch siblings').

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002 state, and belongs to a factory chore, not to this plan.
