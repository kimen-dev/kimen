# Phase 1 Data Model: ki-input

No persistent data. The model is the component's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/input-contract.md](./contracts/input-contract.md); this file
models values, defaults and transitions.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `type` | `text` \| `email` \| `password` \| `url` \| `tel` \| `search` | `text` | yes | unknown value behaves as `text` (S6, FR-012); `number` is not a value in v1 |
| `label` | string | — | yes | mandatory for valid usage; absence is misuse and fails the a11y gate, not a supported mode |
| `placeholder` | string | — | yes (forwarded) | hint only; never the accessible name (S23) |
| `value` | string | `''` | **no** — attribute declares the DEFAULT; property reads/writes the LIVE value | see value model below |
| `name` | string | — | yes (host-level, FACE) | omitted → the field contributes no form entry |
| `required` | boolean | `false` | yes (forwarded) | readonly exempts from it (S27) |
| `readonly` | boolean | `false` | yes (forwarded) | — |
| `disabled` | boolean | `false` | yes (forwarded) | — |
| `autocomplete` | string (autofill detail tokens, e.g. `email`, `current-password`) | — | yes (forwarded verbatim) | omitted → no declared entry purpose |

## Value model (native dirty-value semantics)

```text
                     declared default = value ATTRIBUTE (live)
                              │
   first render ──────────────┘  value property = attribute ?? ''   dirty=false
        │
        ├─ user types      → property updates per keystroke,  dirty=true,
        │                    composed input events; change on commit (S1, S2)
        ├─ page assigns
        │  el.value = x    → display replaced, NO events,     dirty=true (S20)
        └─ form reset      → property := attribute ?? '',     dirty=false,
                             user edits and programmatic
                             assignments discarded (S13)
```

Invariants:

- typing NEVER rewrites the `value` attribute (FR-004);
- `internals.setFormValue(value)` runs on every value change, so submission
  always carries the live value (S12);
- events report user actions only: the composed `input` passes through
  natively; `change` is re-dispatched composed from the host on internal
  commit (research D5); programmatic assignment is silent by construction.

## Internal state

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `formDisabled` | boolean | `formDisabledCallback` (`fieldset[disabled]`, `form[disabled]` ancestry) | effective-disabled = `disabled \|\| formDisabled` → internal input `disabled`, exclusion from form data (S15) |
| `user-invalid` | custom state (`internals.states`) | host `invalid` event (blocked submission attempt) or user commit while invalid | CSS `:host(:state(user-invalid))` (S21); cleared when valid again or on reset |

## State model (CSS states, never attributes — FR-011)

| State | Selector | Token suffix (inks swapped via `--_ki-input-*`) |
|---|---|---|
| rest | base `:host` | `-rest` |
| hover | `:host(:hover)` | `-hover` |
| focus | `:host(:focus-within)` + focus-ring tokens | `-focus` |
| disabled | `:host(:disabled)` / formDisabled | `-disabled` |
| readonly | `:host([readonly])` | `-readonly` |
| invalid | `:host(:state(user-invalid))` | `-invalid` |

user-invalid transitions:

```text
untouched (never invalid-looking, even empty+required — FR-011)
   │ submission attempt fails (invalid event)      ┐
   │ or user commits an edit that is invalid       ├──▶ user-invalid
   └───────────────────────────────────────────────┘        │
        value becomes valid, or form reset ◀────────────────┘  (state cleared)
```

## Form participation model (ElementInternals, 002 pattern)

| Interaction | Mechanism | Outcome |
|---|---|---|
| submit | `setFormValue` entry under host `name` | `name=value` in FormData (S12); readonly still submits (S26) |
| Enter in field | keydown → `internals.form.requestSubmit()` | implicit submission with constraint validation (S8) |
| empty + required | mirrored `valueMissing` via `setValidity` | submission blocked, field invalid (S14) |
| kind mismatch (e.g. bad email) | mirrored `typeMismatch` | submission blocked, field invalid (S28) |
| readonly + required + empty | native input barred from validation → mirror is valid | submission proceeds (S27) |
| reset | `formResetCallback` → attribute default restored | S13 |
| disabled host / disabled fieldset | FACE machinery + `formDisabledCallback` | excluded from FormData and validation (S15, S3) |

Events: no custom events. Composed `input` (native pass-through) and
composed re-dispatched `change` are the only signals (S1, S2, S20).

## Token vocabulary (component layer)

```text
--ki-input-{height|min-target|padding-inline|gap|label-gap|radius|icon-size}
--ki-input-{font-size|font-weight|line-height}
--ki-input-label-{font-size|font-weight|line-height}
--ki-input-border-width
--ki-input-border-{block-start|block-end|inline-start|inline-end}-width
--ki-input-{rest|hover|focus|disabled|readonly|invalid}-{bg|fg|border|label-fg|placeholder-fg}
--ki-input-focus-ring-{color|width|offset}
```

- structure: ~13 tokens, single scale (no size axis in v1)
- border widths: 5 (per-side logical overrides defaulting to the shorthand —
  the filled vs outlined enclosure lever, research D8)
- state colors: 6 states × 5 inks = 30
- focus ring: 3
- ≈ 51 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the same names in `input.material3.tokens.json`.

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | `start` | leading icon/affix inside the field (flips with writing direction, S18) |
| slot | `end` | trailing icon/affix (flips with writing direction) |
| part | `field` | the enclosure wrapper (bg, border, radius, focus ring) |
| part | `input` | the internal native input (entry text, caret) |
| part | `label` | the rendered visible label |

No default slot: the label is an attribute (accessible-name wiring by
construction, spec assumption).

> Review round 1 note: the planned internal `dirty` flag was never needed — the shipped model tracks no dirty state (the attribute→prop sync deviation in research D2 makes it observable-equivalent). Doc aligned with the simpler implementation.
