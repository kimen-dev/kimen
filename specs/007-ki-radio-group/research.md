# Phase 0 Research: ki-radio-group

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 documents only the standalone radio button; MarsUI verified
2026-07-08 — no radio frame exists, onmars styles from the 001 token
vocabulary), the WAI-ARIA APG Radio Group pattern (read with the pattern in
hand for D1/D6), the HTML spec's radio button group definition (grouping by
tree + form owner + `name`), the 001 token architecture, the 002 ki-button
implementation (ElementInternals pattern, `--_ki-*` CSS indirection), the
003 ki-input plan set and the 006 ki-checkbox / 008 ki-switch plan sets —
the sibling form controls planned under the same charter, whose applicable
decisions are CITED and reused rather than re-derived (Art. VII).

Shared decisions inherited from the siblings (cited, not re-derived):

- **Native input hidden inside a shadow `<label>`**, slotted default-slot
  text as accessible name AND activation surface — 006 D1 (adopted for the
  option anatomy in D1 below).
- **Boolean presence normalization** against Stencil's `"false"` coercion
  via a tiny pure helper — 006 D2 / 008 D2 (applied to `disabled` and
  `required` here; there is no `checked` prop on either element, D4).
- **Reset baseline snapshotted in `formAssociatedCallback`** — 006 D2 /
  008 D3 (applied to the group's selection in D7).
- **Composed `input` passes through; `change` re-dispatched composed from
  the form-associated host** — 003 D5 / 006 D6 / 008 D4 (applied in D5;
  here the form-associated host is the GROUP).
- **`--_ki-*` private CSS indirection over component tokens** — 002 pattern
  (D8).
- **Per-component contrast-sweep extension with a per-pair minimum ratio
  (3:1 for non-text state indicators, WCAG 1.4.11)** — 008 D8 (D8 below).

## D1 — Composite base: one native `<input type="radio">` per option, coordinated by the group; full-ARIA `role="radio"` rejected

**Decision**: `ki-radio` renders the 006 D1 anatomy adapted to a radio:

```html
<label>
  <input type="radio" … />                      <!-- visually hidden, UNNAMED, the real control -->
  <span part="control" aria-hidden="true"></span>  <!-- token-styled ring; inner dot = ::before -->
  <span part="label"><slot /></span>            <!-- slotted option label -->
</label>
```

with `shadow: { delegatesFocus: true }`. The internal input carries NO
`name`. `ki-radio-group` renders:

```html
<span part="label" id="group-label">{label}</span>
<div role="radiogroup" aria-labelledby="group-label"
     aria-required={…} aria-invalid={…} aria-disabled={…}>
  <slot />                                       <!-- ki-radio children -->
</div>
```

and owns everything the platform cannot provide across shadow boundaries:
mutual exclusivity, the roving tabindex, arrow-key navigation and form
participation (D4–D7).

**The constraint that frames the choice**: the HTML radio button group is
scoped by tree + form owner + `name`. Each `ki-radio`'s internal input
lives in its OWN shadow tree, so native inputs cannot share a name across
shadow roots — native exclusivity, native arrow navigation and the native
single-tab-stop behavior are unavailable in ANY architecture that gives
each option a shadow root (which FR-001/FR-012 require: slotted label,
`control`/`label` parts per option). The group-level coordination cost —
exclusivity, roving, arrows — is therefore FIXED and identical for every
candidate base. What the base decides is who provides the per-option
machinery: role and checked/disabled exposure, pointer/label activation,
Space, focus behavior.

**Why the native input wins (APG in hand)**: the APG Radio Group pattern
requires — Tab lands on the checked radio or the first radio when none is
checked; arrows move focus with wrap and (recommended, absent expensive
side effects) check the focused radio; Space checks a focused unchecked
radio; each option exposes `radio` role with its checked state inside a
`radiogroup` with an accessible name. With the native input base, every
per-option requirement is platform behavior with ZERO option-level ARIA:

- role `radio`, checked, disabled exposure — native input semantics (S10,
  S11), no `aria-checked` to keep in sync;
- pointer activation, label activation (slotted text via the shadow
  `<label>`), Space-checks-unchecked (S8) — native activation, with native
  `input`/`change` ordering, no synthesis (006 D1's exact rationale);
- focusability, `:focus-visible` heuristics, disabled-means-unfocusable
  (FR-006) — native.

The full-ARIA base (`role="radio"` + `aria-checked` on a styled element,
the Shoelace/FAST model) re-implements ALL of that by hand — activation
handlers, key handling for Space, `aria-checked`/`aria-disabled` sync — on
top of the SAME group-level coordination, i.e. strictly more hand-rolled
code for the same observable contract. Art. IV (semantic HTML first) and
Art. VII (least code satisfying the approved scenarios) decide it; 002 D1
set the precedent when it rejected `role="button"` re-wiring.

**Two consequences the decision must own honestly**:

1. The internal inputs stay UNNAMED deliberately: an unnamed radio is a
   radio group of one, so the browser's own arrow-key group navigation
   never fires (arrows in a one-radio group move nothing) and cannot fight
   the group's roving implementation (D6). A shared name would invite the
   platform to move focus inside ONE shadow root only — worse than no help.
2. AT set computation (`posinset`/`setsize`, the "2 of 3" announcement) is
   derived by browsers from the radio GROUP for native radios — and each
   internal input is a group of one. The flattened accessibility tree does
   place all three radios inside the `role="radiogroup"` container, from
   which ATs are expected to compute the set, but this is exactly the kind
   of cross-shadow claim that must be VERIFIED, not assumed: the spec
   already mandates the manual APG walkthrough (first roving-tabindex
   composite in the repo — constitutional surface, Art. V), and the
   walkthrough explicitly checks the announced position-in-set (D10). If a
   target browser/AT pair mis-announces, the declared contingency is
   group-managed `aria-posinset`/`aria-setsize` on the internal inputs —
   an additive attribute the group already has the roster to compute, not
   an architecture change.

**Alternatives considered**: (a) full ARIA `role="radio"` per option —
re-implements activation, state exposure and naming that the input gives
free; rejected (above). (b) A single shadow root in the group rendering
all options itself (options passed as data) — no per-option slot or parts,
violating FR-001/FR-012; rejected. (c) Light-DOM native inputs sharing a
real `name` (no shadow root on ki-radio) — native grouping would work, but
each input would associate with the OUTER form and submit its own entry,
contradicting FR-007 (the GROUP is the single form control), and the
option loses parts/token encapsulation; rejected. (d) `elementInternals`
with `role="radio"` on the ki-radio host — same hand-rolled activation
and state sync as (a) plus FACE machinery the option must not have (the
option is not a form control); rejected.

## D2 — Group semantics and label: shadow `role="radiogroup"` wrapper named by the rendered visible label

**Decision**: the group renders its `label` prop as visible text
(`part="label"`, 003 D1's visible-label precedent — `label` is
a11y-required and the only accessible-name source) and wraps the default
slot in a shadow `<div role="radiogroup" aria-labelledby="group-label">`.
Because the accessibility tree flattens slots, the slotted `ki-radio`
hosts — and through them each option's native radio — sit INSIDE the
radiogroup container (S10). `aria-required` (S22), `aria-invalid` (S23)
and `aria-disabled` (S19) are set on the same wrapper, synced from
`required`, the validity/`invalid`-event machinery (D7) and the effective
disabled state respectively. No ARIA is hand-managed at option level (D1).

**Rationale**: `role="radiogroup"` on an internal wrapper (rather than on
the host via `ElementInternals.role`) keeps the semantics next to the slot
they scope, works with plain inspectable attributes, and mirrors 003's
anatomy where the role lives on the internal element, not the host. The
visible label satisfies FR-009's "accessible name comes from `label`" and
the spec assumption that every group is labeled; `aria-labelledby` to the
shadow span avoids duplicating the string into an `aria-label`.
`aria-required`/`aria-invalid` are supported states on `radiogroup` (ARIA
1.2); their exposure is pinned by S22/S23 and re-verified in the manual
walkthrough (D10).

**Alternatives considered**: (a) `internals.role = 'radiogroup'` +
`internals.ariaLabel` — host-level role puts the slotted options inside
the radiogroup too, but duplicates the visible string into an aria-label
and hides semantics in internals where the browser-tests and walkthrough
cannot inspect markup; workable, not chosen. (b) `aria-label` with no
visible text — violates the visible-label decision the spec inherits from
003; rejected. (c) `<fieldset>`/`<legend>` — a fieldset inside the shadow
root does not group the SLOTTED light-DOM radios for AT any better than
the radiogroup role, and adds default rendering to fight; rejected.

## D3 — Option discovery and reconciliation: slotchange roster + attribute observation, no subtree observer

**Decision**: the group derives its roster from the default slot's
`slotchange` event: `assignedElements()` filtered to `ki-radio` elements,
in document order (options are documented as slotted children of the
group). A single `MutationObserver` watches the roster elements'
`disabled` attribute (the one state change that must re-run coordination
without a slot change — FR-006/S24; `disabled` is reflected on ki-radio,
so property writes surface as attribute mutations). Reconciliation rules
(spec edge cases, all silent — no `input`/`change`, FR-003):

- roster change with an existing identity-tracked selection: the selection
  survives if its option is still assigned; if the selected option left
  the document, selection clears (value → `""`, form value → `null`,
  validity recomputed);
- roster change with NO selection and a non-empty `value`: selection
  re-derives from the value (first match wins — an inserted matching
  option becomes selected);
- any reconciliation recomputes the roving tab stop (D6) and the form
  value/validity (D7).

**Rationale**: `slotchange` is the platform's own notification for exactly
the mutations the approved scenarios and edge cases describe (options
inserted/removed as group children); a subtree-wide MutationObserver would
support arbitrarily nested wrappers no scenario exercises — speculative
generality, rejected per Art. VII. The disabled-attribute observer is the
minimal addition that makes S24/FR-006 (selected option becomes disabled)
deterministic without polling and without a new internal event surface.

**Alternatives considered**: (a) full subtree MutationObserver — supports
un-approved nesting at real complexity cost; rejected. (b) ki-radio
dispatching an internal "state-changed" event from its `disabled` watcher
— adds an observable, undocumented event to the composite's surface;
the attribute observer achieves the same determinism with zero new
surface; rejected.

## D4 — Selection model: identity-tracked at the group; `value` is a projection; state pushed to options through the composite-internal input access

**Decision**: the group's single source of truth is `selectedRadio` — a
reference to the selected `ki-radio` (identity, not value: the spec's
duplicate-values edge case demands it). `@Prop({ mutable: true }) value`
is a PROJECTION: reading it returns the selected option's value (option
`value` defaults to `"on"`, native parity) or `""` when none is selected;
assigning it programmatically selects the FIRST option whose value
matches, or none (FR-002, S4), silently. The attribute is the initial
declaration and is NOT reflected back (the group's value drives no CSS;
003 D2's model, minus dirty-value tracking, which the snapshot in D7
replaces). `ki-radio` has NO public `checked`/`selected` member of any
kind (FR-002: selected state is never authored on an option): the group
pushes checkedness, tab stops and focus onto each option's internal
native input directly through the option's open shadow root
(`radio.shadowRoot.querySelector('input')`, cached per roster entry after
`customElements.whenDefined`/component readiness).

Option-internal CSS selects the selected presentation on `input:checked`
(sibling selector to `[part='control']`) — no host attribute, no custom
state needed for the component's own styling; themes restyle through
tokens (D8).

**Rationale**: identity tracking is the only model that satisfies both
duplicate-value rules at once (user selection reflects the exact option
chosen; programmatic assignment is first-match). The open-shadow access
is deliberate intra-composite coupling, not public API: the two tags are
one feature, ship and version together in `@kimen/elements`, and the
group is the only consumer. The alternatives all leak the coordination
into the PUBLIC surface the spec froze: a `checked` prop/attribute on
ki-radio violates FR-002 verbatim; a Stencil `@Method` lands in
`docs.json`/`components.d.ts` and becomes API an agent can see and call
(Art. I/IX — worse than an implementation detail, it is a documented
invitation to author selection). Stencil shadow roots are open by
default, and the group already holds the roster references (D3).

**Alternatives considered**: (a) public reflected `checked` on ki-radio
(the native-parity instinct) — FR-002 forbids authored selection;
rejected. (b) internal `@Method`/prop pair documented "do not use" —
still public surface (Art. IX), still visible to agents (Art. I);
rejected. (c) options PULLING state (each radio observes the group and
computes `checked = group.selected === this`) — inverts one push into N
subscriptions plus lifecycle races, for the same coupling; rejected.

## D5 — Events: native composed `input` bubbles through; `change` re-dispatched composed from the GROUP (the form-associated host); group listens in capture phase

**Decision**: the sibling event rule (003 D5, 006 D6, 008 D4) applied to
the composite. A user selection activates the option's native input; its
native `input` event is `composed: true`, crosses the option's shadow
boundary retargeted to the `ki-radio` host, and bubbles through the group
in the light DOM — nothing re-emitted. That same bubbling `input` IS the
option→group notification channel: the group listens for it on its host
in the CAPTURE phase, so it updates `selectedRadio`, unchecks the previous
option's input, recomputes the projection/`setFormValue`/tab stop BEFORE
any application listener registered on the group (bubble phase) observes
the event — the new value is readable from the group when `input` is
observed (FR-003). The native `change` is not composed and dies inside the
option's shadow root; the group re-dispatches
`new Event('change', { bubbles: true, composed: true })` from its own host
after its state is current. The re-dispatch is wired only to the
user-driven path, so programmatic `value` assignment and reconciliation
(D3) are silent by construction — no suppression flags (003 D5's
rationale). Clicking the already-selected option fires nothing (no native
state change), giving S1's exactly-one-change-per-selection for free.

**Rationale**: FR-003 verbatim with the sibling convergence intact: the
composed `change` re-dispatch happens at the form-associated host — for
006/008 that was the component itself; here the form control is the
GROUP, so the group is the dispatcher, and forms/apps observe one field
(US3's framing). Ordering (input before change) is preserved by
construction: the input event has already crossed and been handled when
the group dispatches change.

**Alternatives considered**: (a) `ki-*` events — charter forbids;
rejected. (b) re-dispatching `input` from the group too — the native one
is already composed and bubbling; a second copy double-fires (003 D5);
rejected. (c) ki-radio re-dispatching `change` from itself (the literal
006/008 mechanism) — the option is not the form control; observers of the
FIELD would see changes target a child element while the value lives on
the group; dispatching from the group keeps event target and value on the
same element; rejected.

## D6 — Keyboard model: group-owned roving tabindex; arrows wrap, skip disabled, follow writing direction; selection follows focus via native `click()`

**Decision**: the group owns the whole APG keyboard contract:

- **Roving tab stop** (FR-004): exactly one internal input has
  `tabindex="0"` — the selected option's (S5), or the first ENABLED
  option's when none is selected (S25); all others get `tabindex="-1"`.
  Recomputed on every selection change, reconciliation (D3) and
  disabled-state change; when every option is disabled the group has no
  tab stop at all (S20, all-disabled edge). Entering the group never
  selects (S25 — Tab is not activation); leaving is a single Tab because
  only one input is tabbable (S9).
- **Arrow navigation** (FR-005): one `keydown` listener on the group host
  (keyboard events are composed and bubble from the options through the
  light DOM). ArrowDown/ArrowUp = next/previous ALWAYS; ArrowRight/
  ArrowLeft map to next/previous in LTR and previous/next in RTL,
  resolved per event via `host.matches(':dir(rtl)')` (S21, native-radio
  parity). Target = adjacent ENABLED option with wraparound at both ends
  (S6, S7); a single-option group wraps onto itself. The handler calls
  `event.preventDefault()` (no page scroll) and then
  `input.focus(); input.click();` on the target.
- **Selection follows focus** via the native `click()`: clicking an
  unchecked radio input checks it and fires native `input` then `change`
  — so the arrow path re-enters the exact same pipeline as pointer and
  Space activation (D5), one code path for every modality, native event
  order, no synthesis. Space on a focused unselected option is the native
  input's own activation (S8) — no handler.
- The pure core — `nextEnabledIndex(roster, from, direction)` with wrap
  and disabled skipping, and the arrow→direction mapping table (key ×
  writing direction) — lives in `ki-radio-group.keyboard.ts` as small
  pure functions, exhaustively unit-tested (the mutation-gap compensating
  control, same role as 006's `checkboxFormValue`).

**Rationale**: this is the APG Radio Group keyboard contract transcribed,
which the spec approved scenario by scenario (S5–S9, S20, S21, S25); the
spec's Assumptions already resolved selection-follows-focus in APG's
favor (no expensive side effects). `click()` over manual
`checked = true` + synthesized events keeps native parity honest: the
group never fabricates an `input` event it did not receive.

**Alternatives considered**: (a) manual `checked` write + hand-dispatched
`input`/`change` on arrows — a second, synthetic event path to keep
consistent with the pointer path; rejected. (b) Home/End keys — in APG
but in no approved scenario (Art. II); additive later; rejected for v1.
(c) per-option keydown handlers — N listeners for one behavior; the
composed bubbling makes the group host the natural single listener;
rejected.

## D7 — Form participation: ElementInternals on the group only; native-sourced `valueMissing`; value snapshot at association

**Decision**: `ki-radio-group` is the only form-associated element
(`formAssociated: true` + `@AttachInternals()`, 002 pattern). `ki-radio`
never touches FACE.

- **Form value**: on every selection/value change,
  `internals.setFormValue(radioGroupFormValue(selectedRadio))` — a pure
  function returning `null` when nothing is selected OR the selected
  option is disabled (S24, native parity: disabled controls never
  submit), else the selected option's value (`value ?? 'on'`). `null`
  removes the entry entirely — an unselected group submits nothing, never
  an empty string (S12, spec edge case). Host/fieldset disabling is
  handled by the FACE machinery + `formDisabledCallback` (S15, S19 —
  effective disabled = `disabled || formDisabled`, propagated to every
  option's internal input, 006 D4's free ride).
- **Constraint validation** (S13, S22, S23): the group-level constraint
  (`valueMissing` when `required` and no selection) cannot be mirrored
  from ONE native input the way 003 D3/006 D5 did — no single internal
  input carries the group's constraint. But the localized message MUST
  come from the platform (spec assumption: no hardcoded user-visible
  strings, Art. IV). Mechanism: the group forwards
  `required && !hasSelection` as the `required` property of every
  option's internal input. An unnamed, unchecked, required radio is
  `valueMissing` by itself, so while the group is required and
  unselected, the first enabled option's input holds exactly the right
  ValidityState AND the platform's localized radio message ("select one
  of these options"); the group mirrors it:
  `internals.setValidity(sourceInput.validity,
  sourceInput.validationMessage, tabStopInput)` — the third argument
  anchors `reportValidity()` focus on the roving tab stop. The moment a
  selection exists, the forwarded `required` clears and the group sets
  validity valid — a selection preserved on a disabled option therefore
  still satisfies `required` (S24, FR-007) while submitting nothing
  (form value rule above). Side benefit: the internal inputs expose the
  required state natively while the constraint is active, reinforcing
  S22's `aria-required` on the radiogroup wrapper (D2). An EMPTY required
  group (no options) sets no validity — invalid usage, no approved
  scenario, documented.
- **Invalid exposure** (S23): on the host's `invalid` event (fired by the
  FACE machinery when a submission is blocked), the group sets
  `aria-invalid="true"` on the radiogroup wrapper; cleared when validity
  turns valid (a selection is made) or on form reset. This is 003 D7's
  trigger machinery with `aria-invalid` as the sink — deliberately NO
  `:state(user-invalid)` custom state and NO invalid ink tokens in v1:
  S23 pins assistive-tech exposure only; no approved scenario observes an
  invalid VISUAL treatment, and the spec's token surface (constitutional
  surface, FR-010) lists no invalid family. Both are additive later
  (Art. VII/IX) — a deliberate, declared narrowing versus 006 (whose
  spec DID approve an invalid appearance).
- **Reset** (S14): `formAssociatedCallback` snapshots the group's `value`
  projection once per association (the sibling convergence — 006 D2 /
  008 D3); `formResetCallback` re-derives the selection from the snapshot
  through the same first-match routine as programmatic assignment
  (FR-002's own rule makes value-snapshot semantics exact for every
  approved scenario; the duplicate-value reset-to-second-twin case is
  unobservable in the approved set), silently.

**Rationale**: FR-007 verbatim with every string platform-sourced and
every exclusion (disabled option, disabled group, disabled fieldset)
delegated to native machinery or the FACE spec. The forwarded-required
mechanism is the smallest construction that yields a REAL native
ValidityState + localized message for a group-level constraint.

**Alternatives considered**: (a) hand-written
`setValidity({ valueMissing: true }, 'Please select…')` — hardcodes a
user-visible string (Art. IV) and skips platform localization; rejected.
(b) a hidden "validity donor" `<input type="radio" required>` in the
GROUP's shadow root — an extra focus/AT hazard element to hide, when the
options already contain real radio inputs; rejected. (c) `required`
forwarded unconditionally (even with a selection) — every UNCHECKED
sibling input would stay individually `valueMissing`, forcing the group
to filter which input it mirrors; the conditional forward keeps the
mirror unconditional; rejected.

## D8 — Component token layer: `--ki-radio-*` matrix + `--ki-radio-group-*` structure; contrast sweep extended with 3:1 non-text pairs

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `radio.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars by inheritance):
  - structure (9): `control-size`, `dot-size`, `min-target`, `gap`
    (control↔label), `control-radius` (referencing `ki.radius.round` —
    a theme may square it), `border-width`, `label-font-size`,
    `label-font-weight`, `label-line-height`;
  - selection × interaction ink matrix (24):
    `--ki-radio-{unselected|selected}-{rest|hover|active|disabled}-{bg|fg|border}`
    — `fg` is the inner-dot ink (rendered only when selected; the
    unselected column keeps the matrix uniform, 006 D8's rationale),
    `border` the ring, `bg` the control fill/backdrop;
  - focus ring (3): `--ki-radio-focus-ring-{color|width|offset}` —
    002/003/006 convention.
- `radio-group.tokens.json` — group structure (4):
  `--ki-radio-group-gap` (vertical stack spacing) and
  `--ki-radio-group-label-{font-size|font-weight|line-height}` (the
  visible group label, D2). Theme-neutral semantic references; no
  material3 override file — the group has no color surface of its own,
  and material3 inherits the structure through the base layer (a
  material3 file arrives additively if M3 group-label typography ever
  diverges).
- `radio.material3.tokens.json` — material3 overrides for the radio
  matrix names (M3 selected ring + dot = primary; unselected ring =
  on-surface/outline family; disabled cells from the disabled ramp). One
  convention this file must honor: **the `-bg` token names the effective
  backdrop the dot renders over** — M3's radio is unfilled, so its
  selected `-bg` cells reference the surface the control sits on rather
  than `transparent`, keeping the contrast sweep measurable (below).

Totals: 36 radio + 4 group = 40 tokens per theme. Wiring: append the
files to `LAYERS` / `MATERIAL3_LAYERS` in
`packages/tokens/style-dictionary.config.mjs`. Component CSS consumes
exclusively through `--_ki-radio-*` / `--_ki-radio-group-*` indirection
set on `:host` and swapped per state — base = unselected-rest, overridden
under `input:checked` (shadow-internal, D4), `:host(:hover)`,
`:host(:active)` and the effective-disabled state (002/003/006 pattern).

Contrast gate: extend `COMPONENT_BG_PATTERN` in
`packages/tokens/scripts/check-contrast.mjs` (its own comment mandates
per-component extension or the gate silently ignores the matrix) with
`/^--ki-radio-selected-(?:rest|hover|active)-bg$/u`, pairing each `-bg`
with its `-fg` dot ink at a **3:1 per-pair minimum** — the dot is a
NON-TEXT state indicator (WCAG 1.4.11), exactly the case 008 D8 solved
for thumb-on-track; this feature reuses 008's per-pair-minimum mechanism
if 008 has landed, and otherwise introduces it identically (batch
coordination note in tasks.md). The `unselected` column stays OUT of the
sweep (no dot rendered; the visible unselected ink is the ring, a 1.4.11
obligation met at the token layer by referencing the validated semantic
outline ramp — 006 D8's reasoning verbatim). Disabled cells exempt
(WCAG 1.4.3/1.4.11 exception, existing gate rule). Zero-match guard per
pattern; unit cases in `check-contrast.test.mjs`.

**Rationale**: the spec's constitutional surface fixes this exact
vocabulary (control geometry, control/label gap, label typography,
selected/unselected × rest/hover/active/disabled, focus ring, group gap
+ group-label typography; no size/tone axes — M3's radio is single-size,
MarsUI has no radio frame). The inner dot is pure CSS (`::before` on the
`control` span, inks via the indirection layer) — a circle needs no SVG,
so 006 D7's currentColor-SVG machinery is NOT inherited: less anatomy,
same token contract. No invalid ink family (D7's declared narrowing).

**Alternatives considered**: (a) one shared `--ki-selection-*` family
with 006 — themes must be free to style checkbox and radio independently
(the failure mode 003 D8/006 D8 rejected); rejected. (b) sweeping
selected pairs at 4.5:1 — stricter than WCAG 1.4.11 for a non-text
indicator with no constitutional basis (008 D8's argument); rejected.
(c) SVG dot — a circle is expressible as tokens + border-radius;
rejected (Art. VII).

## D9 — Tests and traceability

**Decision**: all test files marked `// @spec:007-ki-radio-group`, S-IDs
on code lines (test titles):

- `ki-radio.spec.tsx` + `ki-radio-group.spec.tsx` (mock-doc, fast,
  rendered together via `newSpecPage` with both components): anatomy
  assertions (option: shadow label wrapping an UNNAMED hidden
  `input[type=radio]`, `control`/`label` parts, `aria-hidden` control,
  no public checked member; group: visible `part="label"`,
  `role="radiogroup"` wrapper with `aria-labelledby`, default slot);
  exhaustive unit cases for the pure helpers — `nextEnabledIndex` (wrap,
  disabled runs, single-option, all-disabled), the arrow→direction map
  (4 keys × LTR/RTL), `radioGroupFormValue` (none/selected/selected-
  disabled × value present/absent), the boolean presence normalizer —
  the mutation-gap compensating control.
- `ki-radio-group.browser.spec.ts` (real browser, built output +
  `@kimen/tokens/css`, 002/003 pattern): S1–S4, S19 core selection with
  real pointer events (event order input-before-change, exactly one
  change per selection, value projection); S5–S9, S20, S21, S25 keyboard
  (real Tab/arrows/Space, RTL document for S21); S10, S11, S22, S23
  accessibility tree (radiogroup named, selected radio named, disabled
  unavailable, required, invalid-after-blocked-submission) + axe zero
  violations across selection × disabled × required/invalid states;
  S12–S15, S24 real `<form>` (FormData, blocked submission, reset,
  fieldset, disabled-selected withholding); S16, S18 theming + RTL
  layout.
- `ki-radio-group.dark.browser.spec.ts`: S17 forced dark under onmars
  (the 002/003 dark-instance split — vitest config already routes
  `*.dark.browser.spec.ts` to the dark-emulating instance).

The generator scaffolds a `ki-radio.browser.spec.ts` too; the composite
scenarios need both tags on one page, so that file carries the
option-anatomy browser assertions (parts exposed, ≥24 px target,
FR-011) and defers every S-ID scenario to the group suite — recorded in
its header comment so traceability stays honest.

**Rationale**: the traceability gate requires S-IDs on code lines of
marked files; the browser suite asserts what ships
(`dist/components/ki-radio-group.js` + `dist/components/ki-radio.js`);
mock-doc covers the pure navigation/form logic branches. RED first per
Art. III. All 25 approved scenarios (S1–S25) map to test tasks (tasks.md
Notes carries the full map).

## D10 — Accessibility specifics and the mandatory APG walkthrough

**Decision**: focus indication on the option's control via
`input:focus-visible ~ [part='control']` using
`--ki-radio-focus-ring-*` tokens (006 D10's selector pattern and its
`:focus-visible`-over-`:focus-within` justification apply verbatim — a
radio, like a checkbox, does not show a native ring on pointer
activation); pointer target ≥ 24×24 px per option by sizing the hidden
input overlay to `max(--ki-radio-control-size, --ki-radio-min-target)`
(FR-011); disabled exposure native per option, `aria-disabled` +
disabled internal inputs for the group (S19, S20); reduced motion:
every selection-state transition lives inside
`@media (prefers-reduced-motion: no-preference)` (FR-014 — edge-case
contract, no S-ID: no dedicated browser test, style-level rule only).

**Manual APG walkthrough: REQUIRED** — this is the repo's first
roving-tabindex composite and the spec's constitutional surface flags it
as a new interaction pattern (Art. V), unlike 006/008 which N/A'd it.
The walkthrough is a task (tasks.md Polish phase) executed against the
built Storybook/manual page and documented in the PR, covering, with the
APG Radio Group pattern in hand: Tab/Shift+Tab entry and exit points
(selected vs first-enabled vs skip-when-all-disabled), all four arrows
with wrap and disabled skipping in LTR AND RTL, Space on unselected,
no-selection-on-entry (S25), AND the screen-reader outcomes automation
cannot fully pin: the announced role/name of group and options, the
selected/unselected announcements, and the **position-in-set
announcement** ("2 of 3") — the declared verification point for D1's
per-option-input architecture, with group-managed
`aria-posinset`/`aria-setsize` as the recorded contingency if a target
pair mis-announces. axe runs across selection × disabled ×
required/invalid × theme × scheme as the floor, never the proof
(Art. V).

**Rationale**: Art. V's floor-vs-proof language: for a composite that
re-creates a NATIVE grouping behavior across shadow boundaries, the
proof is the APG contract holding end to end on real assistive
technology, and the one genuinely novel claim (cross-shadow set
computation) is verified by a human, exactly as the spec mandates.
