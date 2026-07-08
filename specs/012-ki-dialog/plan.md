# Implementation Plan: ki-dialog

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-dialog` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-ki-dialog/spec.md` (gate-1
review in progress on `feat/fase2-specs`; implementation is blocked by the
pre-implement gate until the sha-stamped `.approved` marker exists).

## Summary

First dialog-type interaction pattern in the repo: `<ki-dialog>`, a
modal-only v1 that interrupts the page for one focused decision. Technical
approach: a native `<dialog>` element inside the shadow root driven
exclusively through `showModal()`/`close()` — top layer, `::backdrop`,
background inertness (pointer/keyboard/AT), Escape-as-close-request and
focus restore to the invoker are platform behavior, not component code
(research D1/D3; Art. IV/VII). The reflected host `open` attribute is the
single source of truth, synced idempotently to the internal dialog (the
native `open` content attribute is never used — it would render
non-modally); every close path funnels into the single internal `close`
event, which emits exactly one composed, non-cancelable `ki-close` with
`detail.reason` ∈ `method` | `escape` | `backdrop` (D1). Focus entry gets a
deterministic assist for slotted `autofocus`/first-focusable content (pure
helper, D2); backdrop dismissal is opt-in via `close-on-backdrop` with
pointerdown-armed coordinate detection (pure predicate, D4); the accessible
name binds the `heading` attribute's `<h2>` to the dialog via same-root
`aria-labelledby` (D5). New flat 18-token `--ki-dialog-*` family including
the library's first themed overlay surface (`backdrop-bg` ←
`ki.overlay.*`) and the repo's first motion tokens (component-layer
literals — no semantic motion layer exists in 001; declared deviation with
a recorded extraction point, D8/D9); entrance-only fade via
`@starting-style`, removed entirely under `prefers-reduced-motion`. The
contrast sweep is extended with the dialog text and focus-ring pairs (D9).
Manual APG Dialog (Modal) walkthrough is MANDATORY (new interaction
pattern; charter). Details and rationales in [research.md](./research.md)
(D1–D10); API surface in
[contracts/dialog-contract.md](./contracts/dialog-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-dialog/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002 pattern (light + dark
spec files). DECLARED BOUNDARY: Stencil's mock-doc implements no
`HTMLDialogElement` — `showModal()`, the top layer, `::backdrop` and
inertness do not exist there — so every open-state scenario (modality,
focus, Escape, backdrop, AT exposure, motion) is asserted exclusively in
the real-browser suite (research D10); mock-doc covers closed-state
anatomy, wiring and the pure helpers. One browser-test infra extension: an
`emulateReducedMotion` command joins `emulateColorScheme` in
`vitest.browser.config.ts` (S14 determinism, research D8). Traceability
markers `// @spec:012-ki-dialog` with S-IDs on code lines (test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`. The two platform features this plan leans on
beyond 002's baseline — `::backdrop` inheriting custom properties and
`@starting-style` — shipped in all three engines during 2024, well inside
the declared baseline, and are pinned by browser tests, not assumed
(research D7/D8).

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`) + one deterministic-gate extension
(`packages/tokens/scripts/check-contrast.mjs`, research D9) + one
browser-test infra extension (`vitest.browser.config.ts`).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (new
entries added alongside ki-button's); token stylesheets stay within their
existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist), CSS logical
properties only (footer follows the writing direction by construction —
FR-014), no user-visible strings at all (no built-in close button, no
default labels — spec Assumptions), scaffold via Nx generator (never by
hand), single writer on `feat/ki-dialog`.

**Scale/Scope**: one component, 15 approved scenarios (S1–S15), 18
component tokens per theme (research D9), one contrast-gate extension, one
browser-test command, no removals — purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiDialog` (3 attributes, 2 methods, 2 slots, 4 parts, 1 event) carries
  complete JSDoc including when-to-use/when-NOT-to-use — the
  dialog/alert/tooltip boundary and the "always give it a heading, wire
  footer actions to close(), omit close-on-backdrop rather than set it
  false" rules are the agent confusions this entry must prevent (FR-016);
  `generated/docs.json` and `src/components.d.ts` regenerate on build and
  are committed — docs.json is the machine surface that exists today. CEM
  and llms.txt arrive with 017-agent-surfaces (in progress); the Zod
  catalog is deferred to Fase 3 (founder decision 2026-07-08). This plan's
  obligation is a complete JSDoc contract so those surfaces regenerate from
  it without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/012-ki-dialog/feature.feature` S1–S15 (gate-1 review in progress;
  the pre-implement gate blocks execution until the `.approved` marker is
  recorded); four families covered, form participation N/A-justified in the
  spec's coverage table (not a form control; forms compose inside the
  slots); nothing in this plan exceeds the approved scenarios — no
  full-screen mode, no built-in close button, no variant/tone/size axes, no
  cancelable before-close event, no scroll-lock machinery, no exit motion,
  no focus-trap code beyond the platform's. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suites written against S1–S15 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, methods, the `ki-close`
  event, the accessibility tree, resolved styles). Determinism: the S14
  reduced-motion scenario runs through the new `emulateReducedMotion`
  command and asserts computed styles, never animation frames; material3
  assertions that could race the entrance fade await the settled state or
  run under reduced motion (research D8/D10). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001/002, tracked
  as a factory chore); compensating control: the pure logic
  (`resolveEntryFocusTarget`, `isOutsideRect`) lives in small pure modules
  (`ki-dialog.focus.ts`, `ki-dialog.backdrop.ts`) with exhaustive unit
  cases per branch. Done = `gates-suite.sh` exit 0. **PASS (with declared
  factory gap, unchanged from 002/008/009/011)**
- **Art. IV — Web standards & lightness**: the maximal platform-first
  decision of the batch — the native `<dialog>` + `showModal()` supplies
  top layer, backdrop, inertness, Escape and focus restore, so the
  component ships zero focus-trap code, zero scrim element, zero
  `role`/`aria-modal` attributes and exactly one ARIA attribute
  (`aria-labelledby`, the name binding); logical properties only; no new
  runtime dependency ("none"); budgets as in Technical Context. Not
  form-associated. No user-visible strings ship at all. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  NEW interaction pattern (first dialog in the repo; charter flags it) →
  **manual APG Dialog (Modal) walkthrough REQUIRED**, carried as an
  explicit Polish task and documented in the PR: focus entry (all three
  FR-005 priorities), containment (Tab and Shift+Tab), Escape from every
  position, focus return on every close path, backdrop both modes,
  role/name/modal announcement with a real screen reader, background
  unreachability via the SR virtual cursor (research D10). Keyboard path is
  native; visible focus via `--ki-dialog-focus-ring-*` under
  `dialog:focus-visible` when the surface itself takes focus (S6 fallback
  case); the component ships no interactive controls of its own, so the
  ≥ 24×24 px target obligation rides the slotted controls (ki-button
  already gates it); reduced motion suppresses the entrance transition by
  construction (S14, research D8). axe zero violations in open and closed
  states under both themes and both schemes. Text and focus-ring contrast
  CI-gated by the extended sweep (research D9). **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the flat
  component token family `--ki-dialog-*` (18/theme: structure, surface
  colors with composite border/shadow values, backdrop, heading
  typography, focus ring, motion) referencing the 001 semantic layer — the
  first component consumption of the `ki.overlay.*` family (the themed
  backdrop). ONE declared exception: the two motion tokens carry literal
  component-layer values because NO motion primitives or semantic motion
  tokens exist in 001 (verified 2026-07-08); creating a semantic motion
  family for a single consumer is the wrong abstraction — the extraction
  point (second motion-bearing component: ki-tooltip/ki-tabs in this
  batch) is recorded in research D8, and no semantic-layer delta ships.
  Zero hardcoded visual values in component CSS; customization ladder
  tokens → `::part(dialog|heading|body|footer)` → slots; the backdrop is
  deliberately NOT a part (pseudo-element; token-only surface, research
  D7). material3 proves one-step re-theming including the backdrop (S11).
  **PASS**
- **Art. VII — Simplicity & anti-abstraction**: the platform does the heavy
  lifting; component code is the sync watcher, the reason bookkeeping, the
  entry assist, the backdrop predicate and 009's cited slot-emptiness
  tracking for the footer — nothing else. No speculative surface (no
  full-screen, no X button, no before-close veto, no scroll lock, no
  invoker tracking duplicating the native restore, no focus-trap). Sibling
  decisions are CITED and reused, not re-derived (002 focus-ring/indirection
  conventions, 008/011 D8 sweep mechanism, 009 D1 slotchange collapse, 011
  D4 focusable heuristic — restated locally; extraction waits for the third
  occurrence). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol surface
  touched; no protocol type enters `@kimen/elements`; guardrail boundary
  untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-dialog` (attributes/methods/slots/parts/event/tokens per contract);
  no existing API changes, no removals. First component to expose public
  methods (`show()`/`close()`, async per Stencil `@Method`) — typed and
  documented like every other member. `ki-close` ships non-cancelable with
  a closed `reason` union; any payload growth or cancelability is additive
  MINOR later. Packaging validated by the existing publint/attw gate; new
  per-component export `dist/components/ki-dialog.js` follows the
  established build output. **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on exports,
  size-limit budgets, tokens-sync, traceability on S-IDs, scenario
  families). One rule gap is KNOWN IN ADVANCE and closed in this feature:
  the contrast sweep's per-component pattern list does not match
  `--ki-dialog-*` — the sweep is extended (fg-on-bg text pair at 4.5:1,
  focus-ring non-text pair at 3:1, per-pattern zero-match guard) in the
  same change that adds the tokens, never left to review (research D9; the
  per-pair-minimum mechanism is shared with 008/011 — whichever feature
  merges first lands it, the others rebase and add only their patterns).
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

- **Public API delta** (Art. IX): new element `ki-dialog` (attributes:
  `open`, `heading`, `close-on-backdrop`; methods: `show()`, `close()`;
  event: `ki-close`, bubbling, composed, `detail.reason` ∈ `method` |
  `escape` | `backdrop`; slots: default, `footer`; parts: `dialog`,
  `heading`, `body`, `footer`; component tokens: `--ki-dialog-*`). No
  sub-components. Additive MINOR. Catalog and llms.txt regenerate with the
  new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG dialog (modal) pattern; NEW interaction
  pattern in the repo → manual APG walkthrough required and documented in the
  PR (focus entry, containment, Escape, focus return, inert background). axe
  zero violations in open and closed states under both themes and schemes.
- **Tokens** (Art. VI): new component token family `--ki-dialog-*`
  (structure: `radius`, `padding`, `gap`, `min-width`, `max-width`; color:
  `bg`, `fg`, `border`, `shadow`; backdrop: `--ki-dialog-backdrop-bg`;
  heading typography: `--ki-dialog-heading-{font-size|font-weight|line-height}`;
  focus ring: `--ki-dialog-focus-ring-{color|width|offset}`, exercised when
  the dialog surface itself takes focus; motion:
  `--ki-dialog-motion-{duration|easing}`, from which any open/close
  transition a theme defines resolves, suppressed under
  `prefers-reduced-motion`) resolving from the semantic layer; both shipped
  themes get component token files. No semantic-layer deltas anticipated; the contrast gate arbitrates
  at implementation and any delta requires founder sign-off at the merge
  gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — an interrupting
  decision or short focused task that must be resolved before returning to
  the page: destructive confirmations, blocking choices, brief critical
  input. When NOT to use — non-blocking feedback (ki-alert, future
  ki-toast), supplementary hints (ki-tooltip), long forms or multi-step
  flows (navigate, or the future full-screen variant), menus and pickers
  (future components). Composition guidance: footer actions never close the
  dialog by themselves — wire each one to `close()` (FR-009); in destructive
  confirmations, place `autofocus` on the least destructive action so
  initial focus follows the APG dialog (modal) guidance (FR-005).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/dialog-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suite (S1, S6–S10) + the
mandatory manual APG walkthrough (Polish phase); tokens → research.md
D7/D8/D9 + tokens package changes (including the sweep extension the token
echo's contrast-gate clause presupposes; the motion tokens' literal values
are the one declared exception to "resolving from the semantic layer" — no
semantic motion layer exists, research D8, no semantic delta ships); agent
legibility → JSDoc requirements (Art. I line; carried today by
`generated/docs.json` — the echo's "catalog and llms.txt regenerate" lands
with 017-agent-surfaces per founder decision 2026-07-08); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/012-ki-dialog/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S15
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: attribute/lifecycle/focus/token model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── dialog-contract.md   # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-dialog/            # via Nx generator, never by hand
│   ├── ki-dialog.tsx                    # native <dialog> sync + reason wiring + entry assist + backdrop opt-in
│   ├── ki-dialog.css                    # tokens-only, logical properties, --_ki-dialog-* indirection, ::backdrop, @starting-style entrance
│   ├── ki-dialog.focus.ts               # pure logic: resolveEntryFocusTarget (FR-005 entry priority)
│   ├── ki-dialog.backdrop.ts            # pure logic: isOutsideRect (D4 coordinate predicate)
│   ├── ki-dialog.spec.tsx               # mock-doc (closed-state only — no showModal in mock-doc); @spec:012-ki-dialog
│   └── ki-dialog.stories.tsx            # Storybook (Polish phase)
├── src/index.ts                         # export added by the generator
├── browser-tests/
│   ├── ki-dialog.browser.spec.ts        # real browser + axe (all open-state scenarios); @spec:012-ki-dialog
│   └── ki-dialog.dark.browser.spec.ts   # forced-dark theming (002 split)
├── vitest.browser.config.ts             # + emulateReducedMotion command (S14, research D8)
├── generated/docs.json                  # regenerated on build, committed
└── package.json                         # + ki-dialog size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/dialog.tokens.json            # component layer (structure/color/backdrop/heading/ring/motion, onmars)
├── tokens/component/dialog.material3.tokens.json  # material3 overrides (surface-container, shape, no border, scrim, M3 motion)
├── scripts/check-contrast.mjs                     # + dialog text pair (4.5) and focus-ring non-text pair (3.0, D9)
├── scripts/check-contrast.test.mjs                # + unit cases for the extension
├── style-dictionary.config.mjs                    # + dialog files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                 # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button and planned identically for the Fase 2 siblings; the component
token layer directory already exists (002), so the structural changes are
two new token source files wired into the existing Style Dictionary layer
lists plus the mandated per-component extension of the contrast sweep. The
two pure-logic modules (`ki-dialog.focus.ts`, `ki-dialog.backdrop.ts`)
mirror 008's `ki-switch.form.ts` / 011's `ki-alert.*.ts` role as the
mutation-gap compensating control. The one file touched outside the
component/token pattern is `vitest.browser.config.ts` (adds the
`emulateReducedMotion` command next to the existing `emulateColorScheme` —
same mechanism, needed by S14).

## Complexity Tracking

No constitutional violations to justify. Two declared items, neither a
violation: (1) the mutation gate not yet wired into gates-suite.sh predates
this feature (factory chore, inherited from 001/002); (2) the two motion
tokens carry literal component-layer values because 001 ships no motion
layer to reference — documented in research D8 with the recorded extraction
point (second motion-bearing component), avoiding both a speculative
semantic family and a semantic-layer delta.
