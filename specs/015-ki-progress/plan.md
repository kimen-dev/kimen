# Implementation Plan: ki-progress

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-progress` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-ki-progress/spec.md`;
founder intent is confirmed in the working conversation or PR, without a
repository approval marker.

## Summary

`<ki-progress>`: a non-interactive, output-only indicator of task
advancement — determinate via `value`/`max` (clamped, malformed-safe) or
explicitly `indeterminate` for unknown-duration work — rendered `linear` or
`circular` through one `shape` attribute where Material 3 ships two
components plus a loading indicator (Art. VII). Technical approach: one
stable shadow node carrying `role="progressbar"` with
`aria-valuemin/max/now` (valuenow omitted when indeterminate) and
`aria-label` from the required `label` prop; native `<progress>` and
ElementInternals ARIA evaluated and rejected on constitutional grounds
(research D1). Pure normalization helpers clamp `value`/`max` and resolve
`shape` (the S14 table verbatim as unit cases — the mutation-gap
compensating control, research D2). Linear fill = logical `inline-size`
from a private fraction custom property (RTL free); circular fill = SVG
ring with `pathLength="100"` so token-driven size/stroke never touch the
dash arithmetic (conic-gradient rejected: it cannot expose `track`/
`indicator` as separate parts, research D3/D4). The indeterminate
animation — the component's only motion — is declared exclusively inside
`@media (prefers-reduced-motion: no-preference)`, making FR-009's
zero-indefinite-animations oracle hold by construction (research D5). New
7-token family `--ki-progress-*` including the system's first motion token
(`--ki-progress-indeterminate-duration`, a literal — no semantic motion
family exists; research D6); the contrast sweep gains the indicator-on-track
pair at the WCAG 1.4.11 non-text 3:1 minimum, coordinated with 008/010's
extensions of the same script (research D7). Details and rationales in
[research.md](./research.md) (D1–D8); API surface in
[contracts/progress-contract.md](./contracts/progress-contract.md).

Proportionality note (Art. VII): like 009/010, ki-progress has no form
model and no interaction pattern, so this plan is shorter than 002/008's —
but unlike ki-badge it DOES carry pure logic (normalization arithmetic) and
runtime state exposure (ARIA values, animation modes), so
[data-model.md](./data-model.md) exists: it models the normalization
pipeline, the mode precedence and the ARIA exposure that S13–S15 assert.

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (components reference `--ki-*`
custom properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc spec in `src/components/ki-progress/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/` (light + dark spec files, 002 pattern);
the browser-test config gains an `emulateReducedMotion` command for S6
(add-if-absent — 008 plans the identical command; research D8).
Traceability markers `// @spec:015-ki-progress` with S-IDs on code lines.

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`) + one deterministic-gate extension
(`packages/tokens/scripts/check-contrast.mjs`, research D7).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded; expected low — two render branches, three pure helpers,
one keyframe pair), worst case component + Stencil runtime ≤ 25 KB
(repo-standard caps, new entries added for ki-progress); token stylesheets
stay within their existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only (linear fill via `inline-size`, indeterminate travel via
`inset-inline-start` — research D3/D5), no hardcoded user-visible strings
(`label` is consumer-provided; no fallback string exists), scaffold via Nx
generator (never by hand), single writer on `feat/ki-progress`.

**Scale/Scope**: one component, 15 approved scenarios (S1–S15), 7 component
tokens per theme (research D6), one gate extension (contrast sweep pair +
per-pair minimum if 008 has not landed it first), no removals — purely
additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiProgress` (5 props, 2 parts, host JSDoc) carries complete JSDoc
  including when-to-use/when-NOT-to-use — steering agents away from static
  measurements (gauge/meter), wizard steps (stepper), skeleton placeholders
  and sub-second flashes (contracts/progress-contract.md §Agent-facing
  metadata); `generated/docs.json` and `src/components.d.ts` regenerate on
  build and are committed — docs.json is the machine surface that exists
  today. CEM and llms.txt arrive with 017-agent-surfaces (in progress); the
  Zod catalog is Fase 3 (founder 2026-07-08). This plan's obligation is
  JSDoc completeness so those surfaces regenerate without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/015-ki-progress/feature.feature` S1–S15 (pre-plan gate PASS
  2026-07-08: lint green, 15 scenarios, IDs unique, one When each); four
  families covered, form participation N/A-justified in the spec's coverage
  table (output-only status, never carries user input); nothing here
  exceeds the approved scenarios — no `size`, no `tone`, no buffer value,
  no paused/error states, no live region, no determinate fill transition,
  no visible label rendering. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suites written against S1–S15 and
  verified failing before implementation (tasks enforce the order); tests
  assert through public APIs (attributes, computed styles/geometry,
  `getAnimations()` state, accessibility tree, tab order) with
  deterministic oracles — FR-009 defines the animation oracles verbatim, no
  timing sleeps or screenshots. Mutation gate: Stryker still not wired into
  gates-suite.sh (factory gap inherited from 001/002/008/009/010, a factory
  chore); compensating control: ALL pure logic lives in
  `ki-progress.math.ts` (`normalizeMax`, `clampValue`, `resolveShape`) with
  exhaustive unit cases per branch — the S14 table transcribed verbatim
  (research D2). Done = `gates-suite.sh` exit 0. **PASS (with declared
  factory gap, unchanged from siblings)**
- **Art. IV — Web standards & lightness**: platform-first was *evaluated
  honestly and declined with cause*: native `<progress>` cannot satisfy
  tokens-only cross-engine theming (engine-proprietary pseudo-elements
  cannot carry parts), has no circular shape, and models indeterminate by
  omission where the spec mandates an explicit attribute — research D1
  records the full assessment. The chosen `div[role=progressbar]` is the
  ARIA-sanctioned equivalent with one node. Logical properties only
  (`inline-size` fill, `inset-inline-start` travel — S12 RTL by
  construction); no new runtime dependency ("none"); budgets in Technical
  Context; not form-associated (and ElementInternals rejected *because*
  Stencil would force form association, research D1). **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  role progressbar per the ARIA spec with name from `label`
  (`aria-label`), value/range exposed in determinate mode, no value in
  indeterminate mode (S8/S9); zero tab stops — a generic div is never
  focusable (S7); no pointer target obligations (non-interactive, no
  ≥24 px target applies); the component's ONLY motion is the indeterminate
  animation, declared exclusively under
  `prefers-reduced-motion: no-preference` so reduced motion observes zero
  indefinitely-running animations (S6, FR-009's deterministic oracle,
  research D5); indicator-on-track non-text contrast 3:1 gate-covered in
  all four theme × scheme contexts (FR-012, research D7); axe zero
  violations across shape × mode × theme × scheme. NO manual APG
  walkthrough: no APG interaction pattern exists for a non-interactive
  output element and none is introduced (spec Constitutional Surface;
  charter scopes walkthroughs to dialog/tooltip/tabs/select). **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  7-token family `--ki-progress-*` (per-shape geometry, per-part color, one
  motion duration) resolving from the 001 semantic layer — with one
  declared, justified exception: `--ki-progress-indeterminate-duration` is
  the system's FIRST motion token and no semantic motion family exists to
  reference, so its value is a component-layer literal (creating
  `ki.motion.*` for one consumer would be speculative — Art. VII; research
  D6). Zero hardcoded visual values in component CSS; the runtime fraction
  custom property is state, not appearance (research D3). Customization
  ladder tokens → `::part(track)`/`::part(indicator)` → (no slots exist).
  Documented deviation from the button naming template: no
  interaction-state segments, no focus-ring tokens — static output, never
  focusable (spec Art. VI echo; 010 precedent). No semantic-layer delta
  expected; if the contrast gate surfaces one it changes 001-shipped values
  and requires explicit founder sign-off at the merge gate (002 precedent).
  **PASS**
- **Art. VII — Simplicity & anti-abstraction**: one component absorbs M3's
  two-plus-one progress artifacts; five props and nothing else — no events,
  no methods, no slots, no live region, no size/tone/buffer axes, no
  determinate transition; sibling decisions CITED not re-derived (002
  indirection + unknown-value fallback, 008 reduced-motion suppression +
  per-pair contrast minimum + `emulateReducedMotion`, 010 non-interactive
  proportionality); no shared "IndicatorBase" abstraction is created.
  **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; guardrail boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-progress` (attributes `value`/`max`/`indeterminate`/`shape`/`label`;
  parts `track`/`indicator`; tokens `--ki-progress-*`; no slots, no events,
  no methods). Additive MINOR; packaging validated by the existing
  publint/attw gate; per-component export `dist/components/ki-progress.js`.
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties, ESLint/tsc strict, knip, size-limit, tokens-sync,
  traceability, scenario families). One rule gap KNOWN IN ADVANCE and
  closed in this feature: the contrast sweep does not match
  `--ki-progress-*` — the indicator-on-track pair joins the sweep at the
  1.4.11 non-text 3:1 minimum in the same change that ships the tokens,
  never left to review; the per-pair-minimum mechanism is shared with 008
  and added here if 008 has not landed it first (declared coordination,
  research D7). **PASS**
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

- **Public API delta** (Art. IX): new element `ki-progress` (attributes:
  `value`, `max`, `indeterminate`, `shape`, `label`; parts: `track`,
  `indicator`; component tokens: `--ki-progress-*`). No slots, no events, no
  methods, no sub-components. Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): output-only component with one CSS animation
  and no text content — expected marginal cost in the low single-digit KB
  gzipped, well inside the budget gate; no new runtime dependency ("none").
- **Accessibility** (Art. V): role progressbar per the ARIA specification;
  no dedicated APG interaction pattern exists for a non-interactive output
  element and no new interaction pattern is introduced → no manual APG
  walkthrough required. Accessible name required via `label`; determinate
  value/range exposed, indeterminate exposes no value; zero tab stops; axe
  zero violations across shape × mode × theme × scheme; non-text contrast
  per FR-012; `prefers-reduced-motion` honored per FR-009 (the component's
  only motion is the indeterminate animation).
- **Tokens** (Art. VI): new component token family `--ki-progress-*` —
  structure per shape (`--ki-progress-linear-{thickness|radius}`,
  `--ki-progress-circular-{size|track-width}`), color per anatomy part
  (`--ki-progress-{track|indicator}-color`) and motion
  (`--ki-progress-indeterminate-duration`) — resolving from the semantic
  layer; both shipped themes (onmars, material3) get component token files
  covering the shape × mode matrix. Deviation from the button naming
  template, justified: no interaction-state segments
  (`rest|hover|active|disabled`) and no focus-ring tokens, because the
  progress is static output and never focusable; a motion token appears for
  the first time. No semantic-layer deltas expected; if the contrast gate's
  arithmetic surfaces one, it requires explicit founder sign-off at the
  merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — communicate the
  advancement of an ongoing task (upload, download, installation, multi-step
  processing) with `value`/`max` when the fraction is known, or ongoing
  activity of unknown duration with `indeterminate` (including the
  loading-indicator use); `shape` follows the layout context (linear in
  flows and lists, circular in compact or centered placements). When NOT to
  use — static measurements within a known range (disk usage, scores: a
  gauge/meter concern, not a task), step-by-step wizard navigation (a
  stepper concern), skeleton placeholders while content loads, or operations
  that finish in under about one second, where a flash of progress is noise.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/progress-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suites (S6–S9 and the axe
matrix); tokens → research.md D6/D7 + tokens package changes (including the
sweep extension the token echo's contrast clause presupposes, and the
declared first-motion-token literal); agent legibility → JSDoc requirements
(Art. I line; carried today by `generated/docs.json` — the echo's "catalog
and llms.txt regenerate" lands with 017-agent-surfaces per founder decision
2026-07-08); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/015-ki-progress/
├── spec.md                  # gate-1 review in progress
├── feature.feature          # extracted Gherkin contract, S1–S15
├── plan.md                  # this file
├── research.md              # Phase 0: decisions D1–D8
├── data-model.md            # Phase 1: normalization/mode/ARIA model
├── contracts/
│   └── progress-contract.md # Phase 1: public API + token contract
├── quickstart.md            # Phase 1: validation guide
└── tasks.md                 # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-progress/            # via Nx generator, never by hand
│   ├── ki-progress.tsx                    # role=progressbar node, shape branch, ARIA wiring
│   ├── ki-progress.css                    # tokens-only, logical properties, --_ki-progress-* indirection,
│   │                                      #   indeterminate keyframes ONLY under no-preference
│   ├── ki-progress.math.ts                # pure logic: normalizeMax, clampValue, resolveShape
│   ├── ki-progress.spec.tsx               # mock-doc; @spec:015-ki-progress
│   └── ki-progress.stories.tsx            # Storybook workshop (Polish phase)
├── src/index.ts                           # export added by the generator
├── browser-tests/
│   ├── ki-progress.browser.spec.ts        # real browser + axe + getAnimations; @spec:015-ki-progress
│   └── ki-progress.dark.browser.spec.ts   # forced dark scheme; @spec:015-ki-progress
├── vitest.browser.config.ts               # + emulateReducedMotion command (S6; add-if-absent, 008 coordination)
├── generated/docs.json                    # regenerated on build, committed
└── package.json                           # + ki-progress size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/progress.tokens.json            # 7-token family (onmars), incl. first motion token
├── tokens/component/progress.material3.tokens.json  # M3 role/metric overrides
├── scripts/check-contrast.mjs                       # + indicator-on-track pair @ 3:1 (per-pair min, D7)
├── scripts/check-contrast.test.mjs                  # + unit cases for the extension
├── style-dictionary.config.mjs                      # + progress files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                   # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: identical factory layout to 002/008/010; the
structural novelties are (a) the shape-branching render (div bar vs SVG
ring) inside one component directory, (b) the first DTCG duration token in
the component layer, and (c) the shared-script coordination on
`check-contrast.mjs` and `vitest.browser.config.ts` with 008/010 (research
D7/D8: whichever feature lands first ships the mechanism; the others
rebase additively).

## Complexity Tracking

No constitutional violations to justify. Two declared items, neither a
violation: (1) the mutation gate is not yet wired into gates-suite.sh — a
factory gap inherited from 001/002/008/009/010, compensated here by
exhaustive unit coverage of the pure `ki-progress.math.ts` helpers; (2) the
first motion token carries a literal value because no semantic motion
family exists — the Art. VII-compliant alternative to inventing a
single-consumer abstraction, documented in research D6 and the spec's Art.
VI echo ("a motion token appears for the first time").
