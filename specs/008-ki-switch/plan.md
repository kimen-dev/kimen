# Implementation Plan: ki-switch

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-switch` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-ki-switch/spec.md`; founder
intent is confirmed in the working conversation or PR, without a repository
approval marker.

## Summary

Third form-associated Kimen control: `<ki-switch>`, an on/off setting whose
change takes effect immediately, distinguished in the catalog from
ki-checkbox (selection for later submission). The API abstracts the M3
switch pattern under the batch charter (MarsUI ships no switch frame —
full-file sweep verified 2026-07-08; onmars styles the control from the 001
token vocabulary alone): `checked`/`disabled`/`name`/`value`, default-slot
label, `track`/`thumb`/`label` parts, composed platform `input`/`change`
events, zero variant/tone/size axes. Technical approach: a visually hidden
native `<input type="checkbox" role="switch">` inside a shadow `<label>`
provides toggle, Space activation, label activation, focus and disabled
semantics natively — one ARIA attribute total; presentation lives on
token-styled `track`/`thumb` parts whose thumb travels via a logical inset
(RTL-free) with the transition gated behind `prefers-reduced-motion`;
ElementInternals (the 002 pattern, proven on a value-carrying control in
003) provides form participation — `setFormValue(checked ? value ?? 'on' :
null)`, reset default snapshotted at form association (the deliberate
deviation from native `defaultChecked` the spec fixes in FR-005, shared
with the 006 sibling). The contrast gate's per-component sweep is extended
to the new `--ki-switch-*` family with non-text 3:1 pairs (WCAG 1.4.11).
Details and rationales in [research.md](./research.md) (D1–D10); API
surface in [contracts/switch-contract.md](./contracts/switch-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-switch/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002/003 pattern; the
browser-test config gains an `emulateReducedMotion` command for S19
(research D6). Traceability markers `// @spec:008-ki-switch` with S-IDs on
code lines (test titles).

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
properties only (thumb travel via `inset-inline-start`, research D6), no
hardcoded user-visible strings (the label is slotted content), scaffold via
Nx generator (never by hand), single writer on `feat/ki-switch`.

**Scale/Scope**: one component, 21 approved scenarios (S1–S21), 36
component tokens per theme (research D7), one gate extension (contrast
sweep), no removals — purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiSwitch` (4 props, 1 slot, 3 parts) carries complete JSDoc including
  when-to-use/when-NOT-to-use — the switch/checkbox distinction (immediate
  effect vs later submission) is the classic agent confusion this entry
  must prevent (FR-014); `generated/docs.json` and `src/components.d.ts`
  regenerate on build and are committed — docs.json is the machine surface
  that exists today. CEM and llms.txt arrive with 017-agent-surfaces (in
  progress); the Zod catalog is deferred to Fase 3 (founder decision
  2026-07-08). This plan's obligation is that the JSDoc contract is
  complete so those surfaces regenerate from it without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/008-ki-switch/feature.feature` S1–S21; all five families are covered
  (see spec table); nothing in
  this plan exceeds the approved scenarios — no Enter activation (the
  checkbox base keeps the approved Space-only surface, research D1), no
  thumb icons, no size/variant/tone axes, no required/validation. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suite written against S1–S21 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, events, form data,
  accessibility tree, resolved styles). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001/002/003,
  tracked as a factory chore); compensating control: the pure logic
  (`checkedFromMarkup`, `resolveSubmittedValue`, the reset-snapshot rules)
  lives in small pure functions in `ki-switch.form.ts` with exhaustive
  unit cases per branch. Done = `gates-suite.sh` exit 0. **PASS (with
  declared factory gap, unchanged from 002/003)**
- **Art. IV — Web standards & lightness**: native
  `<input type="checkbox">` + native shadow `<label>` wiring; exactly one
  ARIA attribute (`role="switch"`, the APG-sanctioned re-mapping — no
  `aria-checked`, no hand-rolled state, research D1); logical properties
  only (thumb travel on `inset-inline-start`); no new runtime dependency
  ("none"); budgets as in Technical Context — marginal cost ≤ 9 KB
  gzipped; `formAssociated` + ElementInternals per constitution. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard path native (Tab reach, Space toggle, disabled skipped);
  visible focus ring from `--ki-switch-focus-ring-*` tokens on the track
  under `:focus-visible`; ≥24 px pointer target enforced via
  `--ki-switch-min-target` (FR-013); disabled exposed through native input
  semantics; the only motion (thumb travel) is declared inside
  `@media (prefers-reduced-motion: no-preference)` — S19 is an approved
  scenario, tested via the new `emulateReducedMotion` command. NO manual
  APG walkthrough: single-key toggle over the 002 focus/disabled
  machinery, not flagged by the batch charter (walkthroughs scoped to
  dialog, tooltip, tabs, select's listbox). axe zero violations across
  checked × disabled × theme × scheme. Thumb/track state indication is
  non-text contrast — gate-covered at 3:1 by the extended sweep (WCAG
  1.4.11, research D8). **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token family `--ki-switch-*` (single geometry scale — no size
  axis; checkedness × interaction-state color matrix for
  track/thumb/border; focus ring) whose 36 per-theme values reference the
  001 semantic layer; zero hardcoded visual values; customization ladder
  tokens → `::part(track)`/`::part(thumb)`/`::part(label)` → default slot.
  material3 proves one-step re-theming on both switch states (S14). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: one component; no shared
  "ToggleBase"/"FormControlBase" abstraction with ki-checkbox or ki-input
  (duplication before the wrong abstraction — extraction is considered
  when a third toggle control exists, per the rule); sibling decisions are
  CITED and reused, not re-derived (003 D5 change re-dispatch, 002
  ElementInternals machinery, 006 reset-baseline model); no speculative
  surface (no size/variant/tone, no thumb icons, no required, no motion
  tokens, no per-state thumb geometry while the M3 metrics cell is
  unverified — research D7). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-switch` (props/slot/parts/events/tokens per contract); no existing
  API changes, no removals. Packaging validated by the existing
  publint/attw gate; new per-component export
  `dist/components/ki-switch.js` follows the established build output.
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on
  exports, size-limit budgets, tokens-sync, traceability on S-IDs,
  scenario families). One rule gap is KNOWN IN ADVANCE and closed in this
  feature: the contrast sweep's per-component pattern list does not match
  `--ki-switch-*` — the sweep is extended (with non-text 3:1 pairs and a
  per-pattern zero-match guard) in the same change that adds the tokens,
  never left to review (research D8). **PASS**
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

- **Public API delta** (Art. IX): new element `ki-switch` (attributes:
  `checked`, `disabled`, `name`, `value`; slot: default (label); parts:
  `track`, `thumb`, `label`; events: composed `input` and `change`;
  component tokens: `--ki-switch-*`). No sub-components. Additive MINOR.
  Catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG switch pattern (single-key toggle over the
  002 focus/disabled machinery). Not flagged for the manual APG walkthrough
  per the batch charter (walkthroughs scoped to dialog, tooltip, tabs,
  select's listbox); axe zero violations across state × theme × scheme.
- **Tokens** (Art. VI): new component token family `--ki-switch-*` in the
  component layer, resolving from the semantic layer — structure
  (track/thumb metrics, gap, radius), color per state
  (`{checked|unchecked}` × `{rest|hover|active|disabled}` for
  track/thumb/border) and
  focus ring (`--ki-switch-focus-ring-{color|width|offset}`). Both themes
  get component token files. No semantic-layer delta anticipated; any delta
  surfaced by the contrast gate at implementation will be declared for
  explicit founder sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a binary setting
  whose change takes effect immediately (enable notifications, toggle dark
  mode). When NOT to use — a selection collected for later submission (use
  ki-checkbox), mutually exclusive choices (use ki-radio-group), triggering
  an action (use ki-button).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/switch-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suite (S5–S9, S19, S20);
tokens → research.md D7/D8 + tokens package changes (including the sweep
extension the token echo's contrast-gate clause presupposes); agent
legibility → JSDoc requirements (Art. I line); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/008-ki-switch/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S21
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D10
├── data-model.md        # Phase 1: API/state model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── switch-contract.md   # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-switch/            # via Nx generator, never by hand
│   ├── ki-switch.tsx                    # hidden native checkbox (role=switch) + track/thumb + ElementInternals
│   ├── ki-switch.css                    # tokens-only, logical properties, --_ki-switch-* indirection
│   ├── ki-switch.form.ts                # pure logic: presence normalization, submitted value, reset snapshot
│   ├── ki-switch.spec.tsx               # mock-doc; @spec:008-ki-switch
│   └── ki-switch.stories.tsx            # Storybook (Polish phase)
├── src/index.ts                         # export added by the generator
├── browser-tests/
│   ├── ki-switch.browser.spec.ts        # real browser + axe; @spec:008-ki-switch
│   └── ki-switch.dark.browser.spec.ts   # forced-dark theming (002/003 split)
├── vitest.browser.config.ts             # + emulateReducedMotion command (S19)
├── generated/docs.json                  # regenerated on build, committed
└── package.json                         # + ki-switch size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/switch.tokens.json            # component layer (structure + onmars state matrix)
├── tokens/component/switch.material3.tokens.json  # material3 state matrix overrides
├── scripts/check-contrast.mjs                     # + switch thumb/track non-text pairs (3:1, D8)
├── scripts/check-contrast.test.mjs                # + unit cases for the extension
├── style-dictionary.config.mjs                    # + switch files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                 # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button and planned identically for ki-input; the component token layer
directory already exists (002), so the structural changes are two new token
source files wired into the existing Style Dictionary layer lists plus the
mandated per-component extension of the contrast sweep (the script's own
contract requires it for every new component matrix).

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation gate
not yet wired into gates-suite.sh) predates this feature, is inherited from
the factory/001/002/003 state, and belongs to a factory chore, not to this
plan.
