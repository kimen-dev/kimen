# Phase 0 Research: ki-input

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 text-field inventory; MarsUI verified 2026-07-08 — no input
frame exists, onmars styles from the 001 token vocabulary),
the 001 token architecture, the 002 ki-button implementation (ElementInternals
pattern, `--_ki-*` CSS indirection, reflected attributes with
fallback-by-construction), the HTML form-associated custom elements (FACE)
spec and the constraint-validation API.

## D1 — Shadow anatomy: native `<input>` + component-rendered `<label for>`

**Decision**: the shadow root renders

```html
<label part="label" htmlFor="input">{label}</label>
<div part="field">
  <slot name="start" />
  <input part="input" id="input" type={normalized} … />
  <slot name="end" />
</div>
```

with `shadow: { delegatesFocus: true }`. The label sits in block flow above
the field enclosure (static, no floating-label motion — FR-016). The `field`
wrapper carries enclosure styling (bg, border, radius) and lays out
`start`/entry/`end` on the inline axis. `placeholder`, `required`,
`readonly`, `disabled` and `autocomplete` are forwarded to the internal
input; `name` is NOT forwarded (form identity belongs to the host via
ElementInternals, D2).

**Rationale**: semantic HTML first (Art. IV). A real `<input>` provides text
editing, caret/selection, IME composition, per-kind entry semantics
(password masking, mobile keyboards) and `disabled`/`readonly` behavior
natively — zero ARIA. Label and input live in the same shadow tree, so plain
`for`/`id` yields the accessible name (S9) AND label-click-focuses-input for
free; `delegatesFocus` keeps one tab stop and makes `host.focus()` land in
the entry area (also covers clicks on non-focusable shadow regions).

**Alternatives considered**: (a) external `<label for="host">` via FACE
`internals.labels` — the spec makes `label` a component-rendered attribute
(FR-002: visible label guaranteed by construction), and an external label
cannot be rendered by the component; rejected. (b) `aria-label` on the
internal input — invisible, violates FR-002's visible-label mandate;
rejected. (c) `aria-labelledby` inside the shadow root — equivalent naming
but strictly weaker than `for`/`id` (no click-to-focus); rejected.

## D2 — Value model: dirty-value semantics, attribute = default

**Decision**: `@Prop({ mutable: true }) value = ''`, NOT reflected — the
property is the live current value; the `value` content attribute declares
the default only and is never rewritten by typing. Data flow:

- user edit → internal `input` event → prop updated from `input.value`
  (watcher guards the echo) → `internals.setFormValue(value)`;
- programmatic property assignment → watcher writes `input.value` +
  `setFormValue` — display replaced, NO events dispatched (S20; only
  user-driven internal events re-dispatch, D5);
- `formResetCallback()` → `value = host.getAttribute('value') ?? ''`,
  dirty flag cleared, validity re-mirrored (S13);
- a `dirty` flag records that the value diverged from the declared default
  (set on first user edit or programmatic assignment, cleared on reset).

**Rationale**: exact native parity for everything the scenarios observe
(S1, S13, S20; FR-004). `setFormValue` on every change keeps the submitted
entry current (S12) and lets the browser handle exclusion natively when the
host is disabled (S15, D3). Honest limitation, declared: one native nuance
is not reproduced — natively, mutating the `value` attribute after a user
edit does not update the display (dirty flag wins), while Stencil syncs
attribute → prop unconditionally. No approved scenario observes that
sequence; per Art. VII the simplest design satisfying the approved scenarios
wins, and if the nuance ever matters it re-enters through the spec.

**Alternatives considered**: (a) reflected `value` prop — typing would
rewrite the attribute, destroying the default needed by reset; rejected.
(b) capturing `defaultValue` once at load — native reads the live attribute
at reset time; reading `getAttribute('value')` in `formResetCallback`
matches native and is less state; rejected.

## D3 — Constraint validation: mirror the internal input's ValidityState

**Decision**: on every change that can affect validity (value, `type`,
`required`, `readonly`), run
`internals.setValidity(input.validity, input.validationMessage, input)` —
the third argument anchors `reportValidity()` focus to the internal input.
`required` and the normalized `type` are forwarded to the internal input so
`valueMissing` and `typeMismatch` are computed by the platform, never
re-implemented.

**Rationale**: FR-008 demands FULL native parity — mirroring the whole
`ValidityState` is simpler than filtering and keeps SC-003 honest for every
kind (S14 valueMissing, S28 typeMismatch on email). Readonly exemption
(S26/S27) is free: a readonly native input is barred from constraint
validation, so its `validity` never reports `valueMissing` and the mirror
propagates the exemption. A disabled host is excluded from validation and
from form data by the FACE machinery itself (S3/S15/S11 need no extra code).

**Alternatives considered**: (a) hand-rolled per-type validation —
re-implements the platform, drifts across engines and locales; rejected.
(b) mirroring only `valueMissing` — breaks SC-003's "full parity" for
email/url kinds; rejected.

## D4 — Implicit submission: Enter → `form.requestSubmit()`

**Decision**: `keydown` listener on the internal input: on `Enter` (no
modifiers, not `isComposing`, not `defaultPrevented`) call
`internals.form?.requestSubmit()`.

**Rationale**: the internal input is not associated with the outer form
(shadow boundary), so native implicit submission never fires — without this
forward, S8 fails. `requestSubmit()` runs constraint validation and fires
`submit` with native semantics; its failure path dispatches `invalid` events
on invalid controls, which is exactly what drives the user-invalid state on
a blocked submission (S14/S21/S28 compose correctly with D3/D7).

**Alternatives considered**: (a) `form.submit()` — skips constraint
validation, S14 broken; rejected. (b) a temporary native submitter proxy
(002's D2) — unnecessary here: implicit submission contributes no submitter
`name`/`value`, and 002's proxy exists only for that contribution; rejected.

## D5 — Events: composed `input` passes through, `change` re-dispatched composed

**Decision**: native `input` events are `composed: true` — they cross the
shadow boundary retargeted to the host; nothing to do. Native `change` is
`composed: false` — it dies at the shadow root, so the component listens to
the internal `change` and re-dispatches
`new Event('change', { bubbles: true, composed: true })` from the host. No
`ki-*` events (charter: platform event names only).

**Rationale**: FR-004 verbatim. Because the re-dispatch is wired only to the
internal (user-driven) `change`, programmatic assignments are silent by
construction (S20) — no suppression flags needed.

**Alternatives considered**: (a) `ki-change` custom event — charter forbids
prefixed re-emission; rejected. (b) also re-dispatching `input` — it is
already composed; a duplicate would fire twice per keystroke; rejected.

## D6 — Type allowlist: six kinds, unknown → `text`, number out

**Decision**: `type` is a reflected prop; a pure function
`normalizeKiInputType(value): 'text'|'email'|'password'|'url'|'tel'|'search'`
in `ki-input.form.ts` (mirror of 002's `normalizeKiButtonType`) maps the six
allowed values to themselves and anything else to `'text'`; the internal
input receives the normalized value.

**Rationale**: unlike 002 — where unknown values could fall back purely in
CSS — `type` feeds an attribute of the internal input, so an unknown value
would otherwise leak to the platform (`type="foo"` natively falls back to
text, but `type="number"`/`"file"`/`"checkbox"` would NOT, changing the
control) — normalization guarantees FR-012/S6 and enforces the v1 exclusion
of `number` (spinner UI + locale/formatting complexity, per charter; post-v1
additive). The function is tiny, pure and exhaustively unit-tested — the
mutation-gap compensating control (plan.md Art. III).

**Alternatives considered**: trusting native fallback for unknown strings —
does not exclude `number`/non-text native kinds, so the allowlist is needed
anyway; rejected.

## D7 — user-invalid state: CustomStateSet, styled via `:state(user-invalid)`

**Decision**: the host exposes a custom state through
`internals.states.add('user-invalid')` / `.delete(…)`; CSS styles
`:host(:state(user-invalid))`. The state is SET when (a) the host receives
an `invalid` event (a submission was attempted and validation failed — S21)
or (b) a user commit (internal `change`) leaves the field invalid; it is
CLEARED whenever validity turns valid and on form reset. A freshly rendered
untouched field never carries it, even when empty and required (FR-011).

**Rationale**: FR-011 says states are never attributes/props, which rules
out a host attribute; native `:user-invalid` cannot work here — the browser
does not track the user-interacted flag for FACE hosts, and the internal
input never sees the outer form's submission attempt across the shadow
boundary. CustomStateSet is baseline in the evergreen target (Chromium,
Firefox 126+, Safari 17.4+).

**Alternatives considered**: (a) `data-invalid` host attribute — a state as
an attribute, violates FR-011; rejected. (b) styling the internal input's
`:user-invalid` — misses the submission-attempt trigger (S21); rejected.

## D8 — Component token layer: single geometry, per-state ink matrix, per-side border widths

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `input.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars values by inheritance):
  - structure, single scale — no size axis (spec): `height`, `min-target`,
    `padding-inline`, `gap`, `label-gap`, `radius`, `font-size`,
    `font-weight`, `line-height`, `label-font-size`, `label-font-weight`,
    `label-line-height`, `icon-size` → `--ki-input-*` (~13 tokens);
    geometry references `ki.space.*`/`ki.radius.*`/`ki.typography.*`.
  - border width per logical side: `border-width` plus
    `border-block-start-width`, `border-block-end-width`,
    `border-inline-start-width`, `border-inline-end-width`, each defaulting
    by reference to `{ki.input.border-width}` (5 tokens) — this is what
    makes BOTH M3 enclosures token-expressible: outlined = uniform width,
    filled = zero everywhere except `border-block-end-width` (FR-010).
  - color per state `{rest|hover|focus|disabled|readonly|invalid}` × five
    inks `{bg|fg|border|label-fg|placeholder-fg}` →
    `--ki-input-{state}-{ink}` (30 tokens), referencing
    `ki.surface.*`, `ki.text.*`, `ki.outline.*` semantic tokens.
  - focus ring: `--ki-input-focus-ring-{color|width|offset}` (3 tokens),
    same referencing approach as 002.
- `input.material3.tokens.json` — material3 overrides for the same names
  (its chosen M3 enclosure via the per-side border widths, M3 label/ink
  state colors), compiled exactly like `button.material3.tokens.json`.

Total ≈ 51 tokens per theme. Wiring: append both files to `LAYERS` /
`MATERIAL3_LAYERS` in `packages/tokens/style-dictionary.config.mjs`.
Component CSS consumes through the private indirection layer
`--_ki-input-*` set on `:host` and swapped per CSS state — the 002 pattern
(base assignments = rest, overridden under `:hover`, `:focus-within`,
`[disabled]`, `[readonly]`, `:state(user-invalid)`).

**Rationale**: no variant/tone/size axes exist in v1, so the 002
variant × tone matrix collapses to a per-state matrix. Label and
placeholder get per-state inks (not a single color each) because the M3
reference colors the label on focus (primary), error and disabled — with a
single token, material3 could not express its label behavior without
touching component CSS, exactly the failure mode 002's D4 rejected. The
matrix is explicit rather than clever because provable one-step re-theming
(S16) is the product differentiator.

**Alternatives considered**: (a) single `label`/`placeholder` color token —
cannot express M3 focus/error label states from the token layer; rejected.
(b) an `enclosure` attribute (filled/outlined) — FR-010 explicitly forbids
appearance axes as API; rejected. (c) physical border-side tokens
(`border-bottom-width`) — Art. IV mandates logical properties; rejected.

## D9 — Tests and traceability

**Decision**: both test surfaces marked `// @spec:003-ki-input`, S-IDs on
code lines (test titles):

- `ki-input.spec.tsx` (mock-doc, fast): S6 (unknown type renders internal
  `type="text"`), S19 (label text rendered, `for`/`id` wired), S20
  (programmatic value assignment updates rendering, no change event),
  anatomy/parts assertions, plus exhaustive `normalizeKiInputType` unit
  cases (D6 compensating control).
- `ki-input.browser.spec.ts` (real browser, built output): S1–S5 real
  typing via `userEvent` (input events, change on blur, disabled inert,
  readonly rejects edits, password masking with intact value), S7/S22
  keyboard focus visibility, S9/S10/S11/S23/S24/S25 accessibility tree +
  forwarded autocomplete, S8/S12–S15/S21/S26–S28 real `<form>`
  (FormData, reset, blocked submits, fieldset disabled, readonly
  submission/exemption), S16/S18 theming + RTL slot order, axe zero
  violations across type × state × theme. S17 forced dark follows the 002
  split (`ki-input.dark.browser.spec.ts`) if isolation is needed.

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships (`dist/components/ki-input.js`),
mock-doc covers fast logic branches. RED first per Art. III.

## D10 — Accessibility specifics

**Decision**: focus indication on the field enclosure via
`:host(:focus-within)` using `--ki-input-focus-ring-*` tokens (a focused
text field always shows focus natively; `:focus-within` on the enclosure is
the shadow-boundary-safe equivalent and must survive both themes);
`min-block-size` ≥ `--ki-input-min-target` keeps the ≥24 px pointer target
(FR-013); no intrinsic transitions (FR-016), any state transition added
later wrapped in `@media (prefers-reduced-motion: no-preference)`;
`autocomplete` forwarded verbatim to the internal input (SC 1.3.5 / S25 —
axe cannot detect this gap, the browser test asserts the forward); NO
manual APG walkthrough — a labeled text field is a native pattern, not a
new APG interaction pattern (plan.md Art. V); axe runs per
type × state cell under both themes, not on one instance.

**Rationale**: Art. V floor-vs-proof language — axe is the floor; for a
native pattern the proof is native semantics preserved end to end (label
wiring, states in the accessibility tree), which the S9–S11/S22–S25 tests
pin down deterministically.
