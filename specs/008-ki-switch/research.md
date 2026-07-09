# Phase 0 Research: ki-switch

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 inventory note; MarsUI verified 2026-07-08 — no switch frame
exists, onmars styles from the 001 token vocabulary), the WAI-ARIA APG
switch pattern, the 001 token architecture, the 002 ki-button
implementation (ElementInternals pattern, `--_ki-*` CSS indirection), the
003 ki-input plan set (shadow-native-control anatomy, change re-dispatch,
per-component test layout — decisions cited rather than re-derived,
Art. VII), and the 006 ki-checkbox spec (the toggle sibling: reflection vs
reset baseline, Space-only keyboard activation).

## D1 — Base element: native `<input type="checkbox" role="switch">`

**Decision**: the shadow root renders

```html
<label class="base">
  <input type="checkbox" role="switch" id="input" … />
  <span part="track"><span part="thumb"></span></span>
  <span part="label"><slot /></span>
</label>
```

with `shadow: { delegatesFocus: true }`. The internal input is visually
hidden (never `display:none` — it stays focusable and in the accessibility
tree); the presentation lives entirely on the `track`/`thumb` parts. The
wrapping shadow `<label>` makes clicks on the track AND on the slotted
label activate the input natively (S17), and accessible-name computation
over the flattened tree gives the input its name from the slotted text
(S7). `role="switch"` is the single ARIA addition: it re-maps the native
checkbox role to switch, and the on/off state is then exposed from the
native checkedness — no `aria-checked` to manage.

**Rationale**: the APG switch pattern admits three bases — a button with
`aria-checked`, a checkbox input with `role="switch"`, or a generic
element with full manual wiring. The checkbox base wins on every
constitutional axis:

- **Art. IV/VII — platform first, least code**: toggle-on-click, Space
  activation, label activation, focusability, disabled semantics and the
  user-driven `input`→`change` event pair are all native. The button base
  provides activation but no checked state and fires neither `input` nor
  `change` — state exposure (`aria-checked`) and both events would be
  hand-rolled, creating a second source of truth to keep in sync (the
  failure mode 002 D1 rejected when it refused `role="button"` wiring).
- **Art. II — nothing beyond the approved scenarios**: APG lists Enter as
  *optional* for switches; the approved contract mandates Space only
  (FR-003, S6). A native checkbox ignores Enter — exactly the approved
  keyboard surface, and consistent with the 006 sibling's explicit
  assumption ("Enter does not toggle; Space is the keyboard activation").
  A button base would add Enter activation nobody approved.
- **S1's exactly-one guarantee**: one user toggle produces exactly one
  native `input` and one native `change`, in native order, with no
  synthesis code to get wrong.

APG caveat honored: a checkbox-based switch must never expose a mixed
state — ki-switch has no `indeterminate` (that is ki-checkbox's surface),
so the constraint is satisfied by construction.

**Alternatives considered**: (a) `<button role="switch" aria-checked>` —
manual state exposure, synthesized events, unapproved Enter activation;
rejected. (b) host element itself carrying `role="switch"` + `tabindex` +
key handlers — re-implements the platform (002 D1 precedent); rejected.
(c) styling the native checkbox itself as the track (pseudo-element
thumb) — pseudo-elements cannot carry `part`, breaking FR-010's
`track`/`thumb` parts; rejected.

## D2 — Checked model: reflected `checked`, presence semantics hardened

**Decision**: `@Prop({ mutable: true, reflect: true }) checked = false` —
the host attribute reflects live state so token-driven CSS selects the
on/off matrix on `:host([checked])` (charter reflection rule, echoed by
the spec's Assumptions). Presence semantics are normalized explicitly: at
load, `checked = hasAttribute('checked')` wins over Stencil's parsed
value, via a pure helper in `ki-switch.form.ts`
(`checkedFromMarkup(hasAttribute, parsed)`), because Stencil coerces the
attribute string `"false"` to boolean `false` while FR-001 mandates that
ANY present value — `"maybe"`, `"false"`, nonsense — means on (native
boolean-attribute semantics; S4 pins `"maybe"`, the unit suite pins
`"false"`). Data flow:

- user toggle → internal checkbox `change` → host `checked` updated from
  `input.checked` → attribute reflects → `setFormValue` (D5);
- programmatic property/attribute mutation → watcher syncs
  `input.checked` and `setFormValue` — DOM property assignment on the
  internal input fires no events, so programmatic changes are silent by
  construction (FR-002), no suppression flags;
- the watcher guards the echo (user path already set the prop).

**Rationale**: FR-001 verbatim; the reflected attribute is what makes the
color matrix (D7) selectable from CSS without state props (FR-009). The
normalization helper is tiny, pure and exhaustively unit-tested — the
mutation-gap compensating control (plan.md Art. III), same role as 003's
`normalizeKiInputType`.

**Alternatives considered**: trusting Stencil's boolean coercion — breaks
FR-001 for the literal string `"false"`, which native semantics render
on; rejected.

## D3 — Reset default: snapshot at form association, immutable afterwards

**Decision**: `formAssociatedCallback(form)` captures
`resetChecked = host.hasAttribute('checked')` once per association;
`formResetCallback()` restores `checked = resetChecked` (and re-runs
`setFormValue`). User toggles and programmatic `checked` mutations
reflect to the attribute but NEVER touch the snapshot; it is re-captured
only when the element is associated with a form again (moved/re-inserted
— the callback fires again and reads the then-current attribute).

**Rationale**: FR-005 spells this model out and the spec's Assumptions
declare the deliberate deviation from native `defaultChecked`: because
`checked` reflects live state (D2), the attribute cannot double as the
reset default the way 003 D2's non-reflected `value` attribute could
(ki-input reads the live attribute at reset time; ki-switch cannot — the
attribute mutates with every toggle). The snapshot is the same model the
006 sibling spec fixed for ki-checkbox ("the reset baseline is the
checked state captured when the control becomes form-associated"), so the
two toggle controls behave identically (S12: loaded on → toggled off →
reset → on; S21: loaded off → turned on → reset → off).

**Alternatives considered**: (a) reading the attribute in
`formResetCallback` (003 D2) — the attribute reflects live state here, so
reset would be a no-op; rejected. (b) a non-reflected `checked` — CSS
could not select the state matrix without a state prop, violating the
charter reflection rule and FR-009; rejected.

## D4 — Events: native `input` passes through, `change` re-dispatched composed

**Decision**: 003 D5 verbatim, applied to the toggle. The internal
checkbox's user toggle fires native `input` (composed — crosses the
boundary retargeted to the host; nothing to do) then native `change`
(not composed — dies at the shadow root), so the component listens to the
internal `change` and re-dispatches
`new Event('change', { bubbles: true, composed: true })` from the host.
No `ki-*` events, no `detail` payload — observers read `checked` off the
element (FR-002). The native `click` already crosses the boundary and is
never re-emitted.

**Rationale**: FR-002 verbatim; because the re-dispatch is wired only to
the internal user-driven `change`, programmatic mutations are silent by
construction (D2) and one toggle yields exactly one `input` + one
`change` (S1) — including label-activated toggles, where the label
machinery clicks the input exactly once (S17).

**Alternatives considered**: (a) `ki-change` — charter forbids prefixed
re-emission; rejected. (b) re-dispatching `input` too — already composed,
would double-fire; rejected (003 D5 precedent).

## D5 — Form participation: ElementInternals, value only while on

**Decision**: `formAssociated: true` + `@AttachInternals()` (002
pattern). On every `checked`/`value` change:
`internals.setFormValue(checked ? (value ?? 'on') : null)` — `null`
removes the entry so an off switch contributes nothing (S11); an on
switch submits `name` with `value` defaulting to `"on"` (S10) or the
custom `value` attribute (S18). The submitted-value rule lives in a pure
helper (`resolveSubmittedValue(checked, value)`) in `ki-switch.form.ts`.
`formDisabledCallback(disabled)` records `formDisabled`; effective
disabled = `disabled || formDisabled`, propagated to the internal input
(S13). `formResetCallback` per D3 (S12, S21). No `setValidity` wiring: a
switch always holds a valid binary state and v1 has no `required` (spec
assumption), so validity stays permanently valid. No Enter/implicit
submission forwarding: implicit submission belongs to text-entry
controls; a native checkbox does not submit on Enter, and 003 D4's
keydown forward exists only for that text-field behavior — nothing to
port (native parity, Art. VII).

**Rationale**: FR-005 verbatim with the least machinery: `setFormValue`
with `null` reproduces the native checkbox's absent-when-unchecked
contract exactly (SC-006), and the FACE machinery already excludes a
disabled host from form data.

**Alternatives considered**: (a) always submitting and filtering
server-side — breaks native parity (S11); rejected. (b) porting 003's
`requestSubmit` keydown — adds unapproved behavior; rejected.

## D6 — Track and thumb: logical inset travel, reduced-motion suppression

**Decision**: the `track` span is sized by
`--ki-switch-track-width`/`--ki-switch-track-height` (consumed through
logical `inline-size`/`block-size`); the `thumb` is absolutely positioned
with `inset-inline-start`: off = `--ki-switch-thumb-inset`, on =
`calc(100% - thumb-size - thumb-inset)` (values via the `--_ki-switch-*`
indirection, switched on `:host([checked])`). Because the offset is a
logical inset, RTL mirrors the travel with zero extra code — the on-state
thumb rests at the track's inline end (S16, FR-012). The travel
transition (`transition: inset-inline-start …`) is declared ONLY inside
`@media (prefers-reduced-motion: no-preference)`, so a reduced-motion
preference suppresses the animation while the state change stays
instantaneous (S19, FR-011). Transition duration/easing are component-CSS
implementation details, not tokens, in v1. To make S19 testable, the
browser-test config gains an `emulateReducedMotion` command
(`page.emulateMedia({ reducedMotion })`), mirroring the existing
`emulateColorScheme` command in
`packages/elements/vitest.browser.config.ts`.

**Rationale**: logical properties only (Art. IV; the stylelint
`csstools/use-logical` rule enforces it); the spec has an explicit
reduced-motion scenario (S19) so the suppression is contract, not polish.
Motion tokens are not in the spec's declared token surface, no
`ki.motion.*` semantic family exists in 001, and FR-008's enumerated
visual surface (colors, metrics, radius, gap, focus ring, state styling)
does not include durations — the 006 sibling states the same position
("the animation itself is an implementation detail; the reduced-motion
contract is the spec-level behavior"). Art. VII: additive motion tokens
can arrive later if a theme needs to restyle motion.

**Alternatives considered**: (a) `transform: translateX()` travel —
physical axis, needs `dir()`-conditional code for RTL; rejected.
(b) `--ki-switch-motion-*` tokens — speculative surface beyond the
declared contract; rejected for v1.

## D7 — Component token layer: state matrix per checkedness, single geometry

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `switch.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars values by inheritance):
  - structure, single scale — no size axis (spec): `track-width`,
    `track-height`, `thumb-size`, `thumb-inset`, `gap` (control↔label),
    `track-radius`, `thumb-radius`, `border-width`, `min-target`
    (9 tokens) → geometry references `ki.space.*` / `ki.radius.*`
    (`min-target` ≥ 24 px, FR-013; `track-radius`/`thumb-radius`
    reference `ki.radius.round` by default).
  - color per checkedness × interaction state:
    `--ki-switch-{unchecked|checked}-{rest|hover|active|disabled}-{track|thumb|border}`
    (2 × 4 × 3 = 24 tokens), referencing `ki.surface.*`, `ki.text.*`,
    `ki.outline.*` (unchecked family from neutral surfaces/outlines,
    checked family from the primary emphasis ramp; disabled cells from
    `ki.surface.disabled-*`). Naming follows the spec's Constitutional
    Surface verbatim (`{checked|unchecked}`, not on/off).
  - focus ring: `--ki-switch-focus-ring-{color|width|offset}` (3 tokens),
    002 convention.
- `switch.material3.tokens.json` — material3 overrides for the same
  names (M3 selected track = primary / handle = on-primary, unselected
  track = high surface with visible outline border, checked border
  transparent), compiled exactly like `button.material3.tokens.json`.

Total = 36 tokens per theme. Wiring: append both files to `LAYERS` /
`MATERIAL3_LAYERS` in `packages/tokens/style-dictionary.config.mjs`.
Component CSS consumes them exclusively through the private indirection
layer `--_ki-switch-*` set on `:host` and swapped per CSS state — the 002
pattern (base = unchecked/rest; overridden under `:host([checked])`,
`:hover`, `:active`, disabled).

**Rationale**: the spec's token surface verbatim. No label typography
tokens: the label is slotted light DOM that inherits page typography —
same position as the 006 sibling's token surface (Art. VII; the `label`
part remains the restyling hook). No per-state thumb-size tokens: the M3
kit's switch metrics cell is explicitly UNVERIFIED in the spec (Figma
connector unavailable 2026-07-08; the M3 thumb grow-on-select morph is
therefore not a read source), so per the spec's honesty rule and Art. VII
the v1 geometry is a single `thumb-size`; if M3 frame verification later
demands the morph, `--ki-switch-checked-thumb-size` arrives additively,
defaulting by reference to the base — the exact base+override-by-reference
pattern 003 D8 used for per-side border widths.

**Alternatives considered**: (a) component CSS referencing semantic
tokens directly — themes could not remap track/thumb inks without
touching component CSS (002 D4's rejected failure mode); rejected.
(b) per-state geometry now — unverified design source, speculative;
rejected (additive later).

## D8 — Contrast gate: extend the component sweep to `--ki-switch-*`

**Decision**: extend
`packages/tokens/scripts/check-contrast.mjs` — whose own comment mandates
per-component extension ("every new component matrix must extend it, or
this gate silently ignores that component") — with a switch pattern:

- pairs derived per theme × scheme from
  `^--ki-switch-(?:unchecked|checked)-(?:rest|hover|active)-track$`,
  pairing each `…-thumb` over its `…-track` (disabled cells exempt, as in
  the button sweep);
- a per-pair minimum ratio: the thumb/track boundary is a NON-TEXT state
  indicator, so these pairs check WCAG 1.4.11 (≥ 3:1) rather than 1.4.3's
  4.5:1 — pairs gain an optional `min` (default 4.5 for the existing text
  pairs; 3.0 for the switch pairs), and the zero-match guard is applied
  per pattern so name drift in either family fails loudly;
- unit cases added to `scripts/check-contrast.test.mjs`.

**Rationale**: Art. X — a finding a rule could produce must become a
rule, never review; the sweep exists precisely because the 002
clean-context review found dark-scheme failures the hardcoded pairs
missed. Reusing MIN_RATIO 4.5 for a non-text boundary would impose a
requirement WCAG does not make (M3's unselected outline-on-surface
handle legitimately sits between 3:1 and 4.5:1) — the per-pair minimum
keeps the gate honest instead of loose.

**Alternatives considered**: (a) not extending the sweep — the gate
silently ignores ki-switch (explicitly forbidden by the script's
contract); rejected. (b) sweeping at 4.5:1 — stricter than WCAG 1.4.11
with no constitutional basis, would force artificial ink choices;
rejected.

## D9 — Tests and traceability

**Decision**: both test surfaces marked `// @spec:008-ki-switch`, S-IDs
on code lines (test titles):

- `ki-switch.spec.tsx` (mock-doc, fast): S4 (`checked="maybe"` renders on
  and stays operable), anatomy/parts assertions (`track`, `thumb`,
  `label`, default slot, `role="switch"` on the internal input, no part
  on it — the contract exposes three parts only), plus exhaustive unit
  cases for the pure helpers `checkedFromMarkup` (presence semantics
  including the `"false"` string, D2) and `resolveSubmittedValue`
  (on/off × default/custom value, D5) — the mutation-gap compensating
  control.
- `ki-switch.browser.spec.ts` (real browser, built output +
  `@kimen/tokens/css`, 002/003 pattern): S1/S2 pointer toggles with
  exactly one `input` + one `change` per toggle, S3 disabled inertness,
  S17 slotted-label activation; S5 Tab reach + visible focus, S6 Space
  toggle, S20 Tab skips disabled; S7/S8/S9 accessibility tree (switch
  role, name from slot, on/off state updates, unavailable when disabled)
  + axe zero violations across state × theme; S10–S13, S18, S21 real
  `<form>` (FormData on/off/custom value, reset both directions, disabled
  fieldset); S14 material3 re-theme, S16 RTL thumb-at-inline-end, S19
  reduced motion via the new `emulateReducedMotion` command (D6).
- `ki-switch.dark.browser.spec.ts`: S15 forced dark under onmars — the
  002/003 dark-instance split (the vitest config routes
  `*.dark.browser.spec.ts` to the dark-emulating browser instance).

**Rationale**: the traceability gate requires S-IDs on code lines of
marked files; the browser suite asserts what ships
(`dist/components/ki-switch.js`); mock-doc covers fast logic branches.
RED first per Art. III. All 21 approved scenarios (S1–S21) map to test
tasks (tasks.md Notes carries the full map).

## D10 — Accessibility specifics

**Decision**: focus indication drawn on the track via
`input:focus-visible + [part='track']` (shadow-internal sibling selector)
using `--ki-switch-focus-ring-*` tokens — `:focus-visible` keeps
pointer-toggle focus ringless, native parity, and the ring must survive
both themes (S5); pointer target kept ≥ 24×24 px by `min-block-size`
/`min-inline-size` from `--ki-switch-min-target` on the interactive area
(the whole label surface is clickable, FR-013); disabled exposure is
native input semantics — no `aria-disabled` wiring (S9); the single ARIA
attribute in the component is `role="switch"` (D1); NO manual APG
walkthrough — the batch charter scopes walkthroughs to dialog, tooltip,
tabs and select's listbox, and the spec's Constitutional Surface says the
switch is a single-key toggle over the 002 focus/disabled machinery; axe
runs across the checked × disabled × theme × scheme matrix, not on one
instance.

**Rationale**: Art. V floor-vs-proof — axe is the floor; for a
native-control composition the proof is native semantics preserved end to
end (name from the slotted label, switch state in the accessibility tree,
S7/S8/S9 pinned deterministically).
