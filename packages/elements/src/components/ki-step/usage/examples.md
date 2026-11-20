# Step examples

Place each step directly inside a `ki-stepper`. Use plain text or passive
inline markup for the label and `description` for supporting text.

```html
<ki-stepper label="Checkout progress" orientation="vertical">
  <ki-step state="done" href="/checkout/address">Address</ki-step>
  <ki-step state="current" description="Confirm the billing address.">Billing</ki-step>
  <ki-step>Review</ki-step>
</ki-stepper>
```
