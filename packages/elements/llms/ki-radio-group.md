# ki-radio-group

> A token-styled radio group that owns selection, keyboard coordination and form participation for slotted `ki-radio` options. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously, on the custom-elements build (not on hosts created by the lazy loader).

## When to use

a person must choose exactly one of a small set of mutually
exclusive options that should all be visible at once.

## When not to use

many options or tight space (use `ki-select`), independent
on/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or
authored selection on options; set this group's `value` instead.

## Examples

The group owns the `label` (mandatory; the radiogroup's accessible name), the form `name` and the selected `value`; user selection dispatches a composed `change` event, while programmatic `value` writes stay silent:

```html
<ki-radio-group label="Delivery speed" name="delivery" value="standard">
  <ki-radio value="standard">Standard (3–5 days)</ki-radio>
  <ki-radio value="express">Express (1–2 days)</ki-radio>
  <ki-radio value="overnight">Overnight</ki-radio>
</ki-radio-group>
```

Without an initial `value` the group renders unselected and operable; `required` blocks form submission through the platform `valueMissing` validity until an option is chosen:

```html
<form>
  <ki-radio-group label="Billing cycle" name="cycle" required>
    <ki-radio value="monthly">Monthly</ki-radio>
    <ki-radio value="yearly">Yearly</ki-radio>
  </ki-radio-group>
  <ki-button variant="primary">Continue</ki-button>
</form>
```

A `disabled` group is skipped in Tab order and contributes no form entry; do not use it for pending or loading semantics:

```html
<ki-radio-group label="Region" name="region" value="eu" disabled>
  <ki-radio value="eu">Europe</ki-radio>
  <ki-radio value="us">United States</ki-radio>
</ki-radio-group>
```

## Attributes

- `disabled` (boolean, default false): Makes the whole group unavailable, skips it in Tab order and removes its form entry. When NOT to use: do not use disabled for pending/loading semantics.
- `label` (string, required): Visible label and accessible-name source for the radiogroup. When NOT to use: do not omit it; unlabeled groups fail accessibility gates.
- `name` (string | undefined): Form-data key for the selected option's value. Omit when the group should not contribute a form entry. When NOT to use: do not put `name` on `ki-radio` options; their internal native inputs are intentionally unnamed.
- `required` (boolean, default false): Requires one selected option for form submission. The group uses platform `valueMissing` from its internal native radio inputs. When NOT to use: do not use required when no answer is acceptable.
- `value` (string, default ''): Projection of the current selection. The initial attribute selects the first matching option; unmatched values leave the group unselected and operable. Assigning the property updates selection silently. When NOT to use: never author selection on `ki-radio`; set this value.

## Slots

- (default): `ki-radio` options. Document order is navigation order.

## Parts

- `label`: Visible group label and accessible-name source.

## Events

- `change` (Event): Fired once after the user selects a different radio, composed across the shadow boundary; `value` is already current when listeners run. When to use: react to the committed choice. When NOT to use: do not expect it for programmatic `value` writes, which are silent.

## Methods

None.

## CSS custom properties

- `--ki-radio-group-gap`: dimension used by the radio group component for gap.
- `--ki-radio-group-label-font-size`: dimension used by the radio group component for label font size.
- `--ki-radio-group-label-font-weight`: font weight used by the radio group component for label font weight.
- `--ki-radio-group-label-line-height`: dimension used by the radio group component for label line height (closest measured analogue: Radio_label sm 13/20; no group-title master exists — low-confidence refinement).
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-med-em`: semantic color for text med em.
- `--ki-typography-family-body`: semantic font family for typography family body.
