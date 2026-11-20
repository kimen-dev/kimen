# ki-note usage

Place one or two lines of static context beside a control or inside a card.
Use `ki-alert` for results that need announcing, Toast for transient
confirmations and the field's `help-text` for field guidance.

```html
<ki-note>Only workspace owners can change billing details.</ki-note>
<ki-note tone="warning" size="sm">Changing the slug breaks existing links.</ki-note>
<ki-note tone="info" icon="false">This link is visible to everyone in the workspace.</ki-note>
```

## Decorative icon replacement

```html
<ki-note tone="info">
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 3v18M3 12h18"></path>
  </svg>
  Adding a billing contact gives them access to invoices.
</ki-note>
```

The words convey the message by themselves. The decorative icon is hidden
from assistive technology and adds no tab stop. Start warnings with the
consequence.
