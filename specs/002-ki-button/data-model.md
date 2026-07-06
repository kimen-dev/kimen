# Phase 1 Data Model: ki-button

No persistent data. The model is the component's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/button-contract.md](./contracts/button-contract.md); this file
models values, defaults and transitions.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid value behavior |
|---|---|---|---|---|
| `variant` | `primary` \| `secondary` \| `tertiary` \| `quaternary` \| `ghost` | `secondary` | yes | renders as `secondary` (S11) |
| `tone` | `neutral` \| `success` \| `danger` | `neutral` | yes | renders as `neutral` |
| `size` | `xs` \| `sm` \| `md` \| `lg` \| `xl` | `md` | yes | renders as `md` |
| `type` | `submit` \| `reset` \| `button` | `submit` | yes | behaves as `submit` (native parity) |
| `name` | string | — | yes | submitted only when this button submits |
| `value` | string | — | yes | idem |
| `disabled` | boolean | `false` | yes | — |

Semantics of the two orthogonal axes:

- `variant` encodes **action hierarchy** (how much attention the action
  claims), never appearance. One `primary` per view is the documented
  guidance.
- `tone` encodes **intent** (neutral action, confirming/positive,
  destructive/irreversible) and multiplies with every variant.

## State model (CSS states, never attributes)

```text
enabled ──hover──▶ hovered ──press──▶ active ──release──▶ hovered
   │                                                    (activation fires once)
   └─Tab──▶ focused (:focus-visible ring)
disabled: no pointer/keyboard path in; if focus was held, focus moves on,
          no activation fires afterwards (spec edge case)
```

| State | Selector | Token suffix |
|---|---|---|
| rest | base | `-rest` |
| hover | `:hover` | `-hover` |
| active | `:active` | `-active` |
| focus | `:focus-visible` | shared focus-ring tokens |
| disabled | `[disabled]` / `formDisabledCallback` | `-disabled` |

## Form participation model

| `type` | On activation | Form data contribution |
|---|---|---|
| `submit` | proxy native submitter → constraint validation → `submit` event | `name`/`value` iff this button submitted |
| `reset` | `internals.form.reset()` | none |
| `button` | none (page listens to `click`) | none |

Events: no custom events. The composed, bubbling `click` from the internal
native button is the single activation signal (S1/S4 observe it).

## Token vocabulary (component layer)

```text
--ki-button-{size}-{height|padding-inline|gap|radius|font-size|line-height|icon-size|min-target}
--ki-button-{variant}-{tone}-{state}-{bg|fg|border}
--ki-button-{variant}-{state}-shadow
```

- sizes: xs, sm, md, lg, xl (5) → 40 geometry tokens
- variants × tones × states: 5 × 3 × 4 → 180 color tokens (bg/fg/border)
- variants × states: 5 × 4 → 20 elevation tokens
- Every value references the 001 semantic layer (family × emphasis grades);
  material3 overrides the same names in its component-layer file.

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | *(default)* | label content; source of the accessible name |
| slot | `start` | leading icon/media (flips with writing direction) |
| slot | `end` | trailing icon (flips with writing direction) |
| part | `button` | the internal native button (layout, states) |
| part | `label` | the label wrapper |
