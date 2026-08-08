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
