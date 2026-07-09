# Implementation Plan: ki-alert

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-alert` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-ki-alert/spec.md` (gate-1
review in progress on `feat/fase2-specs`; implementation is blocked by the
pre-implement gate until the sha-stamped `.approved` marker exists).

## Summary

First live-region component of the library: `<ki-alert>`, a persistent
inline message whose `tone` (five semantic values, `neutral` default)
drives both the token-resolved appearance and the assistive-technology
exposure — `danger`/`warning` expose `role="alert"` (assertive),
`neutral`/`success`/`info` expose `role="status"` (polite), with the role
carried by an inner shadow wrapper that scopes exactly the optional
heading and the slotted message, keeping the opt-in dismiss control
outside the live-region boundary (the spot where the APG Alert pattern is
most commonly implemented wrong). Technical approach: implicit-role-only
live semantics (no explicit `aria-live` — the double-announcement
avoidance, research D1); a reflected `dismissed` attribute whose clearing
re-inserts a fresh populated live subtree so a re-shown alert re-announces
as a dynamic appearance (D2); a native shadow `<button part="dismiss">`
with an `aria-hidden` currentColor SVG glyph, named by the overridable
`dismiss-label` (default "Dismiss"), dispatching exactly one composed
non-cancelable `ki-dismiss` per dismissal (D3) and handing focus to the
next focusable element in document order via a pure, exhaustively
unit-tested helper (D4, FR-013); unknown tones fall back to neutral by CSS
construction (D5). New `--ki-alert-*` token family (~32/theme, both
themes) — the first consumer of the 001 info/warning ramps — and the
contrast sweep is extended with tone fg/bg text pairs (4.5:1) plus
dismiss-glyph non-text pairs (3:1) across all five tones (D7/D8; the
material3 info/warning ramps inherit base values through the cascade —
verified, measured by the sweep as built). Details and rationales in
[research.md](./research.md) (D1–D10); API surface in
[contracts/alert-contract.md](./contracts/alert-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-alert/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002 pattern (light + dark
spec files). Live exposure asserted on the accessibility-observable
surface (computed role, containment, `document.activeElement` stability);
actual announcements verified by the documented manual screen-reader pass
the spec mandates (research D1/D10). Traceability markers
`// @spec:011-ki-alert` with S-IDs on code lines (test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`) + one deterministic-gate extension
(`packages/tokens/scripts/check-contrast.mjs`, research D8).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (new
entries added alongside ki-button's); token stylesheets stay within their
existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only (message leads / dismiss trails via flow order and logical
padding — RTL mirrors by construction), no hardcoded user-visible strings
(the single default string "Dismiss" is attribute-overridable per FR-004),
scaffold via Nx generator (never by hand), single writer on
`feat/ki-alert`.

**Scale/Scope**: one component, 19 approved scenarios (S1–S19), ~32
component tokens per theme (research D7), one gate extension (contrast
sweep patterns + per-pair minimum, shared design with 008 D8), no
removals — purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiAlert` (4 attributes + the reflected `dismissed`, 1 slot, 4 parts,
  1 event) carries complete JSDoc including when-to-use/when-NOT-to-use —
  the alert/toast/badge/dialog boundary is the known agent confusion this
  entry must prevent (FR-012); `generated/docs.json` and
  `src/components.d.ts` regenerate on build and are committed — docs.json
  is the machine surface that exists today. CEM and llms.txt arrive with
  017-agent-surfaces (in progress); the Zod catalog is deferred to Fase 3
  (founder decision 2026-07-08). This plan's obligation is that the JSDoc
  contract is complete so those surfaces regenerate from it without
  rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/011-ki-alert/feature.feature` S1–S19 (gate-1 review in progress;
  the pre-implement gate blocks execution until the `.approved` marker is
  recorded); four families covered, form participation N/A-justified in
  the spec's coverage table (feedback message, not a form control);
  nothing in this plan exceeds the approved scenarios — no tone icons, no
  `start`/`end` slots, no auto-dismiss timer, no size/variant axes, no
  cancelable dismissal, no heading-level attribute. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suites written against S1–S19 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, the `ki-dismiss` event, the
  accessibility tree, resolved styles). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001/002,
  tracked as a factory chore); compensating control: the pure logic
  (`liveExposureForTone`, `resolveDismissFocusTarget`) lives in small
  pure modules (`ki-alert.tone.ts`, `ki-alert.focus.ts`) with exhaustive
  unit cases per branch. Done = `gates-suite.sh` exit 0. **PASS (with
  declared factory gap, unchanged from 002/008/009)**
- **Art. IV — Web standards & lightness**: semantic HTML first — a native
  shadow `<button>` for dismissal (zero ARIA beyond its `aria-label`),
  `<strong>` for the heading, and exactly one ARIA attribute class in the
  whole component: the tone-mapped `role` on the live wrapper with
  implicit live semantics only (research D1); logical properties only; no
  new runtime dependency ("none"); budgets as in Technical Context. Not
  form-associated. The only default user-facing string ("Dismiss") is
  overridable via `dismiss-label` (FR-004). **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard path native (Tab reaches only the dismiss control when
  present; Enter/Space activate the native button; non-dismissible alerts
  contribute no tab stop); visible focus ring from
  `--ki-alert-focus-ring-*` under `:focus-visible` (S6); dismiss pointer
  target ≥ 24×24 px via `--ki-alert-dismiss-size`; dismissal never
  strands focus (FR-013, research D4); no motion in v1, so FR-011's
  reduced-motion clause is satisfied by construction (no transition
  exists to suppress). NO manual APG walkthrough: the dismiss control
  reuses the 002 button pattern and the batch charter scopes walkthroughs
  to dialog/tooltip/tabs/select. HOWEVER, the spec mandates a documented
  MANUAL SCREEN-READER verification of the live announcements (assertive
  vs polite per tone, announce-on-appear without focus moves,
  announcement scoped to heading+message, re-announce on re-show) — no
  automated audit can observe them; carried as an explicit Polish task
  and recorded in the PR (research D10). axe zero violations across
  tone × dismissible × theme × scheme. Tone fg/bg text contrast and
  dismiss-glyph non-text contrast are CI-gated by the extended sweep
  (research D8). **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token family `--ki-alert-*` (structure single-scale; 5-tone ×
  {bg|fg|border} color matrix; dismiss-control state inks; focus ring) —
  ~32 per-theme values referencing the 001 semantic layer, the first
  component consumption of the info/warning ramps; zero hardcoded visual
  values; customization ladder tokens →
  `::part(alert|heading|message|dismiss)` → default slot. material3
  proves one-step re-theming across all five tones (S13); its
  info/warning ramps inherit base values through the documented 001
  cascade (research D7 finding — measured as built by the sweep). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: one component; no shared
  "MessageBase" abstraction anticipating ki-toast (duplication before the
  wrong abstraction — the toast is a future spec with different lifetime
  semantics); sibling decisions are CITED and reused, not re-derived (002
  native-button/focus-ring/`:host([tone])` machinery, 008 D8's sweep
  extension design, 009's conditional-anatomy reasoning); no speculative
  surface (no tone icons, no `start`/`end` slots, no auto-dismiss, no
  cancelable event, no per-tone dismiss inks while the sweep hasn't
  demanded them, no heading-level). Unknown-tone fallback is by CSS
  construction, not validation code (research D5). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-alert` (attributes/slot/parts/event/tokens per contract); no
  existing API changes, no removals. `ki-dismiss` ships non-cancelable
  with `detail: null`; any payload or cancelability is additive MINOR
  later. Packaging validated by the existing publint/attw gate; new
  per-component export `dist/components/ki-alert.js` follows the
  established build output. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on
  exports, size-limit budgets, tokens-sync, traceability on S-IDs,
  scenario families). One rule gap is KNOWN IN ADVANCE and closed in this
  feature: the contrast sweep's per-component pattern list does not match
  `--ki-alert-*` — the sweep is extended (tone text pairs at 4.5:1,
  dismiss-glyph non-text pairs at 3:1, per-pattern zero-match guard) in
  the same change that adds the tokens, never left to review (research
  D8; the per-pair-minimum mechanism is shared with 008 D8 — whichever
  feature merges first lands it, the other rebases and adds only its
  pattern). **PASS**
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

- **Public API delta** (Art. IX): new element `ki-alert` (attributes:
  `tone`, `heading`, `dismissible`, `dismiss-label`, plus the reflected
  dismissed-state attribute `dismissed`; slot: default; event: `ki-dismiss`
  — bubbling, composed, no detail payload (`detail: null`) in v1; parts:
  `alert`, `heading`, `message`, `dismiss`; component tokens:
  `--ki-alert-*`). No sub-components. Additive change; catalog and
  llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG Alert pattern (live region). The live
  region scopes the heading and message only, with the dismiss control
  outside its boundary (FR-005) — precisely the point where the APG Alert
  pattern is most commonly implemented wrong. The dismiss control reuses
  the button pattern established in 002, so no new keyboard interaction
  pattern is introduced and no full APG walkthrough is required. HOWEVER,
  live-region announcement behavior (assertive vs polite per tone,
  announce-on-appear, no focus steal) cannot be observed by automated
  audits: the Gherkin (S9, S10, S17, S18) asserts the accessibility-tree
  exposure, and a manual screen-reader verification of the actual
  announcements is documented in the PR — checking that each announcement
  contains only the heading and message, never the dismiss control's name.
  axe zero violations across tone × dismissible × theme × scheme.
- **Tokens** (Art. VI): new component token family `--ki-alert-*` in the
  component layer, both themes (onmars, material3): structural tokens
  (`--ki-alert-{padding-inline|padding-block|gap|radius|font-size|...}` plus
  heading typography), per-tone color tokens
  (`--ki-alert-{tone}-{bg|fg|border}`), dismiss-control state tokens
  (`--ki-alert-dismiss-{rest|hover|active}-fg`) and
  `--ki-alert-focus-ring-{color|width|offset}`. All resolve from the
  semantic layer — the info and warning ramps shipped in 001 are consumed by
  a component for the first time. No semantic-layer deltas are anticipated;
  if the contrast gate forces any (002 precedent), they will be declared for
  founder sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — a persistent inline
  message about the state of a page or section (failed save, completed
  operation the user should notice, service notice) that remains until
  resolved or dismissed; severity is expressed by `tone`. When NOT to use —
  transient action confirmations that expire on their own (future ki-toast,
  the Material 3 snackbar's territory), tiny status descriptors attached to
  another element (ki-badge), messages requiring a blocking decision
  (ki-dialog), inline field-level validation text (belongs to the form
  control).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/alert-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suite (S6–S12, S16–S18) +
the manual screen-reader task (Polish phase); tokens → research.md D7/D8 +
tokens package changes (including the sweep extension the token echo's
contrast-gate clause presupposes); agent legibility → JSDoc requirements
(Art. I line; carried today by `generated/docs.json` — the echo's "catalog
and llms.txt regenerate" lands with 017-agent-surfaces per founder decision
2026-07-08); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/011-ki-alert/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S19
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: attribute/state/exposure model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── alert-contract.md    # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-alert/             # via Nx generator, never by hand
│   ├── ki-alert.tsx                     # live wrapper (tone-mapped role) + heading/message + dismiss button
│   ├── ki-alert.css                     # tokens-only, logical properties, --_ki-alert-* indirection (neutral base + tone overrides)
│   ├── ki-alert.tone.ts                 # pure logic: liveExposureForTone (assertive/polite mapping)
│   ├── ki-alert.focus.ts                # pure logic: resolveDismissFocusTarget (FR-013 handoff)
│   ├── ki-alert.spec.tsx                # mock-doc; @spec:011-ki-alert
│   └── ki-alert.stories.tsx             # Storybook (Polish phase)
├── src/index.ts                         # export added by the generator
├── browser-tests/
│   ├── ki-alert.browser.spec.ts         # real browser + axe; @spec:011-ki-alert
│   └── ki-alert.dark.browser.spec.ts    # forced-dark theming (002 split)
├── generated/docs.json                  # regenerated on build, committed
└── package.json                         # + ki-alert size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/alert.tokens.json            # component layer (structure + 5-tone matrix, onmars)
├── tokens/component/alert.material3.tokens.json  # material3 overrides (M3 container/on-container mapping)
├── scripts/check-contrast.mjs                    # + alert tone text pairs (4.5) and dismiss non-text pairs (3.0, D8)
├── scripts/check-contrast.test.mjs               # + unit cases for the extension
├── style-dictionary.config.mjs                   # + alert files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button and planned identically for the Fase 2 siblings; the component
token layer directory already exists (002), so the structural changes are
two new token source files wired into the existing Style Dictionary layer
lists plus the mandated per-component extension of the contrast sweep (the
script's own contract requires it for every new component matrix). The two
pure-logic modules (`ki-alert.tone.ts`, `ki-alert.focus.ts`) mirror 008's
`ki-switch.form.ts` role as the mutation-gap compensating control.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002 state, and belongs to a factory chore, not to this plan.
