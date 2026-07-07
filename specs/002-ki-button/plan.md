# Implementation Plan: ki-button

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Branch**: `feat/ki-button` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ki-button/spec.md` (approved,
`.approved` marker recorded 2026-07-06)

## Summary

First real Kimen component: `<ki-button>`, a form-associated Stencil web
component whose API is the abstraction of the MarsUI and Material 3 button
patterns (five semantic emphasis levels × three tones × five sizes), styled
exclusively through a new `--ki-button-*` component token layer so that
onmars and material3 (and any future theme) resolve the full matrix from
tokens alone. Technical approach: a native `<button>` inside the shadow root
provides semantics, keyboard and disabled behavior for free; ElementInternals
plus a native-submitter proxy provides full form participation; appearance is
pure CSS over reflected attributes with fallback-by-construction for unknown
values. The factory smoke component `ki-hello` is removed (FR-014). Details
and rationales in [research.md](./research.md); API surface in
[contracts/button-contract.md](./contracts/button-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-button/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/factory pattern. Traceability
markers `// @spec:002-ki-button` with S-IDs on code lines.

**Target Platform**: evergreen browsers (current + previous Chromium/Firefox/
Safari); PR gate on Chromium, engine matrix via `KIMEN_BROWSER_MATRIX=1`.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (same caps
as ki-hello, whose budget entries ki-button replaces); token stylesheets stay
within their existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only, no hardcoded user-visible strings (the component renders
slotted content only), scaffold via Nx generator (never by hand), single
writer on `feat/ki-button`.

**Scale/Scope**: one component, 11 approved scenarios (S1–S11), ~215
component tokens (see research.md D4), removal of ki-hello.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiButton` (7 props, 3 slots, 2 parts) carries complete JSDoc including
  when-to-use/when-NOT-to-use; `generated/docs.json` and
  `src/components.d.ts` regenerate on build and are committed; ki-hello's
  generated entries disappear in the same regeneration. AGENTS.md is still
  hand-maintained (pre-Fase-2 pipeline) and needs no change. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/002-ki-button/feature.feature` S1–S11 (approved, sha-stamped
  `.approved`); the five families are covered (see spec table); nothing in
  this plan exceeds the approved scenarios — toggle, icon-only, loading and
  shape attribute stay out. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suite written against S1–S11 and verified
  failing before implementation (tasks enforce the order); tests assert
  through the public API (attributes, events, form data, accessibility
  tree). Mutation gate: gates-suite.sh does not yet wire Stryker (factory
  gap inherited from 001, tracked for a factory chore); compensating
  control: the only pure logic (form-action dispatch) is small and covered
  by explicit unit cases per branch. Done = `gates-suite.sh` exit 0. **PASS
  (with declared factory gap, unchanged from 001)**
- **Art. IV — Web standards & lightness**: native `<button>` in shadow DOM
  (no ARIA needed — semantics come from the element); logical properties
  only; no new runtime dependency ("none"); budgets as in Technical Context;
  `formAssociated` + ElementInternals per constitution. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard path native (Tab, Enter, Space), visible `:focus-visible` ring
  from tokens, ≥24×24 px targets in every size (xs enforces
  min-inline-size), disabled exposed through native semantics, transitions
  behind `prefers-reduced-motion`. Button is the repo's first interaction
  pattern → manual APG walkthrough documented in the PR. axe runs across
  the variant × tone × size matrix. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token layer `--ki-button-*` (geometry per size; color per
  variant × tone × state; elevation per variant × state) whose values
  reference the 001 semantic layer; zero hardcoded visual values;
  customization ladder tokens → `::part(button)`/`::part(label)` → slots.
  material3 proves the one-step re-theme on a real component (S9). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: one component, no base-class
  or "ButtonBase" abstraction, no speculative props (no loading, no shape,
  no toggle); unknown-value fallback is CSS-by-construction instead of JS
  validation. **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; no protocol type enters `@kimen/elements`; guardrail boundary
  untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 additive delta — adds
  `ki-button` (props/slots/parts/tokens per contract), removes the
  documented-as-temporary smoke element `ki-hello` (no deprecation cycle
  required pre-first-publish; roadmap scheduled its deletion). Packaging
  validated by the existing publint/attw gate. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on exports,
  size-limit budgets, tokens-sync on regenerated CSS, traceability on
  S-IDs). No new rule gap identified; if implementation surfaces one, the
  rule is added in the same change. **PASS**
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: the
  implement phase runs as an unattended loop in the Art. XI sandbox
  (`sandbox/loop.sh`, credential-free, egress allowlist) or as a supervised
  local session without permission bypass; no new credential surface. **PASS**

**Definition of done (Art. III)**: done is exclusively the deterministic gates
exiting 0 (`bash scripts/gates/gates-suite.sh`: constitution, traceability,
lint, typecheck, build, tests, and per-surface gates). Never self-assessed,
by agent or human.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): new element `ki-button` (attributes:
  `variant`, `tone`, `size`, `type`, `name`, `value`, `disabled`; slots:
  default, `start`, `end`; parts: `button`, `label`; component tokens:
  `--ki-button-*`). Removes the pre-release smoke element `ki-hello`
  (pre-1.0, no deprecation cycle required). Catalog and llms.txt regenerate
  with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG button pattern; first interaction pattern
  in the repo → manual APG walkthrough documented in the PR. axe zero
  violations across variant × tone × size × state.
- **Tokens** (Art. VI): introduces the component token layer
  (`--ki-button-*`) resolving from the semantic layer; both shipped themes
  (onmars, material3) must resolve the full matrix. No new primitive or
  semantic tokens are expected beyond what the matrix requires.
- **Catalog/agent legibility** (Art. I): when-to-use — the single or
  supporting action a person triggers in a view, hierarchy expressed by
  `variant`, destructive/confirming intent by `tone`. When NOT to use —
  navigation (use a link), icon-only actions (future icon-button),
  toggling state (future toggle component).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/button-contract.md; budget → size-limit entries (Technical
Context); accessibility → Art. V line + browser suite; tokens → research.md
D4 + tokens package changes; agent legibility → JSDoc requirements (Art. I
line); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/002-ki-button/
├── spec.md              # approved (.approved sha-stamped)
├── feature.feature      # extracted Gherkin contract, S1–S11
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D7
├── data-model.md        # Phase 1: API/state model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── button-contract.md   # Phase 1: public API + token contract
├── checklists/
│   └── requirements.md  # spec quality checklist (done)
└── tasks.md             # /speckit-tasks output (NOT created by plan)
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-button/          # via Nx generator, never by hand
│   ├── ki-button.tsx                  # native <button> + ElementInternals
│   ├── ki-button.css                  # tokens-only, logical properties
│   └── ki-button.spec.tsx             # mock-doc; @spec:002-ki-button
├── src/components/ki-hello/           # DELETED (FR-014)
├── src/index.ts                       # export swap hello → button
├── browser-tests/
│   ├── ki-button.browser.spec.ts      # real browser + axe; @spec:002-ki-button
│   └── ki-hello.browser.spec.ts       # DELETED
├── generated/docs.json                # regenerated on build
└── package.json                       # size-limit entries hello → button

packages/tokens/
├── tokens/component/button.tokens.json            # component layer (geometry + onmars matrix)
├── tokens/component/button.material3.tokens.json  # material3 matrix + shape overrides
├── style-dictionary.config.mjs                    # component layer wiring
└── dist/css/*.css                                 # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout established
by ki-hello and the 001 token layering; the only structural addition is
`packages/tokens/tokens/component/`, the layer the constitution names but no
feature had needed until now.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001 state, and belongs to a factory chore, not to this plan.
