# Phase 1 Data Model: ki-checkbox

No persistent data. The model is the component's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/checkbox-contract.md](./contracts/checkbox-contract.md); this
file models values, defaults and transitions.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `checked` | boolean | `false` | **yes — live state** (charter style-driving rule; the attribute always agrees with the visual state and cannot play the native `defaultChecked` role, FR-006) | presence semantics: ANY present value renders checked, including `checked="false"` (S4, FR-010); unchecked = attribute omitted |
| `indeterminate` | boolean | `false` | yes — property and attribute stay in sync in both directions (FR-002) | presentation-only; presence semantics as above; any user toggle clears it and removes the attribute |
| `disabled` | boolean | `false` | yes (forwarded to the internal input) | presence semantics; not focusable, no state change, excluded from form data (S2, S9) |
| `required` | boolean | `false` | yes (forwarded) | presence semantics; unchecked + required = `valueMissing` (S14) |
| `name` | string | — | yes (host-level, FACE) | omitted → the checkbox contributes no form entry |
| `value` | string | `"on"` (effective — the prop may be unset; the submitted value falls back to `"on"`) | yes | read only when checked (S10); never submitted when unchecked (S11) |

## Selection model (binary value + presentation flag)

```text
                        reset baseline = checked state captured at
                        formAssociatedCallback (FR-006)
                                 │
  first render ──────────────────┘  checked from attribute PRESENCE (S4)
       │                             indeterminate from attribute presence
       │
       ├─ user toggle (pointer on control or label, Space)
       │      → native input activation: input.checked inverts,
       │        input.indeterminate clears
       │      → host syncs: checked := input.checked,
       │        indeterminate := false (attribute removed)
       │      → composed input event, then composed change (S1)
       │        · unchecked            → checked            (S1, S6, S20)
       │        · unchecked + mixed    → checked, not mixed (S3)
       │        · checked   + mixed    → unchecked, not mixed (S19)
       │
       ├─ page assigns el.checked / el.indeterminate
       │      → internal input synced, setFormValue, NO events
       │
       └─ form reset → checked := reset baseline; indeterminate UNTOUCHED
                       (native parity, FR-006, S13)
```

Invariants:

- the submitted value is binary: it follows `checked` alone, never
  `indeterminate` (S12, FR-002);
- `internals.setFormValue(checked ? value ?? 'on' : null)` runs on every
  `checked`/`value` change — `null` removes the entry (S10, S11);
- events report user actions only: composed `input` passes through
  natively; `change` is re-dispatched composed from the host on internal
  change (research D6); programmatic assignment is silent by construction;
- a user action never leaves the control mixed; serialized markup always
  agrees with the visual state (reflected booleans, spec edge case).

## Internal state

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `resetBaseline` | boolean | `formAssociatedCallback` (checked state at association, FR-006) | `formResetCallback` (S13) |
| `formDisabled` | boolean | `formDisabledCallback` (`fieldset[disabled]`, `form[disabled]` ancestry) | effective-disabled = `disabled \|\| formDisabled` → internal input `disabled`, exclusion from form data (S15) |
| `user-invalid` | custom state (`internals.states`) | host `invalid` event (blocked submission attempt, S14) or user toggle that leaves the control invalid | CSS `:host(:state(user-invalid))`; cleared when valid again or on reset (research D5, reusing 003 D7) |

## State model (CSS states, never attributes for interaction — FR-009)

Selection states select on reflected attributes (charter rule); interaction
and validity states are CSS states. Inks swap via the `--_ki-checkbox-*`
indirection:

| Axis | State | Selector | Token segment |
|---|---|---|---|
| selection | unchecked | base `:host` | `unchecked-*` |
| selection | checked | `:host([checked])` | `checked-*` |
| selection | indeterminate | `:host([indeterminate])` (wins over checked) | `indeterminate-*` |
| interaction | rest | base | `-rest-` |
| interaction | hover | `:host(:hover)` | `-hover-` |
| interaction | active | `:host(:active)` | `-active-` |
| interaction | disabled | `:host([disabled])` / formDisabled | `-disabled-` |
| validity | invalid | `:host(:state(user-invalid))` | `invalid-*` treatment |
| focus | focus-visible | `input:focus-visible ~ [part='control']` | `focus-ring-*` |

user-invalid transitions (003 D7 pattern):

```text
untouched (never invalid-looking, even required+unchecked — FR-009)
   │ submission attempt fails (invalid event, S14)   ┐
   │ or user unchecks a required checkbox            ├──▶ user-invalid
   └─────────────────────────────────────────────────┘        │
        checked becomes valid, or form reset ◀───────────────┘  (cleared)
```

## Form participation model (ElementInternals, 002/003 pattern)

| Interaction | Mechanism | Outcome |
|---|---|---|
| submit, checked | `setFormValue(value ?? 'on')` under host `name` | `name=on` (or declared value) in FormData (S10, S12) |
| submit, unchecked | `setFormValue(null)` | no entry (S11) |
| unchecked + required | mirrored `valueMissing` via `setValidity` | submission blocked, checkbox reported invalid (S14) |
| reset | `formResetCallback` → checked := baseline; indeterminate untouched | S13 |
| disabled host / disabled fieldset | FACE machinery + `formDisabledCallback` | excluded from FormData and validation (S15, S2) |

Events: no custom events. Composed `input` (native pass-through) and
composed re-dispatched `change` are the only signals (S1, S2).

## Token vocabulary (component layer)

```text
--ki-checkbox-{control-size|min-target|gap|radius|border-width}
--ki-checkbox-label-{font-size|font-weight|line-height}
--ki-checkbox-{unchecked|checked|indeterminate}-{rest|hover|active|disabled}-{bg|fg|border}
--ki-checkbox-invalid-{bg|fg|border}
--ki-checkbox-focus-ring-{color|width|offset}
```

- structure: 8 tokens, single scale (no size axis in v1 — spec assumption)
- selection × interaction ink matrix: 3 × 4 × 3 = 36 (`fg` = mark ink,
  drawn as currentColor SVG — research D7; the unchecked column keeps the
  matrix uniform per the spec's constitutional surface)
- invalid treatment: 3
- focus ring: 3
- = 50 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the same names in `checkbox.material3.tokens.json`.
- Contrast gate sweeps `{checked|indeterminate}-{rest|hover|active}`
  fg-on-bg pairs; the unchecked border is a non-text-contrast (1.4.11)
  obligation met at the token layer (research D8).

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | (default) | The label. Accessible-name source AND native activation surface (slotted into the shadow `<label>`, S7, S20). Mandatory for valid usage. |
| part | `control` | The visual box (bg, border, radius, focus ring, marks). |
| part | `label` | Wrapper around the default slot (label typography, gap side). |

No named slots in v1. Customization ladder: tokens → `::part(control)` /
`::part(label)` → slotted label content.
