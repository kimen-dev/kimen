# Phase 0 Research: ki-checkbox

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 checkbox inventory; MarsUI verified 2026-07-08 — no checkbox
frame exists, onmars styles from the 001 token vocabulary), the 001 token
architecture, the 002 ki-button implementation (ElementInternals pattern,
`--_ki-*` CSS indirection, temporary-submitter machinery — not needed here),
the 003 ki-input plan (research D1–D10: sibling form control planned under
the same charter; its applicable decisions are cited and reused rather than
re-derived), the HTML form-associated custom elements (FACE) spec and the
constraint-validation API.

## D1 — Shadow anatomy: native `<input type="checkbox">` wrapped by a shadow `<label>`; label = default slot

**Decision**: the shadow root renders

```html
<label>
  <input type="checkbox" … />                    <!-- visually hidden, real control -->
  <span part="control" aria-hidden="true">       <!-- the visual box -->
    <svg …>checkmark path</svg>
    <svg …>indeterminate dash</svg>
  </span>
  <span part="label"><slot /></span>             <!-- slotted label text -->
</label>
```

with `shadow: { delegatesFocus: true }`. The native input is visually hidden
(opacity 0, absolutely positioned over the control box, sized to
`max(control-size, min-target)` so the pointer target stays ≥ 24 px —
FR-011) but remains the real focusable, checkable control. The `control`
span renders the token-styled box and the SVG marks (D7). The wrapping
shadow `<label>` implicitly labels the input by nesting, so the slotted
default-slot content is BOTH the accessible name and a native activation
surface.

**Rationale**: semantic HTML first (Art. IV). A real checkbox provides
toggle-on-click, Space activation, `:indeterminate`/mixed exposure,
disabled semantics and checkbox validity natively — zero ARIA. Accessible
name computation walks the flattened tree, so text slotted into the shadow
`<label>` names the internal checkbox (S7; FR-003), and label activation
(S20) is native label behavior, not a click handler: the browser fires the
input's own `input`/`change` with correct ordering and toggle semantics.
`delegatesFocus` keeps one tab stop and makes `host.focus()` land on the
control. This resolves the label-mechanism question raised during planning
(shadow `<label>` vs host click handler) in favor of the label: a handler
would need to re-implement activation, event ordering, and disabled
suppression that the label gives for free, and could double-toggle when the
click lands on the input itself.

**Alternatives considered**: (a) click handler on the host that flips
`checked` — re-implements native activation, risks double toggles (host
handler + native input behavior) and needs manual event synthesis; rejected.
(b) `appearance: none` on the input, styling the input itself as the box —
an input cannot contain the SVG marks, forcing background-image/mask hacks
that break the currentColor contract (D7); rejected. (c) external
`<label for="host">` via FACE `internals.labels` — the spec makes the
default slot the label (FR-003); an external label cannot be slotted
content; rejected — same reasoning as 003 D1's rejection of external labels.

## D2 — Checked model: reflected live `checked`, presence semantics enforced, reset baseline captured at form association

**Decision**: `@Prop({ reflect: true, mutable: true }) checked = false` — the
property is the live selection state AND the attribute stays in sync
(charter style-driving-props rule; the spec's serialization edge case
requires markup that always agrees with the visual state). Consequences the
spec already draws (FR-006): the attribute CANNOT play the native
`defaultChecked` role, so the reset baseline is the checked state captured
in `formAssociatedCallback`. Data flow:

- user toggle → internal input's native activation flips `input.checked` →
  internal `change` listener syncs `checked` from `input.checked`, clears
  `indeterminate` (D3) → `internals.setFormValue(…)` (D4);
- programmatic property assignment → watcher writes `input.checked` +
  `setFormValue` — NO events dispatched (only user-driven internal events
  re-dispatch, D6; same silence-by-construction as 003 D2/D5);
- `formResetCallback()` → `checked = resetBaseline`, validity re-mirrored;
  `indeterminate` untouched (native parity, FR-006, spec edge case).

Boolean presence semantics (FR-010, S4): Stencil's attribute parser coerces
the literal string `"false"` to boolean `false`, which would violate
presence semantics (`checked="false"` must render checked). Countermeasure:
on load, every boolean prop (`checked`, `indeterminate`, `disabled`,
`required`) is normalized from attribute PRESENCE
(`this.x ||= host.hasAttribute('x')`) via one tiny pure helper in
`ki-checkbox.form.ts`, exhaustively unit-tested (mutation-gap compensating
control, as 003 D6 did for its type allowlist).

**Rationale**: native-parity for everything the scenarios observe (S1, S13,
S20-adjacent flows) while honoring the charter rule that state-driving
styling selects on attributes (`:host([checked])`,
`:host([indeterminate])`). Honest limitation, declared (mirroring 003 D2's
honesty clause): native dirty-checkedness decouples attribute from
checkedness after user interaction; with a reflected prop that decoupling is
unreproducible — the baseline-capture in `formAssociatedCallback` yields the
same observable outcome for every approved scenario (S13), and per Art. VII
the simplest design satisfying the approved scenarios wins. Post-load
`setAttribute('checked', 'false')` still goes through Stencil coercion; no
approved scenario observes that sequence (S4 is declared markup at render).

**Alternatives considered**: (a) non-reflected `checked` with the attribute
as `defaultChecked` (exact native model, what 003 D2 chose for `value`) —
contradicts the charter's style-driving-props rule and the spec's explicit
FR-002/FR-006 decisions (serialized markup must agree with visual state);
rejected. (b) capturing the baseline at `componentWillLoad` — a checkbox
moved into a form later would baseline too early; `formAssociatedCallback`
is the moment the spec names; rejected.

## D3 — Indeterminate: reflected boolean, forwarded to the internal input property, presentation-only

**Decision**: `@Prop({ reflect: true, mutable: true }) indeterminate = false`,
synced BOTH ways: the watcher forwards it to the internal
`input.indeterminate` (a property — the native input has no such
attribute), and the internal `change` listener clears the prop (which
removes the reflected attribute) on any user toggle. The submitted value
never reads it (D4). CSS: `:host([indeterminate])` overrides
`:host([checked])` (mixed wins visually, spec edge case).

**Rationale**: the spec already fixed reflection (FR-002 and the
Assumptions: declarative agent markup + token-driven CSS on the attribute +
serialization that agrees with the visual state), so the open question was
the exposure mechanism, and forwarding to the native input's
`indeterminate` property answers it with zero ARIA: the platform exposes
the mixed state itself (S8) exactly as it does for a page-level checkbox —
no hand-written `aria-checked="mixed"` to keep in sync. Toggle-resolution
semantics (S3 → checked, S19 → unchecked) are the native machinery's own:
activating an indeterminate checkbox clears `indeterminate` and inverts
`checked`; the component only mirrors the result back to the host props.
Reset never touches it (native parity — `formResetCallback` restores
`checked` only, FR-006).

**Alternatives considered**: (a) non-reflected property-only prop (exact
native parity) — spec-level decision already made against it; an agent
could not express partial selection declaratively and CSS could not select
it without a host attribute or custom state; rejected. (b) manual
`aria-checked="mixed"` on a styled div — re-implements what the native
input exposes for free and violates the zero-ARIA anatomy (D1); rejected.

## D4 — Form value: `setFormValue(checked ? value ?? 'on' : null)`

**Decision**: on every `checked`/`value` change and at form association,
run `internals.setFormValue(checkboxFormValue(checked, value))` where
`checkboxFormValue` is a pure function in `ki-checkbox.form.ts` returning
`value ?? 'on'` when checked and `null` when unchecked. `null` removes the
entry from the form data entirely (S11); `value` defaults to "on" for
native parity (S10, FR-005, spec assumption). The `indeterminate` flag is
not an input to the function — the submitted value is binary by
construction (S12).

**Rationale**: this is the ElementInternals pattern 002 established and 003
D2 extended: `setFormValue` on every change keeps the submitted entry
current, and the FACE machinery excludes a disabled host — including
`fieldset[disabled]` ancestry via `formDisabledCallback` — from form data
natively (S15 needs no extra code; same free ride 003 D3 documented). The
pure function is trivially exhaustive to unit-test: the mutation-gap
compensating control (plan.md Art. III), mirroring 002's
`normalizeKiButtonType` and 003's `normalizeKiInputType`.

**Alternatives considered**: submitting an empty string when unchecked —
breaks S11 (native unchecked checkboxes contribute NOTHING); rejected.

## D5 — Constraint validation: mirror the internal checkbox's ValidityState; user-invalid custom state

**Decision**: `required` is forwarded to the internal input and checkedness
is always synced (D2), so on every validity-affecting change run
`internals.setValidity(input.validity, input.validationMessage, input)` —
the third argument anchors `reportValidity()` focus. A required unchecked
checkbox is `valueMissing` computed by the platform, never re-implemented
(S14). The invalid PRESENTATION is the 003 D7 mechanism reused verbatim: a
`user-invalid` custom state via `internals.states`, styled
`:host(:state(user-invalid))` from the invalid tokens — SET when the host
receives an `invalid` event (blocked submission attempt, S14) or when a
user toggle leaves the control invalid (unchecking a required checkbox);
CLEARED when validity turns valid (checking it) and on form reset. A
freshly rendered required unchecked checkbox never carries it (FR-009:
states are never attributes/props).

**Rationale**: identical reasoning to 003 D3/D7, which resolved this for
the sibling control: mirroring the whole ValidityState is simpler than
filtering, keeps parity honest, and native `:user-invalid` cannot work for
FACE hosts (the browser does not track the user-interacted flag for them,
and the internal input never sees the outer form's submission attempt).
CustomStateSet is baseline across the evergreen target (003 plan Technical
Context). Validation-message display stays out of v1 (FR-007, aligned with
003).

**Alternatives considered**: (a) hand-rolled `valueMissing` computation —
re-implements the platform; rejected (003 D3). (b) `data-invalid` host
attribute — a state as an attribute violates FR-009; rejected (003 D7).

## D6 — Events: composed `input` passes through, `change` re-dispatched composed; Space native, Enter inert

**Decision**: 003 D5 reused verbatim: native `input` events are
`composed: true` and cross the shadow boundary retargeted to the host;
native `change` is `composed: false`, so the component listens to the
internal `change` and re-dispatches
`new Event('change', { bubbles: true, composed: true })` from the host. No
`ki-*` events (charter). Ordering (S1: input precedes change) is preserved
by construction — the native input event has already crossed when the
internal change listener runs. Keyboard: Space activation is the internal
native checkbox's own behavior (S6); Enter does nothing (native parity,
spec assumption) — unlike 003 D4 there is NO implicit-submission forward,
because native checkboxes have none.

**Rationale**: FR-001 verbatim. Because the re-dispatch is wired only to
the internal (user-driven) `change`, programmatic `checked` assignments are
silent by construction — no suppression flags (003 D5's rationale). Rapid
repeated toggling yields exactly one change per flip because each flip is
one native activation (spec edge case).

**Alternatives considered**: (a) `ki-change` — charter forbids; rejected.
(b) re-dispatching `input` too — already composed, would double-fire;
rejected (003 D5).

## D7 — Marks: inline SVG with currentColor; M3 state-change animation behind prefers-reduced-motion

**Decision**: the `control` span contains two inline SVGs — a checkmark
path and an indeterminate dash — drawn with `stroke="currentColor"`
(`fill="none"`), `aria-hidden="true"`. `color` on the control resolves from
the `--_ki-checkbox-fg` indirection (D8), so the mark ink is a pure token
decision in every selection × interaction state and theme. Visibility is
CSS-toggled: `:host([checked])` shows the check, `:host([indeterminate])`
shows the dash and wins over checked (D3). v1 ships the M3-reference mark
state-change animation (a short draw/scale transition on the mark) wrapped
entirely in `@media (prefers-reduced-motion: no-preference)`; under reduced
motion no transition exists and states apply instantly (FR-014, S21).

**Rationale**: no icon font (Art. IV — no dependency, no font FOUT, no
private-use glyphs invisible to AT) and no background-image (cannot take
currentColor, breaking one-step re-theming). Duration/easing literals are
an implementation detail per the spec's Assumptions (the reduced-motion
contract is the spec-level behavior); if the stylelint token allowlist
rejects motion literals during implementation, the remedy is a declared
additive `--ki-checkbox-mark-duration` token at the merge gate — not
speculative tokens now (Art. VII).

**Alternatives considered**: (a) icon font — dependency + a11y hazards;
rejected. (b) CSS mask-image with an SVG data URI — takes currentColor but
pushes geometry into CSS strings the stylelint allowlist cannot inspect and
duplicates the glyph per state; inline SVG is simpler and inspectable;
rejected.

## D8 — Component token layer: structure + selection × interaction ink matrix + invalid treatment + focus ring; contrast sweep extension

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `checkbox.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars by inheritance):
  - structure (8): `control-size`, `min-target`, `gap`, `radius`,
    `border-width`, `label-font-size`, `label-font-weight`,
    `label-line-height` → `--ki-checkbox-*`; geometry references
    `ki.space.*`/`ki.radius.*`/`ki.typography.*`.
  - selection × interaction ink matrix (36):
    `--ki-checkbox-{unchecked|checked|indeterminate}-{rest|hover|active|disabled}-{bg|fg|border}`,
    referencing `ki.surface.*`, `ki.text.*`, `ki.outline.*`, `ki.accent.*`
    semantic tokens. `fg` is the mark ink (currentColor, D7); the unchecked
    column keeps the matrix uniform per the spec's constitutional surface
    even though its mark is not rendered.
  - invalid treatment (3): `--ki-checkbox-invalid-{bg|fg|border}`, applied
    under `:state(user-invalid)` across selection states (D5).
  - focus ring (3): `--ki-checkbox-focus-ring-{color|width|offset}` — same
    convention as 002/003.
- `checkbox.material3.tokens.json` — material3 overrides for the same
  names (M3 selected/indeterminate = primary fill with on-primary mark,
  error family for the invalid treatment), compiled exactly like
  `button.material3.tokens.json`.

Total = 50 tokens per theme. Wiring: append both files to `LAYERS` /
`MATERIAL3_LAYERS` in `packages/tokens/style-dictionary.config.mjs`.
Component CSS consumes through the private indirection layer
`--_ki-checkbox-*` set on `:host` and swapped per selection attribute and
CSS state (base = unchecked-rest; overridden under `:host([checked])`,
`:host([indeterminate])`, `:host(:hover)`, `:host(:active)`,
`:host([disabled])`, `:state(user-invalid)`) — the 002/003 pattern.

Contrast gate: `COMPONENT_BG_PATTERN` in
`packages/tokens/scripts/check-contrast.mjs` is per-component BY DESIGN
(its own comment mandates extension for every new component matrix, or the
gate silently ignores it). Extend the sweep with
`/^--ki-checkbox-(?:checked|indeterminate)-(?:rest|hover|active)-bg$/u`
pairing each `-bg` with its `-fg` (the rendered mark), in both themes ×
schemes. The `unchecked` column is deliberately OUTSIDE the AA text sweep:
when unchecked no mark is rendered, and the visible unchecked ink is the
BORDER on the page surface — non-text contrast (WCAG 1.4.11, 3:1), which
the 4.5:1 text gate does not measure; that obligation is met at the token
layer by referencing the same semantic outline ramp the 001 contract
already validates, and is asserted visually in the browser suite. Disabled
cells are exempt (WCAG 1.4.3, existing gate rule).

**Rationale**: the spec's constitutional surface fixes this exact
vocabulary (no variant/tone/size axes — MarsUI has no checkbox frame, M3's
checkbox is a single fixed-size control), so the 002 variant × tone matrix
collapses to selection × interaction. The matrix is explicit rather than
clever because provable one-step re-theming (S16) is the product
differentiator (same rationale as 003 D8).

**Alternatives considered**: (a) collapsing checked and indeterminate into
one "selected" ink family — M3 colors them identically today, but the spec
names three selection states and a theme must be free to differentiate
(e.g., a future brand dimming the mixed state); one collapsed family would
force component CSS changes to differentiate later — exactly the failure
mode 003 D8 rejected for label inks; rejected. (b) sweeping the unchecked
column in the text-contrast gate — measures an ink that is never rendered
and fails spuriously on transparent backgrounds; rejected with the 1.4.11
note above.

## D9 — Tests and traceability

**Decision**: both test surfaces marked `// @spec:006-ki-checkbox`, S-IDs
on code lines (test titles):

- `ki-checkbox.spec.tsx` (mock-doc, fast): S4 (`checked="false"` renders
  checked — presence semantics), anatomy assertions (shadow label wrapping
  input + control + slotted label; parts `control`/`label`; both SVG marks
  present, `aria-hidden`, currentColor), plus exhaustive unit cases for the
  `ki-checkbox.form.ts` pure functions — `checkboxFormValue` (checked ×
  value present/absent) and the boolean-presence normalizer (D2, D4;
  mutation-gap compensating control).
- `ki-checkbox.browser.spec.ts` (real browser, built output): S1/S2/S20
  real pointer toggles via `userEvent` (event order, disabled inert, label
  activation), S5/S6 keyboard (Tab + visible focus indication, Space
  toggles), S7/S8/S9 accessibility tree (name from slot, checked state,
  mixed state, disabled unavailable), S3/S19 mixed-resolution toggles,
  S10–S15 real `<form>` (FormData present/absent, binary-under-mixed,
  reset baseline, required blocks + user-invalid appearance, fieldset
  disabled), S16/S18 theming + RTL order, S21 reduced-motion emulation,
  axe zero violations across the selection × interaction × validity matrix.
  S17 forced dark follows the 002/003 split
  (`ki-checkbox.dark.browser.spec.ts`) if isolation is needed.

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships
(`dist/components/ki-checkbox.js`), mock-doc covers fast logic branches.
RED first per Art. III (same split as 003 D9).

## D10 — Accessibility specifics

**Decision**: accessible name via the flattened-tree label computation —
slotted default-slot text inside the shadow `<label>` names the internal
checkbox (S7); zero ARIA except `aria-hidden` on the decorative SVGs. Focus
indication on the control box via the sibling selector
`input:focus-visible ~ [part='control']` using the
`--ki-checkbox-focus-ring-*` tokens: keyboard focus always shows the ring
(S5); pointer clicks follow the platform's `:focus-visible` heuristics —
native checkbox parity, and a deliberate, justified deviation from 003
D10's `:focus-within` (a text field ALWAYS shows focus natively; a checkbox
does not). Pointer target: the hidden input overlay is sized to
`max(--ki-checkbox-control-size, --ki-checkbox-min-target)` ≥ 24 px
(FR-011), and the whole label row remains an activation surface. Disabled
is forwarded to the internal input → out of tab order, exposed unavailable
(S2, S9); disabling while focused moves focus on and fires no change
(native behavior of disabling the internal input — spec edge case). Space
toggles, Enter is inert (D6). NO manual APG walkthrough: the checkbox —
including its mixed state — is an established native/APG pattern, not a new
interaction pattern in this batch (the charter's manual-walkthrough list
covers dialog, tooltip, tabs and select's listbox; spec constitutional
surface). axe runs per selection × interaction × validity cell under both
themes and both schemes, not on one instance.

**Rationale**: Art. V floor-vs-proof language — axe is the floor; for a
native pattern the proof is native semantics preserved end to end (label
naming, checked/mixed/disabled in the accessibility tree), which
S7/S8/S9 pin down deterministically (same reasoning as 003 D10).
