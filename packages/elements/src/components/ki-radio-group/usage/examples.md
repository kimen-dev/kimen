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

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
choice. The group is invalid, blocks its form and is announced as invalid at
once. Choosing another option withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-radio-group label="Plan" name="plan" value="team" custom-error="The Team plan is sold out this month.">
  <ki-radio value="solo">Solo</ki-radio>
  <ki-radio value="team">Team</ki-radio>
</ki-radio-group>
```
