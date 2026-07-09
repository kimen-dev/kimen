# Phase 1 Data Model: ki-switch

No persistent data. The model is the component's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/switch-contract.md](./contracts/switch-contract.md); this file
models values, defaults and transitions.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `checked` | boolean (presence) | off | **yes** — the attribute reflects LIVE state so CSS selects the on/off matrix | any present value — `"maybe"`, `"false"`, nonsense — means on (S4, FR-001); rendering never breaks |
| `disabled` | boolean (presence) | `false` | yes (propagated to the internal input) | — |
| `name` | string | — | yes (host-level, FACE) | omitted → the switch contributes no form entry even when on |
| `value` | string | `"on"` (submitted default, native checkbox parity) | yes | replaces the default submitted value only; an off switch never contributes any value, custom or not (S18, S11) |

No `size`, `variant`, `tone`, `required` or `indeterminate` — the spec's
Assumptions exclude each explicitly (Art. VII).

## Checked model (reflection + snapshot reset, FR-005)

```text
              markup: checked attribute PRESENT (any value) = on
                              │  (presence normalized over Stencil's
                              │   string-"false" coercion — research D2)
   first render ──────────────┘  checked property = presence   S4
        │
        ├─ form association  → resetChecked := hasAttribute('checked')
        │                      (snapshot, captured ONCE per association,
        │                       never updated by later mutations)
        ├─ user toggle       → checked flips, attribute reflects,
        │                      one input + one change event (S1, S2, S17)
        ├─ page assigns
        │  el.checked = x    → state + attribute update, NO events (FR-002)
        └─ form reset        → checked := resetChecked (S12, S21)
```

Invariants:

- the attribute always agrees with the live state (reflection — the charter
  rule that lets token CSS select `:host([checked])`);
- because the attribute mutates with state, it CANNOT be the reset default
  (native `defaultChecked` deviation, declared in the spec's Assumptions
  and shared with the 006 ki-checkbox model): the snapshot at form
  association is the only baseline;
- `internals.setFormValue(...)` runs on every checked/value change, so
  submission always matches the visible state;
- events report user actions only: composed native `input` passes through;
  `change` is re-dispatched composed from the host on the internal toggle
  (research D4, citing 003 D5); programmatic mutation is silent by
  construction.

## Internal state

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `resetChecked` | boolean snapshot | `formAssociatedCallback` (once per association, from attribute presence) | `formResetCallback` (S12, S21) |
| `formDisabled` | boolean | `formDisabledCallback` (`fieldset[disabled]`, `form[disabled]` ancestry) | effective-disabled = `disabled \|\| formDisabled` → internal input `disabled`, no toggle, no form entry (S13) |

## State model (CSS states, never attributes/props — FR-009)

Two checkedness columns × four interaction states, swapped via the
`--_ki-switch-*` indirection (002 pattern):

| State | Selector | Token segment |
|---|---|---|
| unchecked rest | base `:host` | `unchecked-rest` |
| checked rest | `:host([checked])` | `checked-rest` |
| hover | `:host(:hover)` (× checkedness) | `…-hover` |
| active | `:host(:active)` (× checkedness) | `…-active` |
| disabled | `:host([disabled])` / formDisabled (× checkedness) | `…-disabled` |
| focus | `input:focus-visible + [part='track']` — focus ring only, not a color column | `focus-ring-*` |

Thumb position: `inset-inline-start` = `thumb-inset` (off) →
`calc(100% − thumb-size − thumb-inset)` (on); logical inset mirrors RTL
(S16). The travel transition exists only inside
`@media (prefers-reduced-motion: no-preference)` (S19, FR-011).

## Form participation model (ElementInternals, 002 pattern)

| Interaction | Mechanism | Outcome |
|---|---|---|
| submit, switch on | `setFormValue(value ?? 'on')` under host `name` | `name=on` (S10) or `name=<value>` (S18) in FormData |
| submit, switch off | `setFormValue(null)` | no entry at all (S11) |
| reset | `formResetCallback` → `checked := resetChecked` | S12 (on→off→reset→on), S21 (off→on→reset→off) |
| disabled host / disabled fieldset | FACE machinery + `formDisabledCallback` | no toggle, excluded from FormData (S3, S13) |
| Enter key | nothing — no implicit submission from a toggle (native checkbox parity, research D5) | — |
| validity | none in v1 (no `required`; a switch always holds a valid binary state) | — |

Events: no custom events. Composed `input` (native pass-through) and
composed re-dispatched `change` are the only signals (S1), exactly one of
each per user toggle, none for programmatic changes.

## Token vocabulary (component layer)

```text
--ki-switch-{track-width|track-height|thumb-size|thumb-inset|gap}
--ki-switch-{track-radius|thumb-radius|border-width|min-target}
--ki-switch-{unchecked|checked}-{rest|hover|active|disabled}-{track|thumb|border}
--ki-switch-focus-ring-{color|width|offset}
```

- structure: 9 tokens, single scale (no size axis in v1); geometry
  references `ki.space.*` / `ki.radius.*`; `min-target` ≥ 24 px (FR-013)
- state colors: 2 checkedness × 4 states × 3 inks = 24, referencing
  `ki.surface.*` / `ki.text.*` / `ki.outline.*`
- focus ring: 3
- = 36 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the same names in `switch.material3.tokens.json`
- gate note: the `{unchecked|checked}-{rest|hover|active}-track` cells feed
  the extended contrast sweep, paired against their `-thumb` counterparts
  at the WCAG 1.4.11 non-text 3:1 minimum; disabled cells exempt
  (research D8)
- no label typography tokens: the slotted label inherits page typography
  (006 sibling position; the `label` part is the restyling hook)

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | default | the label; accessible-name source (required content — usage without it is invalid, flagged by audits); activating it toggles the switch (S17) |
| part | `track` | the on/off channel (bg, border, radius, focus ring host) |
| part | `thumb` | the traveling handle (position conveys state; travel animation behind reduced-motion) |
| part | `label` | wrapper around the slotted label content |

The internal native input carries no part: the contract exposes exactly
three parts (spec API delta), and the input is an implementation vehicle,
not a customization surface.
