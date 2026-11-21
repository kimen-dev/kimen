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

The `icon` slot takes a decorative glyph, drawn in the tone's colors in a round frame at the top of the card. Without one, every non-neutral tone draws its own Lucide glyph there (`info`, `circle-check`, `triangle-alert`, `octagon-alert`); slot an icon to replace it, or to give a neutral alert one. The `actions` slot takes the responses to the message as `size="sm"` buttons, in a row after the message and outside the live region. An action never dismisses the alert by itself: set `dismissed` when it should go, and focus moves on to the next control:

```html
<ki-alert tone="warning" heading="Session ending" dismissible>
  <svg slot="icon" viewBox="0 0 20 20" aria-hidden="true">
    <path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4v4.5h-1.5V6h1.5Zm-.75 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
  </svg>
  Your session expires in one minute. Choose Stay signed in to keep working.
  <ki-button slot="actions" type="button" variant="secondary" size="sm">Sign out</ki-button>
  <ki-button slot="actions" type="button" variant="primary" size="sm">Stay signed in</ki-button>
</ki-alert>
```
