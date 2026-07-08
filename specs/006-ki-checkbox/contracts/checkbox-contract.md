# Public contract: `<ki-checkbox>`

The behavior contract is `specs/006-ki-checkbox/feature.feature` (S1–S21).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-checkbox>` — form-associated custom element (participates in native
forms through ElementInternals, 002 pattern; sibling of 003 ki-input under
the Fase 2 charter). Registered by `@kimen/elements`; per-component export
`dist/components/ki-checkbox.js` (tree-shakable custom element build).

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure). All reflect — including `checked`
and `indeterminate`, whose attributes track LIVE state (charter
style-driving rule), so serialized markup always agrees with the visual
state.

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `checked` | `boolean` | `false` | Live binary selection state. User activation (pointer on control or label, Space) toggles it with native parity and fires composed `input` then `change` (S1, S6, S20). Boolean PRESENCE semantics: any present value renders checked — `checked="false"` renders checked (S4, FR-010); unchecked is expressed only by omitting the attribute. Because the attribute reflects live state, it is NOT a `defaultChecked`: the reset baseline is captured when the control becomes form-associated (S13, FR-006). Programmatic assignment is silent (no events). |
| `indeterminate` | `boolean` | `false` | Presentation-only mixed state: renders the dash mark (winning visually over `checked`) and is exposed to assistive technology as "mixed" (S8). The submitted value follows `checked` alone (S12). Any user toggle clears it, removes the attribute and inverts `checked` (S3 → checked, S19 → unchecked). Form reset never touches it. |
| `disabled` | `boolean` | `false` | No state change (S2), out of tab order, exposed as unavailable to AT (S9), excluded from form data; `fieldset[disabled]` honored (S15). |
| `required` | `boolean` | `false` | An unchecked required checkbox is invalid (`valueMissing`, platform-computed) and blocks form submission (S14); the invalid appearance surfaces only after a blocked submission attempt or an invalidating user toggle, never on first render. |
| `name` | `string` | — | Form-data key contributed when checked (S10). Omitted → no entry. |
| `value` | `string` | `"on"` | Form-data value paired with `name` when checked (S10, S12). Never submitted when unchecked (S11). Defaults to `"on"` for native parity. |

## Slots

| Slot | Contract |
|---|---|
| (default) | The label. It is the accessible-name source (S7) and a native activation surface — activating it toggles the control (S20). Mandatory for valid usage: an unlabeled checkbox has no accessible name and fails the a11y gate (when-NOT-to-use). Follows the writing direction: control leads, label trails (S18, RTL-safe). |

No named slots in v1.

## Parts

| Part | Contract |
|---|---|
| `control` | The visual box: background, border, radius, focus ring and the check/dash marks (inline SVG, currentColor). Second rung of the customization ladder (after tokens, before slotted content). |
| `label` | Wrapper around the default slot (label typography and gap). |

## Events

No custom events (charter: platform names, no `ki-*` re-emission).

| Event | Semantics |
|---|---|
| `input` | Native, composed — fires on each user toggle, before `change` (S1). Passes through the shadow boundary retargeted to the host. |
| `change` | Re-dispatched from the host as composed+bubbling on each user toggle (S1) — the native event is not composed and would die at the shadow root. Never fired for programmatic assignments; never fired when disabled (S2). Exactly one per state flip. |

Form lifecycle observes native `submit`/`reset`/`invalid` events on the
form/host. Space toggles the focused checkbox (S6); Enter does not toggle
(native parity).

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every selection × interaction × validity state
  resolves from `--ki-checkbox-*`; those resolve from the semantic layer
  (Art. VI, FR-008). Control size, radius and gap are tokens — no `size`
  attribute exists in v1.
- Selection states style through the reflected `checked`/`indeterminate`
  attributes; interaction and validity states (hover, active, disabled,
  invalid) are CSS states styled through tokens — never attributes/props
  (FR-009). The invalid appearance surfaces only via
  `:state(user-invalid)` after interaction or a submission attempt.
- The marks are inline SVG drawn in currentColor, so mark ink is a pure
  token decision per state and theme (research D7); the mark state-change
  animation is suppressed under `prefers-reduced-motion` (S21, FR-014).
- Focus is clearly visible in every theme via
  `--ki-checkbox-focus-ring-*`; the pointer target is ≥ 24×24 px via
  `--ki-checkbox-min-target` (FR-011).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: selecting one or more independent options that a form
  submits later; a "select all" parent reflecting partial selection through
  the `indeterminate` presentation. Always with a slotted visible label.
- **When NOT to use**: a single mutually exclusive choice (future
  ki-radio-group), an immediate on/off effect (future ki-switch),
  triggering an action (ki-button), unlabeled/icon-only usage (no
  accessible name), and writing `checked="false"` to mean unchecked —
  boolean attributes follow presence semantics; omit the attribute to
  express unchecked.

## Compatibility

First release of the element (pre-1.0 line); purely additive — no existing
API changes. Removing or renaming anything above after first publish is
MAJOR per Art. IX. Deferred additive candidates recorded by the spec: a
`size` axis (if a design source ever demands one), validation-message
display (aligned with 003), a checkbox-group element,
focusable-when-disabled.
