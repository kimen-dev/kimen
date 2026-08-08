`tone` sets the token-backed colors and the live-region urgency — `danger` and `warning` expose `role="alert"`, every other value `role="status"`:

```html
<ki-alert tone="success">Your changes were saved.</ki-alert>
<ki-alert tone="danger">Payment failed. Update your billing details.</ki-alert>
```

An optional `heading` adds emphasized text inside the live region; it is a `strong` element, never a document heading:

```html
<ki-alert tone="warning" heading="Storage almost full">
  You are using 92% of your plan.
</ki-alert>
```

`dismissible` renders the alert's only tab stop; user dismissal reflects `dismissed` and fires a composed `ki-dismiss` (programmatic `dismissed` writes stay silent, and clearing the attribute re-shows the alert):

```html
<ki-alert tone="danger" heading="Save failed" dismissible>
  Your changes could not be saved. Retry or copy your work elsewhere.
</ki-alert>
```

`dismiss-label` overrides the dismiss button's accessible name — the default `Dismiss` is the component's only built-in user-visible string, so localize it whenever the document language is not English:

```html
<ki-alert lang="es" tone="info" dismissible dismiss-label="Descartar">
  Mantenimiento programado el sábado desde las 02:00 UTC.
</ki-alert>
```
