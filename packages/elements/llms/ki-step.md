# ki-step

> One authored step in a Stepper.

## When to use

Place directly inside ki-stepper in task order. Its default slot
is the step label and its properties describe the step to the owning list.

## When not to use

Standalone or with interactive content in the label.
A completed step can make the label itself a link.

## Examples

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

## Attributes

- `description` (string | undefined): Optional supporting text displayed below the label.
- `href` (string | undefined, URL): Destination for a completed step. Omit for a passive step.
- `state` ("current" | "done" | "error" | "upcoming", default 'upcoming'): The step's progress state. Mark the active step as current.

## Slots

- (default): The visible label. Use text or passive inline markup.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-typography-family-body`: semantic font family for typography family body.
