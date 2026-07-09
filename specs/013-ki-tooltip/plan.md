# Implementation Plan: ki-tooltip

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-tooltip` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-ki-tooltip/spec.md` (gate-1
review in progress on `feat/fase2-specs`; implementation is blocked by the
pre-implement gate until the sha-stamped `.approved` marker exists).

## Summary

First overlay component of the library: `<ki-tooltip>`, a supplementary-text
web component whose default slot wraps exactly one interactive trigger and
whose text-only `label` reveals on pointer hover AND keyboard focus, hides
on leave/blur/Escape, and describes the trigger to assistive technology
without ever changing its name. The central technical problem is the
description association across the shadow boundary — the trigger lives in
light DOM, the tooltip text in the component's shadow root, and
`aria-describedby` IDREFs cannot cross shadow roots: the decision is to
reflect `label` to the **`aria-description` attribute of the slotted
trigger** (blessed verbatim by FR-002), with engine support measured by the
real-browser suite, real-AT announcement verified by the mandatory APG
walkthrough, and a light-DOM description-node fallback recorded as the
contingency (research D2). Reveal/dismiss is a small host-listener state
machine (`pointerenter/leave` + composed `focusin/focusout`) with
hover-intent and linger delays resolved from two new duration tokens
(D3); Escape is consumed at the document capture phase so an ancestor
dialog stays open — S16 is proven against a real native `<dialog>` (D5).
Positioning is in-house and CSS-logical (no floating-ui, no anchor
positioning until Firefox ships it): one measured flip/clamp pass per
reveal through an exhaustively unit-tested pure function (D4). v1 ships no
animation — reduced motion holds by construction; the temporal design lives
in the tokenized delays (D6). New `--ki-tooltip-*` token family (13/theme,
both themes) — the first component consumer of the 001 inverse ramp (no
semantic-layer delta needed: the inverse vocabulary already exists) — and
the contrast sweep is extended with the tooltip's text pair at 4.5:1 (D8).
Details and rationales in [research.md](./research.md) (D1–D10); API
surface in [contracts/tooltip-contract.md](./contracts/tooltip-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency — positioning is in-house, research D4). Tokens via
`@kimen/tokens` (workspace dev dependency, CSS consumed by tests and docs
only — components reference `--ki-*` custom properties, never import token
sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-tooltip/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002 pattern (light + dark
spec files, plus a NEW reduced-motion-emulating instance mirroring the dark
split for S17 — research D9). Hover and focus are exercised with REAL
pointer and keyboard input, never synthetic dispatch. Determinism: the
show/hide delays are the component's own timers with token-pinned fixture
values and fake timers — no real-time sleeps (Art. III). Traceability
markers `// @spec:013-ki-tooltip` with S-IDs on code lines (test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`. `aria-description` exposure is asserted by the
suite itself on every gated engine (research D2).

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`) + one deterministic-gate extension
(`packages/tokens/scripts/check-contrast.mjs`, research D8) + one
test-infra extension (reduced-motion vitest instance, research D9).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (new
entries added alongside the existing ones); token stylesheets stay within
their existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only (placements `start`/`end` follow writing direction by
construction), no hardcoded user-visible strings (the component renders the
consumer's `label` and slotted trigger only), no hardcoded timing values
(delays resolve from tokens, research D3/D8), scaffold via Nx generator
(never by hand), single writer on `feat/ki-tooltip`.

**Scale/Scope**: one component, 17 approved scenarios (S1–S17), 13
component tokens per theme (research D8), one gate extension (contrast
sweep pair), one test-infra extension (reduced-motion instance), no
removals — purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiTooltip` (2 attributes, 1 slot, 1 part) carries complete JSDoc
  including when-to-use/when-NOT-to-use — the known agent confusions this
  entry must prevent are essential-information-in-a-tooltip and
  rich/interactive content (that is the future popover, FR-012);
  `generated/docs.json` and `src/components.d.ts` regenerate on build and
  are committed — docs.json is the machine surface that exists today. CEM
  and llms.txt arrive with 017-agent-surfaces (in progress); the Zod
  catalog is deferred to Fase 3 (founder decision 2026-07-08). This plan's
  obligation is that the JSDoc contract is complete so those surfaces
  regenerate from it without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/013-ki-tooltip/feature.feature` S1–S17 (gate-1 review in
  progress; the pre-implement gate blocks execution until the `.approved`
  marker is recorded); four families covered, form participation
  N/A-justified in the spec's coverage table (transient descriptive
  overlay, not a form control); nothing in this plan exceeds the approved
  scenarios — no arrow part, no show/hide events, no rich content slot, no
  touch gesture, no global only-one-visible coordination, no
  scroll/resize tracking while open. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suites written against S1–S17 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, real input, the accessibility
  tree, resolved styles). Determinism: delays are component-owned timers
  with token-pinned fixtures and fake timers (research D9). Mutation gate:
  gates-suite.sh still does not wire Stryker (factory gap inherited from
  001/002, tracked as a factory chore); compensating control: the pure
  logic (`normalizePlacement`, `resolveTooltipPosition`, `parseDelay`)
  lives in small pure modules (`ki-tooltip.position.ts`,
  `ki-tooltip.delay.ts`) with exhaustive unit cases per branch. Done =
  `gates-suite.sh` exit 0. **PASS (with declared factory gap, unchanged
  from 002/008/011)**
- **Art. IV — Web standards & lightness**: semantic-first with the minimum
  ARIA the APG tooltip pattern requires — `role="tooltip"` on the bubble
  and ONE description-related attribute (`aria-description`) on the
  trigger, which FR-002 contractually blesses; Reference Target is NOT
  load-bearing (constitution ruling honored: element reflection /
  Reference Target rejected as the association path, research D2 — it
  cannot reach into a descendant shadow root anyway); logical properties
  only (S11 by construction); no new runtime dependency ("none" — the
  positioning is one pure function, research D4, the spec's declared
  default); budgets as in Technical Context. Not form-associated. No
  user-visible strings originate in the component. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard parity is the component's reason to exist — focus reveals with
  no delay, Escape dismisses without moving focus or activating the
  trigger (SC-001/SC-002); WCAG 1.4.13 trio (dismissible/hoverable/
  persistent) implemented by the state machine and asserted by S2/S5/S12;
  the tooltip adds no tab stop and contains nothing interactive (FR-006);
  no motion in v1, so FR-010's reduced-motion clause holds by construction
  AND is still measured under real reduced-motion emulation (S17, research
  D6/D9). The tooltip pattern is NEW to the repo → **manual APG walkthrough
  REQUIRED** and documented in the PR (research D10), including the
  real-AT verification of the `aria-description` announcement (the D2
  contingency trigger) and the composite-trigger check. Text contrast of
  the label over the bubble is CI-gated at 4.5:1 by the extended sweep
  (research D8). axe zero violations across placements × themes × schemes.
  Cross-spec: Escape precedence with 012-ki-dialog is resolved by
  construction and proven against a native `<dialog>` (S16, research D5);
  the coordination note for 012's plan is recorded in research D5. **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token family `--ki-tooltip-*` (structure, inverse color pair,
  typography, shadow — plus `show-delay`/`hide-delay`, two duration tokens
  that EXTEND the family enumeration in the spec's constitutional surface:
  declared here and flagged for the founder at gate 1; the alternative is
  hardcoded milliseconds in TS, which Art. VI forbids for design values) —
  13 per-theme values referencing the 001 semantic layer; plan-time
  finding: NO semantic-layer delta needed — the inverse vocabulary
  (`ki.surface.inverse-*`, `ki.text.high-em-inverse`) already ships in 001
  and the tooltip is its first component consumer. Zero hardcoded visual
  values; customization ladder tokens → `::part(tooltip)` → default slot.
  material3 proves one-step re-theming (S9). **PASS (with one declared
  token-family addition for gate-1 sign-off)**
- **Art. VII — Simplicity & anti-abstraction**: one component; no overlay/
  popover base abstraction anticipating 012/future popover (duplication
  before the wrong abstraction); sibling decisions CITED and reused, not
  re-derived (002 indirection + fallback-by-construction, 007 cross-shadow
  verification discipline, 011 no-motion and sweep-extension design); no
  speculative surface (no events, no arrow, no size/tone axes, no delay
  props — delays are tokens, not API); unknown-placement fallback is one
  tested pure-function branch feeding CSS classes (research D4). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-tooltip` (attributes `label`, `placement`; default slot; part
  `tooltip`; tokens `--ki-tooltip-*`; no events, no methods, no
  sub-components). Future additions named by the spec (arrow part,
  show/hide events, touch gesture, fade motion) are all MINOR-additive.
  Packaging validated by the existing publint/attw gate; new per-component
  export `dist/components/ki-tooltip.js` follows the established build
  output. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on
  exports, size-limit budgets, tokens-sync, traceability on S-IDs,
  scenario families). One rule gap is KNOWN IN ADVANCE and closed in this
  feature: the contrast sweep's per-component pattern list does not match
  `--ki-tooltip-*` — the sweep is extended (label text pair at 4.5:1,
  per-pattern zero-match guard) in the same change that adds the tokens,
  never left to review (research D8; coordinate with the 008/011
  per-pair-minimum mechanism — whichever merges first lands it, the others
  rebase). **PASS**
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

- **Public API delta** (Art. IX): new element `ki-tooltip` (attributes:
  `label`, `placement`; slot: default (the trigger); part: `tooltip`;
  component tokens: `--ki-tooltip-*`; no events and no sub-components in
  v1). Purely additive. Catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost. No new
  runtime dependency planned ("none"); if plan-time analysis shows
  viewport-aware repositioning warrants a positioning utility, that
  dependency must be justified against the budget at plan time — the default
  is in-house logic.
- **Accessibility** (Art. V): APG tooltip pattern — a NEW interaction
  pattern in the repo → manual APG walkthrough REQUIRED and documented in
  the PR. Description semantics (name never overridden), Escape dismissal,
  WCAG 1.4.13 (dismissible / hoverable / persistent), keyboard parity with
  hover. axe zero violations across placements × themes × schemes.
  Cross-spec dependency: Escape precedence with 012-ki-dialog — the tooltip
  consumes the Escape that dismisses it so an ancestor dialog stays open
  (FR-013, S16); noted for the 012 implementation.
- **Tokens** (Art. VI): new component token family `--ki-tooltip-*` —
  structure (`radius`, `padding-inline`, `padding-block`, `max-inline-size`,
  `offset`), color (`bg`, `fg`), typography (`font-size`, `font-weight`,
  `line-height`) and `shadow` — resolving from the semantic layer; both
  shipped themes (onmars, material3) get component token files. No
  semantic-layer deltas anticipated; if the inverse-surface pairing turns
  out to need a new semantic token, the delta is declared at implementation
  and requires founder sign-off (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a brief text hint
  that clarifies a control (icon-only buttons, abbreviations, truncated
  labels); the same information must be discoverable elsewhere. When NOT to
  use — essential or unique information (put it in the layout), interactive
  or rich content (future popover), form validation messages (the field's
  own validation display), disabled controls (unreachable by keyboard/AT),
  touch-primary flows.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/tooltip-contract.md (plus the two duration tokens declared in
Art. VI above — a family-internal addition raised for gate-1 sign-off);
budget → new size-limit entries and the in-house-positioning decision the
echo's dependency clause asks this plan to make (research D4: "none",
justified); accessibility → Art. V line + browser suite (S1–S8, S12–S17) +
the mandatory walkthrough task (Polish phase, research D10); tokens →
research D8 + tokens package changes, with the plan-time finding that the
anticipated inverse semantic delta is NOT needed (001 already ships the
inverse ramp); agent legibility → JSDoc requirements (Art. I line; carried
today by `generated/docs.json` — the echo's "catalog and llms.txt
regenerate" lands with 017-agent-surfaces per founder decision 2026-07-08);
guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/013-ki-tooltip/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S17
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: attribute/state/association model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── tooltip-contract.md  # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-tooltip/            # via Nx generator, never by hand
│   ├── ki-tooltip.tsx                    # slot + conditional role="tooltip" bubble; host state machine; aria-description reflection
│   ├── ki-tooltip.css                    # tokens-only, logical properties, --_ki-tooltip-* indirection; placement classes
│   ├── ki-tooltip.position.ts            # pure logic: normalizePlacement, resolveTooltipPosition (flip/clamp)
│   ├── ki-tooltip.delay.ts               # pure logic: parseDelay (token value → ms)
│   ├── ki-tooltip.spec.tsx               # mock-doc; @spec:013-ki-tooltip
│   └── ki-tooltip.stories.tsx            # Storybook (Polish phase)
├── src/index.ts                          # export added by the generator
├── browser-tests/
│   ├── ki-tooltip.browser.spec.ts        # real browser + axe; real hover/focus; @spec:013-ki-tooltip
│   ├── ki-tooltip.dark.browser.spec.ts   # forced-dark theming (002 split)
│   └── ki-tooltip.motion.browser.spec.ts # reduced-motion emulation (NEW instance, mirrors the dark split)
├── vitest.browser.config.ts              # + reduced-motion-emulating instance (research D9)
├── generated/docs.json                   # regenerated on build, committed
└── package.json                          # + ki-tooltip size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/tooltip.tokens.json            # component layer (structure + inverse pair + typography + shadow + delays, onmars)
├── tokens/component/tooltip.material3.tokens.json  # material3 overrides (M3 inverse-surface plain tooltip)
├── scripts/check-contrast.mjs                      # + tooltip text pair at 4.5:1 (D8)
├── scripts/check-contrast.test.mjs                 # + unit cases for the extension
├── style-dictionary.config.mjs                     # + tooltip files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                  # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button and planned identically for the Fase 2 siblings; the component
token layer directory already exists (002), so the structural changes are
two new token source files wired into the existing Style Dictionary layer
lists, the mandated per-component contrast-sweep extension, and one
test-infra addition (the reduced-motion vitest instance, needed because S17
is a media-feature scenario the existing light/dark instances cannot
emulate). The two pure-logic modules (`ki-tooltip.position.ts`,
`ki-tooltip.delay.ts`) mirror 007's `ki-radio-group.keyboard.ts` role as
the mutation-gap compensating control.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002 state, and belongs to a factory chore, not to this plan.
Two items are declared for founder attention at gate 1 (not violations):
the `show-delay`/`hide-delay` duration tokens extending the spec's
enumerated `--ki-tooltip-*` list (Art. VI line), and the walkthrough's
touch-gesture note feeding the spec's open question.
