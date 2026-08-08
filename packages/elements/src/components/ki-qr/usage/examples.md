A scannable link with a purpose-stating `label` (the accessible name) and the same payload offered as a visible link next to the code — the accessible alternative is mandatory, the code never travels alone:

```html
<ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>
<a href="https://onmars.dev">onmars.dev</a>
```

`value` is data, never behavior: it is encoded locally byte-for-byte and never interpreted, resolved, navigated to or fetched; non-ASCII text round-trips exactly:

```html
<ki-qr value="Reunión mañana — Zúrich" label="Add the meeting to your phone"></ki-qr>
```

Malformed declarations never break a page: with no `value` (or one beyond the ~2,331-byte capacity) nothing renders and nothing errors:

```html
<ki-qr label="Nothing to encode"></ki-qr>
```
