# Phase 0 Research: ki-textarea

Decisions that resolve every open technical question in the plan.
ki-textarea is the multiline sibling of ki-input (003): wherever a 003
decision applies unchanged, this file ADOPTS it by citation instead of
re-deriving it (Art. VII — the second control reuses the first one's
answers; divergence exists only where the native multiline control
genuinely differs). Sources: the spec (M3 multi-line inventory; MarsUI
verified 2026-07-08 — no textarea frame exists, onmars styles from the 001
token vocabulary), the 003 research (D1–D10), the 002 ki-button
implementation (ElementInternals pattern, `--_ki-*` CSS indirection), the
HTML form-associated custom elements (FACE) spec and the
constraint-validation API.

## D1 — Shadow anatomy: native `<textarea>` + component-rendered `<label for>`, no slots

**Decision**: ADOPT 003 D1 (label-above-field anatomy, `for`/`id` in the
same shadow tree, `delegatesFocus: true`) with two textarea-specific
deltas. The shadow root renders

```html
<label part="label" htmlFor="textarea">{label}</label>
<div part="field">
  <textarea part="textarea" id="textarea" … />
</div>
```

- The entry element is a native `<textarea>` — multiline editing,
  Enter-inserts-a-line, caret/selection, IME, scrolling and
  `disabled`/`readonly` behavior come from the platform, zero ARIA. No
  `type` attribute exists, so 003's type allowlist (D6 there) has no
  equivalent here.
- NO `start`/`end` slots (spec Assumptions: affix slots are deliberately
  excluded in v1, additive MINOR later) and no default slot. Because the
  shadow root has no `<slot>` at all, light-DOM text children simply never
  render — the spec's "element text content is ignored" edge case holds by
  construction, no code needed.

`placeholder`, `required`, `readonly`, `disabled`, `autocomplete` and the
normalized `rows` (D6) are forwarded to the internal textarea; `name` is
NOT forwarded (form identity belongs to the host via ElementInternals,
003 D2/D3 pattern).

**Rationale**: identical to 003 D1 — semantic HTML first (Art. IV), plain
`for`/`id` gives the accessible name (S9) and label-click-focuses for
free; `delegatesFocus` keeps one tab stop and, combined with the native
disabled semantics, keeps a disabled host out of the tab order (S5, 002
precedent).

**Alternatives considered**: the same three label alternatives 003 D1
rejected (external FACE label, `aria-label`, `aria-labelledby`) fail here
for the same reasons; additionally (d) accepting light-DOM text as the
initial value (native-textarea authoring parity) — rejected by the spec
itself (uniform `value`-attribute authoring contract across the batch,
one rule for agents).

## D2 — Value model: dirty-value semantics, attribute = default (ADOPT 003 D2)

**Decision**: ADOPT 003 D2 unchanged: `@Prop({ mutable: true }) value = ''`,
NOT reflected — property is the live value, the `value` attribute declares
the default only; user edits update the prop from the internal `change`
/`input` flow; programmatic assignment replaces the display and dispatches
NO events; `formResetCallback` restores `getAttribute('value') ?? ''` and
clears the dirty flag (S13). One textarea-specific mechanic: the internal
textarea's display is driven by writing its `value` PROPERTY (via ref +
watcher guarding the echo), never by rendering JSX children — children
would set native default content and re-introduce the content-as-default
channel the spec closes.

**Rationale**: as in 003 — exact native parity for everything the
scenarios observe (S1, S2, S13; FR-002), `setFormValue` on every change
keeps the submitted text current, line breaks travel untouched because the
value is never serialized/escaped in between (S2, S12). The declared
limitation in 003 D2 (Stencil syncs attribute → prop where native lets the
dirty flag win) carries over verbatim and equally unobserved: no approved
004 scenario mutates the attribute after an edit.

**Alternatives considered**: same as 003 D2 (reflected value; captured
defaultValue) — rejected for the same reasons.

## D3 — Constraint validation: mirror the internal textarea's ValidityState (ADOPT 003 D3)

**Decision**: ADOPT 003 D3: on every validity-affecting change (value,
`required`, `readonly`, disabled state), run
`internals.setValidity(textarea.validity, textarea.validationMessage, textarea)`.
`required` is forwarded so `valueMissing` computes natively (S14). The
textarea surface is narrower than input's — no `typeMismatch`/pattern
kinds exist — which makes full-mirroring strictly simpler, not different.

**Rationale**: as in 003 — never re-implement the platform (FR-009).
Readonly exemption (FR-006, asserted alongside S23) is free: a readonly
native textarea is barred from constraint validation, so the mirror
propagates the exemption. Disabled host exclusion from form data and
validation is FACE machinery (S15, S16 need no extra code).

## D4 — Enter behavior: NO implicit-submission forward (deliberate inversion of 003 D4)

**Decision**: no Enter keydown handler exists in ki-textarea. 003 D4 added
a `keydown → internals.form?.requestSubmit()` forward because a
single-line input must submit on Enter and the shadow boundary breaks the
native path. For a multiline field the native behavior is the opposite —
Enter inserts a line break and never triggers implicit submission — and
the shadow boundary already guarantees it: the internal textarea is not
associated with the outer form, so no submission path exists to suppress.
The correct implementation is the ABSENCE of 003's forward, pinned by a
regression scenario (S8) so a future "share form logic with ki-input"
refactor cannot silently re-introduce the forward.

**Rationale**: FR-004 verbatim; this is the exact behavioral contrast with
003 S8 that both catalogs must document (spec Edge Cases). Zero code is
the simplest design satisfying the scenario (Art. VII).

**Alternatives considered**: (a) intercepting Enter to keep parity with
ki-input — violates FR-004 and native semantics; rejected. (b) relying on
native implicit-submission rules without a test — the platform never
submits from a textarea, but the guarantee here rests on the shadow
boundary + no forward, which a refactor could break; S8 stays as the
pinned regression; rejected as untested assumption.

## D5 — Events: composed `input` passes through, `change` re-dispatched composed (ADOPT 003 D5)

**Decision**: ADOPT 003 D5 unchanged: native `input` is `composed: true`
and crosses the boundary retargeted to the host (S1); native `change` is
not composed, so the component re-dispatches
`new Event('change', { bubbles: true, composed: true })` from the host on
internal commit (S20). No `ki-*` events (FR-010). Programmatic assignments
are silent by construction (wired only to the internal user-driven
`change`).

## D6 — `rows`: pure normalization, default 2, unknown → default

**Decision**: `rows` is a reflected `number` prop, default `2` (spec
FR-003 — native parity; the spec carries a [NEEDS CLARIFICATION] marker on
this default as a founder call at gate 1; a different answer changes one
constant + one token-free default, nothing structural). A pure function
`normalizeKiTextareaRows(value: unknown): number` in `ki-textarea.form.ts`
(the structural mirror of 003's `normalizeKiInputType`) returns
`Math.floor(value)` when the input is a finite number ≥ 1, else `2`; the
internal textarea receives the normalized value as its `rows` attribute.
Non-numeric attribute values (e.g. `rows="tall"`) reach the prop as `NaN`
through Stencil's number coercion and normalize to the default (S6).

**Rationale**: FR-003 — agent-generated markup is not trusted; the
fallback must be deterministic and never break rendering (US4). Flooring
a fractional value mirrors HTML integer parsing closely enough for the
approved scenarios; anything more (string re-parsing of integer prefixes)
is speculative. The function is tiny, pure and exhaustively unit-tested —
the mutation-gap compensating control (plan.md Art. III, same role as
003 D6).

**Alternatives considered**: (a) forwarding the raw attribute and trusting
native parsing — native parses `rows="tall"` to the default, but Stencil's
prop layer would hold `NaN` and reflect garbage; the normalized prop keeps
property reads honest; rejected. (b) clamping an upper bound — no scenario
demands one; speculative (Art. VII); rejected.

## D7 — Fixed height: `rows` drives it, native resize neutralized (founder-approved)

**Decision**: v1 height is fixed by `rows` — no auto-grow and no user
resize handle (founder approved 2026-07-08, resolving the spec's open
question). Mechanics:

- the internal textarea gets the normalized `rows` attribute, so its
  content-box height is `rows × line-height` natively; the component sets
  `line-height: var(--_ki-textarea-line-height)` on the textarea part so
  the token layer controls exactly how tall a "line" is (S3 measurable:
  a 6-row field is four line-heights taller than a 2-row one);
- `resize: none` on the internal textarea neutralizes the native drag
  handle (`resize` is not a token-carrying property in the stylelint
  strict-value list, so the keyword is legal in component CSS);
- overflowing content scrolls inside the field natively (no `overflow`
  declaration needed — textarea default), page layout never shifts;
- the `field` wrapper carries `min-block-size: var(--_ki-textarea-min-target)`
  so the ≥24 px pointer target holds even at `rows="1"` (FR — Art. V
  target size; trivially satisfied from 2 rows up).

**Rationale**: FR-003 and the spec's layout-predictability assumption
(agents composing views need stable geometry). Auto-grow and a resize
handle are both additive-MINOR later without breaking this contract.

**Alternatives considered**: (a) `resize: vertical` (native default UX) —
contradicts the founder-approved fixed-height contract and makes S3's
height assertion racy; rejected. (b) expressing height as a
`--ki-textarea-height` token — would fight the `rows` attribute (two
sources of truth for one dimension); rows × line-height keeps one;
rejected.

## D8 — user-invalid state: CustomStateSet via `:state(user-invalid)` (ADOPT 003 D7)

**Decision**: ADOPT 003 D7 unchanged: `internals.states.add('user-invalid')`
/ `.delete(…)`; CSS styles `:host(:state(user-invalid))`. SET on a host
`invalid` event (blocked submission attempt — S14's appearance channel) or
on a user commit that leaves the field invalid; CLEARED when validity
turns valid and on form reset. A fresh empty required field never carries
it (FR-012: states are never attributes/props).

## D9 — Component token layer: `--ki-textarea-*`, multiline geometry, per-state ink matrix

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`,
following 003 D8's shape with multiline geometry deltas:

- `textarea.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars by inheritance):
  - structure, single scale — no size axis (spec): `padding-inline`,
    `padding-block` (NEW vs input — a multiline field's vertical rhythm is
    padding + n×line-height, where input pinned a one-line `height`; there
    is no `height` token, see D7), `label-gap`, `radius`, `min-target`,
    `font-size`, `font-weight`, `line-height` (load-bearing: gives `rows`
    its meaning, D7), `label-font-size`, `label-font-weight`,
    `label-line-height` → 11 tokens. No `gap`/`icon-size` (no slots, D1).
  - border width per logical side: `border-width` +
    `border-{block-start|block-end|inline-start|inline-end}-width`, each
    defaulting by reference to `{ki.textarea.border-width}` (5 tokens) —
    the same lever that makes both M3 enclosures (outlined = uniform,
    filled = bottom-only indicator) token-expressible (003 D8, FR-011).
  - color per state `{rest|hover|focus|disabled|readonly|invalid}` × five
    inks `{bg|fg|border|label-fg|placeholder-fg}` →
    `--ki-textarea-{state}-{ink}` (30 tokens), referencing `ki.surface.*`,
    `ki.text.*`, `ki.outline.*` — state keys aligned with `--ki-input-*`
    by spec mandate.
  - focus ring: `--ki-textarea-focus-ring-{color|width|offset}` (3).
- `textarea.material3.tokens.json` — material3 overrides for the same
  names (its M3 enclosure via the per-side border widths, M3 label/ink
  state colors), compiled like `button.material3.tokens.json`.

Total ≈ 49 tokens per theme. Wiring: append both files to `LAYERS` /
`MATERIAL3_LAYERS` in `packages/tokens/style-dictionary.config.mjs`.
Component CSS consumes through the private indirection layer
`--_ki-textarea-*` set on `:host` and swapped per CSS state — the 002/003
pattern (base = rest; overridden under `:hover`, `:focus-within`,
`[disabled]`, `[readonly]`, `:state(user-invalid)`).

**Rationale**: as in 003 D8 — per-state label and placeholder inks are
what let material3 color the label on focus/error without touching
component CSS; the matrix is explicit because one-step re-theming (S17)
is the product differentiator. The geometry delta (padding-block replaces
height) is the only structural divergence multiline actually forces.

**Alternatives considered**: same as 003 D8 (single label/placeholder
color; enclosure attribute; physical border sides) — rejected for the same
reasons; plus a `--ki-textarea-height` token (rejected in D7).

## D10 — Contrast gate: extend the component sweep to `--ki-textarea-*`

**Decision**: `packages/tokens/scripts/check-contrast.mjs` today derives
component-layer pairs from a BUTTON-ONLY pattern
(`COMPONENT_BG_PATTERN = /^--ki-button-…-bg$/`) — its own comment mandates
per-component extension or the gate silently ignores the new matrix.
Extending it is part of this feature's token work (not a separate chore):

- add a textarea pattern matching
  `--ki-textarea-{rest|hover|focus|readonly|invalid}-bg` (disabled exempt,
  WCAG 1.4.3) and derive, per matched state: `{state}-fg` on `{state}-bg`
  (entered text) and `{state}-placeholder-fg` on `{state}-bg` (placeholder
  is real text and must clear AA);
- add label pairs: `{state}-label-fg` against `--ki-surface-s0` — the
  label renders OUTSIDE the field enclosure, on the page surface (D1);
- keep the zero-match guard PER PATTERN (a matched button sweep must not
  mask a drifted textarea pattern);
- extend `scripts/check-contrast.test.mjs` for the new derivation.

**Rationale**: the sweep exists because the 002 clean-context review found
dark-scheme failures the hardcoded pairs could not see (incident-to-gate
rule, Art. X: a finding a rule could produce becomes a rule). Landing
`--ki-textarea-*` without extending the pattern would re-open exactly that
hole. If AA arithmetic on placeholder inks forces semantic-layer deltas,
they are declared for founder sign-off at the merge gate (002 precedent,
already anticipated by the spec's Tokens surface).

**Alternatives considered**: (a) hardcoding textarea pairs into
`CONTRAST_PAIRS` — the derived-from-built-CSS approach exists precisely to
avoid pair-list drift; rejected. (b) deferring the extension to a factory
chore — the gate comment makes extension part of adding a component
matrix; deferral means shipping unverified inks; rejected.

## D11 — Tests and traceability

**Decision**: both test surfaces marked `// @spec:004-ki-textarea`, S-IDs
on code lines (test titles):

- `ki-textarea.spec.tsx` (mock-doc, fast): S6 (`rows="tall"` renders the
  internal textarea with `rows="2"`), anatomy assertions (parts
  `field`/`textarea`/`label`, label `for`/`id` wiring, NO slots — light-DOM
  text does not render), exhaustive `normalizeKiTextareaRows` unit cases
  (D6 compensating control: allowed integers, floats, NaN, negatives,
  zero, non-numeric).
- `ki-textarea.browser.spec.ts` (real browser, built output): S1/S2 real
  typing via `userEvent` (input events; multiline value with `\n`
  preserved), S3 rows=6 field height = 6 line-heights (computed against a
  rows=2 baseline), S4 readonly rejects edits, S5 disabled inert +
  unfocusable, S19 `:placeholder-shown` flips when typed, S20 change on
  blur; S7/S21 keyboard (focus visible, Tab exits without inserting a
  character), S8 Enter inserts a line and the form does NOT submit (D4
  regression pin); S9–S11/S22/S25 accessibility tree + forwarded
  autocomplete; S12–S16/S23 real `<form>` (FormData with line breaks,
  reset, blocked submit, fieldset disabled, disabled/readonly submission
  contrast); S17/S24 theming + RTL; axe zero violations across the
  state × theme matrix. S18 forced dark follows the 002/003 split
  (`ki-textarea.dark.browser.spec.ts`) if isolation is needed.

**Rationale**: as 003 D9 — the browser suite asserts what ships
(`dist/components/ki-textarea.js`); mock-doc covers fast logic branches;
RED first per Art. III.

## D12 — Accessibility specifics (ADOPT 003 D10, textarea deltas noted)

**Decision**: ADOPT 003 D10: focus indication on the `field` enclosure via
`:host(:focus-within)` using `--ki-textarea-focus-ring-*` tokens (S7,
surviving both themes and schemes); `min-block-size` ≥
`--ki-textarea-min-target` (D7); no intrinsic motion — the label is
static, so no `prefers-reduced-motion` surface exists in v1 (spec
assumption); `autocomplete` forwarded verbatim to the internal textarea
(SC 1.3.5 / S25 — a gap axe cannot detect, asserted by contract test);
NO manual APG walkthrough — a labeled multiline text field is a native
pattern (the charter flags dialog/tooltip/tabs/select only); axe runs per
state cell under both themes, not on one instance.
