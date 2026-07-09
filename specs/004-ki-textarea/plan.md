# Implementation Plan: ki-textarea

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done. -->

**Branch**: `feat/ki-textarea` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-ki-textarea/spec.md`
(gate-1 review in progress on `feat/fase2-specs`; implementation is blocked
by the pre-implement gate until the sha-stamped `.approved` marker exists.
One open marker rides to gate 1: the default `rows` count — the plan
proceeds with the spec's native-parity default of 2; a different founder
answer changes one constant, nothing structural).

## Summary

Third real Kimen component: `<ki-textarea>`, the multiline sibling of
ki-input (003) — a form-associated field for long-form text whose reason to
exist is line-break fidelity: Enter inserts a line and NEVER submits the
form (the exact inversion of 003), height is fixed by `rows` (no auto-grow,
no native resize handle — founder-approved 2026-07-08), and there are no
slots and no variant/tone/size axes in v1. It is styled exclusively through
a new `--ki-textarea-*` component token layer (state keys aligned with
`--ki-input-*`). Technical approach: wherever the single-line decisions
apply, they are ADOPTED from 003 by citation, not re-derived (Art. VII) — a
native `<textarea>` inside the shadow root with a component-rendered
`<label for>` (003 D1), ElementInternals form participation with the
mirrored ValidityState (003 D2/D3), live `value` property with dirty-flag
reset semantics (003 D2), composed `change` re-dispatch (003 D5) and the
`:state(user-invalid)` custom state (003 D7). The genuinely multiline
decisions — no Enter forward, `rows` normalization, fixed height with
neutralized resize, padding-block geometry, and extending the
contrast-gate sweep beyond its current button-only pattern — are new, in
[research.md](./research.md) (D1–D12); API surface in
[contracts/textarea-contract.md](./contracts/textarea-contract.md).

## Technical Context

**Language/Version**: TypeScript strict (repo tsconfig.base), Stencil 4.43 JSX

**Primary Dependencies**: `@stencil/core` 4.43.5 (existing; no new runtime
dependency). Tokens via `@kimen/tokens` (workspace dev dependency, CSS
consumed by tests and docs only — components reference `--ki-*` custom
properties, never import token sources).

**Storage**: N/A

**Testing**: Vitest 4 mock-doc specs in `src/components/ki-textarea/` +
real-browser suite (Vitest browser mode, Playwright provider, axe-core) in
`packages/elements/browser-tests/`, per the 001/002/003 pattern.
Traceability markers `// @spec:004-ki-textarea` with S-IDs on code lines
(test titles).

**Target Platform**: evergreen browsers (current + previous Chromium/
Firefox/Safari); PR gate on Chromium, engine matrix via
`KIMEN_BROWSER_MATRIX=1`. CustomStateSet (`:state()`, research D8 adopting
003 D7) is baseline across the target.

**Project Type**: component (`packages/elements`) + component token layer
(`packages/tokens`) + contrast-gate sweep extension
(`packages/tokens/scripts/check-contrast.mjs`, research D10).

**Performance Goals**: size-limit — marginal component cost ≤ 9 KB gzipped
(runtime excluded), worst case component + Stencil runtime ≤ 25 KB (new
entries added alongside ki-button's); token stylesheets stay within their
existing 9 KB caps.

**Constraints**: tokens-only CSS (stylelint allowlist; `resize: none` is a
keyword outside the strict-value property list, research D7), CSS logical
properties only, no hardcoded user-visible strings (label/placeholder come
from attributes; native validation messages come from the platform),
scaffold via Nx generator (never by hand), single writer on
`feat/ki-textarea`.

**Scale/Scope**: one component, 25 approved scenarios (S1–S25), ~49
component tokens per theme (research D9), no removals — purely additive.

## Constitution Check

- **Art. I — AI-First, one source of truth**: every public member of
  `KiTextarea` (9 props, 0 slots, 3 parts) carries complete JSDoc including
  when-to-use/when-NOT-to-use plus the two agent notes the spec mandates
  (initial text via `value` attribute — element content is ignored; Enter
  inserts a line, it never submits — the inverse of ki-input);
  `generated/docs.json` and `src/components.d.ts` regenerate on build and
  are committed — docs.json is the machine surface that exists today. CEM
  and llms.txt arrive with 017-agent-surfaces (in progress); the Zod
  catalog is deferred to Fase 3 (founder decision 2026-07-08). This plan's
  obligation is that the JSDoc contract is complete so those surfaces
  regenerate from it without rework. **PASS**
- **Art. II — Specs before code (NON-NEGOTIABLE)**: implements exactly
  `specs/004-ki-textarea/feature.feature` S1–S25 (gate-1 review in
  progress; the pre-implement gate blocks execution until the `.approved`
  marker is recorded); all five families are covered (see spec table);
  nothing in this plan exceeds the approved scenarios — auto-grow, resize
  handle, `maxlength`/counter, helper text, on-screen validation messages,
  affix slots and size/variant axes stay out. **PASS**
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: RED
  first — mock-doc spec + browser suite written against S1–S25 and
  verified failing before implementation (tasks enforce the order); tests
  assert through the public API (attributes, events, form data,
  accessibility tree, resolved styles). Mutation gate: gates-suite.sh
  still does not wire Stryker (factory gap inherited from 001/002/003,
  tracked as a factory chore); compensating control: the pure logic
  (`normalizeKiTextareaRows`, the value/dirty/reset rules) lives in small
  pure functions with exhaustive unit cases per branch. Done =
  `gates-suite.sh` exit 0. **PASS (with declared factory gap, unchanged
  from 002/003)**
- **Art. IV — Web standards & lightness**: native `<textarea>` + native
  `<label for>` in shadow DOM (no ARIA at all — semantics come from the
  elements); Enter-inserts-a-line is native behavior deliberately NOT
  intercepted (research D4); logical properties only (per-side
  border-width tokens are logical); no new runtime dependency ("none");
  budgets as in Technical Context — marginal cost ≤ 9 KB gzipped;
  `formAssociated` + ElementInternals per constitution. **PASS**
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**:
  keyboard path native (Tab into the field, full multiline editing, Enter
  = new line, Tab exits — S7/S8/S21); visible focus ring from
  `--ki-textarea-focus-ring-*` tokens on the field enclosure; ≥24 px
  pointer target via `--ki-textarea-min-target`; disabled/readonly/
  required exposed through native textarea semantics; no intrinsic motion
  (static label — no reduced-motion surface in v1, per spec). NO manual
  APG walkthrough: a labeled multiline text field is a native pattern, not
  a new APG interaction pattern (the charter flags dialog/tooltip/tabs/
  select only). WCAG 2.2 SC 1.3.5 is met by forwarding `autocomplete`
  (FR-017, S25) — a gap axe cannot detect, covered by contract tests. axe
  runs across the state × theme matrix; the contrast gate's component
  sweep is EXTENDED to `--ki-textarea-*` including placeholder and label
  inks (research D10 — today it sweeps ki-button only). **PASS**
- **Art. VI — Closed tokens, layered customization**: introduces the
  component token family `--ki-textarea-*` (single geometry scale — no
  size axis; multiline geometry: padding-block + line-height give `rows`
  its meaning instead of a fixed height token; per-state color for five
  inks: bg, fg, border, label, placeholder; border width per logical side
  so filled and outlined enclosures are both token-expressible; focus
  ring) whose values reference the 001 semantic layer; zero hardcoded
  visual values; customization ladder tokens →
  `::part(field)`/`::part(textarea)`/`::part(label)` (no slots in v1 —
  spec assumption). material3 proves the enclosure-is-a-theme-decision
  claim (S17). **PASS**
- **Art. VII — Simplicity & anti-abstraction**: the third form-associated
  control — the duplication rule's extraction threshold is reached, but
  extraction of a shared FACE helper is NOT part of this feature: 003 is
  not yet implemented (both are in gate-1 review), so there is no proven
  duplicated code to extract from; the refactor belongs to whichever
  feature lands second, as a Polish-phase judgment call with the rule's
  blessing. No speculative props (no size/variant/tone, no maxlength, no
  auto-grow); 003 decisions adopted by citation instead of re-derived;
  validity mirrored, never re-implemented; `rows` handled by one tiny pure
  function; Enter behavior implemented as deliberate absence of code
  (research D4). **PASS**
- **Art. VIII — Neutral catalog, disposable adapters**: no protocol
  surface touched; no protocol type enters `@kimen/elements`; guardrail
  boundary untouched ("none"). **N/A**
- **Art. IX — Public API stability**: pre-1.0 purely additive delta — adds
  `ki-textarea` (props/parts/events/tokens per contract; deliberately zero
  slots); no existing API changes, no removals. Packaging validated by the
  existing publint/attw gate; new per-component export
  `dist/components/ki-textarea.js` follows the established build output.
  **PASS**
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: existing
  gates cover the new surface (stylelint token-allowlist + logical
  properties on the new CSS, ESLint/tsc strict on the TSX, knip on
  exports, size-limit budgets, tokens-sync on regenerated CSS,
  traceability on S-IDs, scenario families). ONE identified rule gap is
  closed as part of this feature: the contrast gate's component sweep is
  button-only today and its own comment mandates per-component extension —
  the `--ki-textarea-*` pattern (with per-pattern zero-match guard) is
  added with the tokens (research D10); leaving it to review would violate
  this article. **PASS**
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

- **Public API delta** (Art. IX): new element `ki-textarea` (attributes:
  `label`, `name`, `value`, `placeholder`, `rows`, `required`, `readonly`,
  `disabled`, `autocomplete`; slots: none in v1 — the label is a prop and affix slots are
  deliberately excluded, see Assumptions; light-DOM text content is ignored
  (the initial value is declared via `value`, see Edge Cases); parts:
  `field`, `textarea`, `label`; events:
  standard composed text-entry events (`input`, `change`), no `ki-*` events;
  component tokens: `--ki-textarea-*`). Additive MINOR. Catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): native multiline-textbox semantics (labeled
  form control); no new composite interaction pattern, so no manual APG
  walkthrough is required for this component (the charter reserves that flag
  for dialog, tooltip, tabs and select's listbox). axe zero violations across
  the state matrix (rest, focus, disabled, readonly, required-invalid) in
  both themes and both schemes. WCAG 2.2 SC 1.3.5 (Identify Input Purpose)
  is met through the forwarded `autocomplete` attribute (FR-017, S25) — a
  gap axe cannot detect, so it is contract-covered rather than
  gate-covered (mirror of ki-input 003).
- **Tokens** (Art. VI): new component token family `--ki-textarea-*` in the
  component layer, resolving from the semantic layer — structure
  (padding, gap, radius, font, line metrics that make `rows` meaningful) and
  color per state (`rest`/`hover`/`focus`/`disabled`/`readonly`/`invalid` ×
  `bg`/`fg`/`border`, placeholder foreground, label foreground — state keys
  aligned with `--ki-input-*`) plus
  `--ki-textarea-focus-ring-{color|width|offset}`. Both shipped themes get
  component token files. No semantic-layer deltas are anticipated; if the
  contrast gate demands any, they will be declared for explicit founder
  sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — free-form text longer
  than one line: comments, descriptions, messages, delivery notes. When NOT
  to use — single-line values (ki-input), constrained choices (ki-select,
  ki-checkbox, ki-radio-group), rich or formatted text editing (no Kimen
  component; out of scope), search boxes (ki-input type search). Agent note
  in the catalog: the initial text is declared through the `value`
  attribute; element text content is ignored (unlike the native multiline
  control).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Every echoed obligation maps to a plan element: API delta →
contracts/textarea-contract.md; budget → new size-limit entries (Technical
Context); accessibility → Art. V line + browser suite (S7–S11, S21–S25);
tokens → research.md D9/D10 + tokens package changes (including the
contrast-sweep extension); agent legibility → JSDoc requirements (Art. I
line); guardrail → none.

## Project Structure

### Documentation (this feature)

```text
specs/004-ki-textarea/
├── spec.md              # gate-1 review in progress
├── feature.feature      # extracted Gherkin contract, S1–S25
├── plan.md              # this file
├── research.md          # Phase 0: decisions D1–D12 (003 adopted by citation)
├── data-model.md        # Phase 1: API/state model
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── textarea-contract.md # Phase 1: public API + token contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/elements/
├── src/components/ki-textarea/            # via Nx generator, never by hand
│   ├── ki-textarea.tsx                    # native <textarea> + label + ElementInternals
│   ├── ki-textarea.css                    # tokens-only, logical properties, --_ki-textarea-* indirection, resize: none
│   ├── ki-textarea.form.ts                # pure logic: rows normalization, value/validity helpers
│   ├── ki-textarea.spec.tsx               # mock-doc; @spec:004-ki-textarea
│   └── ki-textarea.stories.tsx            # Storybook (Polish phase)
├── src/index.ts                           # export added by the generator
├── browser-tests/
│   ├── ki-textarea.browser.spec.ts        # real browser + axe; @spec:004-ki-textarea
│   └── ki-textarea.dark.browser.spec.ts   # forced-dark theming (002/003 pattern), if split needed
├── generated/docs.json                    # regenerated on build, committed
└── package.json                           # + ki-textarea size-limit entries (9/25 KB)

packages/tokens/
├── tokens/component/textarea.tokens.json            # component layer (structure + onmars state matrix)
├── tokens/component/textarea.material3.tokens.json  # material3 state matrix + enclosure overrides
├── scripts/check-contrast.mjs                       # + --ki-textarea-* sweep pattern (research D10)
├── scripts/check-contrast.test.mjs                  # + cases for the new derivation
├── style-dictionary.config.mjs                      # + textarea files in LAYERS / MATERIAL3_LAYERS
└── dist/css/*.css                                   # regenerated, committed (tokens-sync gate)
```

**Structure Decision**: component work follows the factory layout proven by
ki-button and planned for ki-input; the component token layer directory
already exists (002), so the structural changes are two new token source
files wired into the existing Style Dictionary layer lists plus the
contrast-sweep pattern extension the script's own comment mandates for
every new component matrix.

## Complexity Tracking

No constitutional violations to justify. The one declared gap (mutation
gate not yet wired into gates-suite.sh) predates this feature, is inherited
from the factory/001/002/003 state, and belongs to a factory chore, not to
this plan. The Art. VII extraction threshold reached by a third form
control is deliberately NOT acted on here (nothing shipped to extract from
yet); recorded for whichever of 003/004 lands second.
