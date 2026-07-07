# Phase 0 Research: ki-button

Decisions that resolve every open technical question in the plan. Sources:
the approved spec (Figma pattern analysis of MarsUI and Material 3 included),
the 001 token architecture, Stencil 4 form-associated support, and the HTML
form-associated custom elements (FACE) spec.

## D1 — Shadow anatomy: a native `<button>` does the heavy lifting

**Decision**: the shadow root renders
`<button part="button" type="button"><slot name="start"/><span part="label"><slot/></span><slot name="end"/></button>`,
with `shadow: { delegatesFocus: true }`.

**Rationale**: semantic HTML first (Art. IV). A real `<button>` provides
role, accessible-name computation from slotted content, Tab focusability,
Enter/Space activation, `:active`/`:focus-visible` states and disabled
semantics natively — no ARIA at all, which per the constitution beats any
hand-rolled ARIA. `delegatesFocus` makes host focus land on the button and
keeps one tab stop. The inner button is always `type="button"` because it
cannot submit the host's form across the shadow boundary anyway (D2 owns
that); this also prevents double-activation.

**Alternatives considered**: (a) host itself with `role="button"` +
`tabindex` + key handlers — re-implements the platform, more code, more ARIA
risk; rejected. (b) `<a>`-based rendering for link-buttons — navigation is
explicitly when-NOT-to-use in the approved spec; rejected.

## D2 — Form participation: FACE + native-submitter proxy

**Decision**: `formAssociated: true` with `@AttachInternals()`. On
activation: `type="submit"` → create a temporary hidden native
`<button type="submit">` inside `internals.form`, copy `name`/`value`,
`click()` it, remove it. `type="reset"` → `internals.form?.reset()`.
`type="button"` → nothing. Disabled propagation from
`fieldset[disabled]`/`formDisabledCallback` disables the inner button.

**Rationale**: form-associated custom elements have no activation behavior —
a FACE cannot *be* a submit button, and `form.requestSubmit(submitter)`
rejects non-native submitters. The temporary-native-submitter pattern (used
industry-wide, e.g. Shoelace) preserves everything the spec's S7 observes:
constraint validation runs, the `submit` event fires with correct submitter
semantics, and the button's `name`/`value` pair rides the form data exactly
like a native submit button. `requestSubmit()` without a submitter would
lose the name/value contribution required by FR-006/S7.

**Alternatives considered**: (a) `internals.setFormValue()` for name/value —
wrong tool: it submits the value on *every* submission, not only when this
button is the submitter; rejected. (b) dispatching a synthetic `submit`
event — bypasses validation and native submit machinery; rejected.

## D3 — Appearance resolution: reflected attributes + CSS, fallback by construction

**Decision**: `variant`, `tone`, `size` are reflected attributes. CSS
defines base custom-property assignments equal to the defaults
(`secondary`/`neutral`/`md`) on `:host`, then overrides per known value
(`:host([variant='primary'])`, …). The rendered rule reads only
`--ki-button-bg/fg/border/shadow` and geometry properties.

**Rationale**: an unrecognized value matches no override selector, so the
element renders the documented defaults with zero validation code — S11 and
FR-010 satisfied by construction (Art. VII: simplest design). Reflection is
required for attribute selectors to also cover property-based usage.

**Alternatives considered**: JS enum validation with warnings — more code,
duplicate source of truth, and agents get a rendered default either way;
rejected.

## D4 — Component token layer: geometry per size, color per variant × tone × state

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `button.tokens.json` — the theme-neutral schema resolving from the 001
  semantic layer (onmars values by inheritance):
  - geometry per size (5): `height`, `padding-inline`, `gap`, `radius`,
    `font-size`, `line-height`, `icon-size`, `min-target` →
    `--ki-button-{size}-*` (~40 tokens); radius references
    `ki.corner.control`/`ki.radius.*`.
  - color per variant (5) × tone (3) × state (rest/hover/active/disabled):
    `bg`, `fg`, `border` → `--ki-button-{variant}-{tone}-{state}-{prop}`
    (180 tokens), each referencing semantic tokens
    (`ki.surface.{family}.{emphasis}-em`, `ki.text.*`, `ki.outline.*`,
    `ki.surface.disabled.*`). Tone maps families: neutral→primary,
    success→success, danger→danger. Variant maps emphasis grades:
    primary→high-em, secondary→med-em, tertiary→low-em(+elevation),
    quaternary→outline-led, ghost→base-em/transparent.
  - elevation per variant × state → `--ki-button-{variant}-{state}-shadow`
    (20 tokens) referencing `ki.elevation.*`.
- `button.material3.tokens.json` — material3 overrides for the same names
  (round shape via radius tokens, M3 state-layer colors, elevated shadow),
  compiled into the material3 stylesheets exactly like the 001 semantic
  overrides.

**Rationale**: FR-008 mandates `--ki-button-*` for every visual value. The
001 semantic layer already grades interactive surfaces by family × emphasis,
so the matrix is mostly reference-only (cheap to maintain, mechanical to
review). Shape lands here too: M3's Round/Square is a radius token override
in the material3 component layer — no component attribute (spec decision).
The matrix is explicit rather than clever because provable one-step
re-theming (S9) is the product differentiator: a theme fills or inherits
every name; nothing resolves outside the token graph.

**Alternatives considered**: (a) component CSS referencing semantic tokens
directly with only geometry component tokens — fewer tokens but themes could
not restyle the button without touching component CSS when their mapping
differs (exactly M3's case: elevated/outlined have no 1:1 semantic
equivalent in onmars's vocabulary); rejected. (b) generating the matrix in
JS — tokens are data, the build already exists; rejected.

## D5 — ki-hello removal (FR-014)

**Decision**: delete `src/components/ki-hello/` and
`browser-tests/ki-hello.browser.spec.ts`, swap the `src/index.ts` export,
replace both size-limit entries with ki-button equivalents (same 9/25 KB
caps), let the build regenerate `components.d.ts` and `generated/docs.json`.

**Rationale**: the roadmap schedules this deletion "when the first real
component lands"; keeping it would double budget entries and pollute the
generated catalog surface.

## D6 — Tests and traceability

**Decision**: two test files, both marked `// @spec:002-ki-button`, S-IDs on
code lines (test titles):

- `ki-button.spec.tsx` (mock-doc, fast): S1 (click dispatch), S2 (disabled
  inertness), S11 (unknown-value fallback markup) plus prop/JSDoc surface
  assertions.
- `ki-button.browser.spec.ts` (real browser, built output): S1 (real click),
  S3/S4 (Tab focus visibility, Enter/Space activation), S5/S6
  (role/name/disabled in the accessibility tree), S7/S8 (real `<form>`
  submit/non-submit with form-data assertion), S9/S10 (onmars ↔ material3
  and forced dark via injected token stylesheets, following the 001 theming
  suite pattern), axe zero-violations across the variant × tone × size
  matrix.

**Rationale**: the traceability gate requires S-IDs in code lines of marked
files; the browser suite asserts what ships (built `dist/components`
output), mock-doc covers fast logic branches. RED first per Art. III.

## D7 — Accessibility specifics

**Decision**: focus ring from semantic outline/focus tokens on
`:focus-visible` (ring must survive both themes); `min-inline-size` ≥
`--ki-button-{size}-min-target` keeps ≥24×24 px even for `xs` (24 px) and
empty-label edge cases; state transitions wrapped in
`@media (prefers-reduced-motion: no-preference)`; manual APG button
walkthrough documented in the PR (first interaction pattern in the repo);
axe runs per matrix cell, not only on one instance.

**Rationale**: Art. V floor-vs-proof language — axe is the floor, the
walkthrough the proof; WCAG 2.2 target-size and focus-appearance criteria
are the ones a button most easily violates at `xs`.
