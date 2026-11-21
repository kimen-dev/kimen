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

When the question is already written on the page, name the group from it with `aria-labelledby` on the host and omit `label`, so the question is shown and read once:

```html
<h2 id="plan-question">Which plan suits you?</h2>
<ki-radio-group aria-labelledby="plan-question" name="plan">
  <ki-radio value="basic">Basic</ki-radio>
  <ki-radio value="pro">Pro</ki-radio>
</ki-radio-group>
```

When the layout makes the question obvious but the group still needs its own name, `label-hidden` hides the label from view and from reading order; it stays the group's accessible name and is announced once:

```html
<ki-radio-group label="Your answer" label-hidden name="answer">
  <ki-radio value="yes">Yes</ki-radio>
  <ki-radio value="no">No</ki-radio>
</ki-radio-group>
```
