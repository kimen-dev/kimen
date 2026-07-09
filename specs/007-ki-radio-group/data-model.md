# Phase 1 Data Model: ki-radio-group

No persistent data. The model is the composite's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/radio-group-contract.md](./contracts/radio-group-contract.md);
this file models values, defaults and transitions for BOTH elements.

## Attribute model — `ki-radio-group`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `name` | string | — | yes (host-level, FACE) | omitted → the group contributes no form entry |
| `value` | string | `""` (projection of "no selection") | **no** — the attribute is the initial declaration; the live property is a projection of the selection (FR-002; research D4) | a value matching no option leaves every option unselected and the group operable (S4, FR-008); with duplicates, programmatic assignment selects the FIRST match |
| `label` | string | — | yes | a11y-required: names the radiogroup (S10, FR-009); rendered as visible text (`part="label"`) |
| `required` | boolean | `false` | yes | presence semantics (normalized at load, 006 D2 helper pattern); no selection → `valueMissing`, blocked submission (S13, S22) |
| `disabled` | boolean | `false` | yes | presence semantics; every option inert and unfocusable, group exposed unavailable, no form entry (S19, S20) |

## Attribute model — `ki-radio`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `value` | string | `"on"` (effective — the prop may be unset; native-radio parity) | yes | the submission value the group projects when this option is selected (S1, S12) |
| `disabled` | boolean | `false` | **yes — the group's MutationObserver watches this attribute** (research D3) | presence semantics; not selectable, not focusable, exposed unavailable, skipped by arrows (S3, S7, S11) |

`ki-radio` has NO selected/checked member of any kind — selection is owned
by the group and never authored on an option (FR-002). Its selected
presentation renders from the internal native input's `:checked` state.

## Selection model (identity-tracked; value is a projection)

```text
                    reset baseline = group value projection captured at
                    formAssociatedCallback (research D7)
                             │
first render ────────────────┘  selection derived from the value attribute:
     │                          first option whose value matches, or none (S4)
     │
     ├─ user selects an option (pointer on control/label, Space when
     │  unselected, arrow navigation — all funnel through the option's
     │  native input activation, research D5/D6)
     │      → native input event (composed) crosses to the ki-radio host
     │        and bubbles through the group
     │      → group (capture phase): selectedRadio := option, previous
     │        input unchecked, value projection + setFormValue + validity
     │        + roving tab stop updated
     │      → group dispatches composed change from its host (S1)
     │        · exactly one change per selection change (S1, S2)
     │        · re-selecting the selected option: no native state change,
     │          no events
     │
     ├─ page assigns group.value
     │      → first matching option selected (or none), inputs synced,
     │        setFormValue, NO events (FR-002, FR-003)
     │
     ├─ reconciliation (slotchange / disabled mutation, research D3) —
     │  always silent:
     │      · selected option removed → selection cleared, value ""
     │      · no selection + value set + matching option inserted →
     │        selection re-derived (first match)
     │      · selected option disabled → selection and value PRESERVED,
     │        form entry withheld, tab stop (and focus, if there) moves
     │        to first enabled option (S24, FR-006)
     │
     └─ form reset → selection re-derived from the baseline value
                     (first-match routine), silent (S14)
```

Invariants:

- at most one option selected at any time; `group.value` always equals
  the selected option's value, or `""` (FR-002, SC-001);
- user selection is tracked by option IDENTITY (duplicate values: the
  exact option chosen stays selected); programmatic value assignment is
  first-match (spec edge case);
- events report user actions only: composed native `input` bubbles from
  the option through the group; composed `change` is re-dispatched from
  the group host after its state is current (research D5); programmatic
  assignment and reconciliation are silent by construction (FR-003).

## Internal state — `ki-radio-group`

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `roster` | `KiRadio[]` (document order) | default-slot `slotchange` → `assignedElements()` filtered to `ki-radio` (research D3) | selection, roving, arrow navigation, validity source |
| `selectedRadio` | element reference or `null` | user activation (via native `input` event), programmatic `value` assignment, reconciliation, reset | value projection, `setFormValue`, roving tab stop |
| `resetValue` | string | `formAssociatedCallback` (value projection at association — research D7) | `formResetCallback` (S14) |
| `formDisabled` | boolean | `formDisabledCallback` (`fieldset[disabled]` ancestry) | effective disabled = `disabled \|\| formDisabled` → every option's internal input, `aria-disabled` on wrapper, FACE exclusion (S15, S19, S20) |
| `userInvalid` | boolean (plain internal — no custom state in v1, research D7) | host `invalid` event (blocked submission, S23); cleared when valid or on reset | `aria-invalid` on the radiogroup wrapper |
| disabled observer | `MutationObserver` on roster `disabled` attributes | roster changes | S24/FR-006 reconciliation |

## Roving tabindex model (FR-004, research D6)

| Group state | Tab stop (`tabindex="0"` on that option's internal input; all others `-1`) |
|---|---|
| an option is selected and enabled | the selected option (S5) |
| an option is selected but disabled | the first enabled option (S24, FR-006) |
| no selection | the first enabled option — entering never selects (S25) |
| every option disabled, or group disabled | none — the group is skipped by Tab (S20, all-disabled edge) |

Arrow keys (group-level `keydown`, `preventDefault`): Down/Up = next/
previous always; Right/Left = next/previous in LTR, previous/next in RTL
(`host.matches(':dir(rtl)')`, S21); target = adjacent ENABLED option with
wrap at both ends (S6, S7; a single-option group wraps onto itself);
navigation executes `input.focus(); input.click()` — selection follows
focus through the native activation pipeline (one code path, native event
order). Space on a focused unselected option is native (S8). Home/End:
not in the approved contract (Art. II).

## State model (CSS states, never attributes/props for interaction — FR-010)

Inks swap via the `--_ki-radio-*` indirection (002 pattern):

| Axis | State | Selector (shadow-internal) | Token segment |
|---|---|---|---|
| selection | unselected | base | `unselected-*` |
| selection | selected | `input:checked ~ [part='control']` (research D4) | `selected-*` |
| interaction | rest | base | `-rest-` |
| interaction | hover | `:host(:hover)` | `-hover-` |
| interaction | active | `:host(:active)` | `-active-` |
| interaction | disabled | `:host([disabled])` / group effective-disabled | `-disabled-` |
| focus | focus-visible | `input:focus-visible ~ [part='control']` | `focus-ring-*` |

No invalid visual state in v1: S23 is assistive-tech exposure
(`aria-invalid` on the radiogroup wrapper), deliberately without a custom
state or invalid ink tokens (research D7 — additive later). Selection
transitions render only under
`@media (prefers-reduced-motion: no-preference)` (FR-014).

## Form participation model (ElementInternals on the group only, 002/003 pattern)

| Interaction | Mechanism | Outcome |
|---|---|---|
| submit, option selected & enabled | `setFormValue(selected.value ?? 'on')` under host `name` | `name=value` in FormData (S12) |
| submit, no selection | `setFormValue(null)` | no entry — never an empty string (spec edge case) |
| submit, selected option disabled | `setFormValue(null)`; selection still satisfies `required` | form submits, no entry (S24) |
| required, no selection | `required` forwarded to the options' internal inputs while unselected; the group mirrors `setValidity(input.validity, input.validationMessage, tabStopInput)` — platform-computed `valueMissing`, platform-localized message (research D7) | submission blocked, group reported invalid (S13); `aria-required` (S22), `aria-invalid` after the blocked attempt (S23) |
| reset | `formResetCallback` → selection re-derived from `resetValue` (first match), silent | S14 |
| disabled group / disabled fieldset | FACE machinery + `formDisabledCallback` → effective disabled on every internal input | no state change, no entry, exposed unavailable (S15, S19) |

Events: no custom events. Composed `input` (native, bubbling from the
option) and composed `change` (re-dispatched from the group host) are the
only signals (S1; research D5).

## Token vocabulary (component layer)

```text
--ki-radio-{control-size|dot-size|min-target|gap|control-radius|border-width}
--ki-radio-label-{font-size|font-weight|line-height}
--ki-radio-{unselected|selected}-{rest|hover|active|disabled}-{bg|fg|border}
--ki-radio-focus-ring-{color|width|offset}
--ki-radio-group-gap
--ki-radio-group-label-{font-size|font-weight|line-height}
```

- option structure: 9 tokens, single scale (no size axis in v1 — spec
  assumption); `control-radius` references `ki.radius.round`;
- selection × interaction ink matrix: 2 × 4 × 3 = 24 (`fg` = inner-dot
  ink, pure CSS circle — research D8; the unselected column keeps the
  matrix uniform, 006 D8 rationale);
- focus ring: 3;
- group structure: 4 (stack gap + group-label typography);
- = 40 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the radio matrix in `radio.material3.tokens.json`
  with the `-bg`-as-backdrop convention (the sweep must measure dot-on-
  backdrop even for unfilled M3 controls); the group file has no
  material3 override (structure inherits — research D8).
- Contrast gate sweeps `selected-{rest|hover|active}` fg-on-bg pairs at
  the 3:1 non-text minimum (WCAG 1.4.11, 008 D8 mechanism); the
  unselected ring is a 1.4.11 obligation met at the token layer;
  disabled cells exempt (research D8).

## Slots & parts

| Element | Surface | Name | Purpose |
|---|---|---|---|
| ki-radio-group | slot | (default) | The `ki-radio` options (document order = navigation order). Options are valid only inside a group. |
| ki-radio-group | part | `label` | The rendered visible group label (accessible-name source via `aria-labelledby`, S10). |
| ki-radio | slot | (default) | The option label: accessible-name source AND native activation surface (shadow `<label>` nesting, 006 D1). Mandatory for valid usage. |
| ki-radio | part | `control` | The visual ring + inner dot (bg, border, radius, focus ring). |
| ki-radio | part | `label` | Wrapper around the default slot (label typography, gap side). |

No named slots in v1. Customization ladder: tokens →
`::part(control)`/`::part(label)` → slotted option labels.
