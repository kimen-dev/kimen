# Notification count and presence

Provide the actual count or presence in the host's label. The visible counter
is decorative, so a label can expose the full count even if the pill says
`99+`.

```html
<ki-icon-button variant="secondary" label="Notifications, 3 unread">
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
    <path d="M6 17h12l-2-3V9a4 4 0 0 0-8 0v5l-2 3Zm4 3h4" stroke-width="2" />
  </svg>
  <ki-counter slot="counter" value="3"></ki-counter>
</ki-icon-button>

<ki-avatar initials="AG" label="Ana García, online">
  <ki-counter slot="counter" tone="success" dot></ki-counter>
</ki-avatar>
```

The `for` attribute attaches the indicator to a trigger ID in the same
document or shadow root. Set the trigger's accessible name directly.

```html
<a id="inbox-link" href="/inbox" aria-label="Inbox, 120 unread">Inbox</a>
<ki-counter for="inbox-link" value="120" max="99"></ki-counter>
<p id="inbox-updates" role="status"></p>
```

For an important count update, update the trigger name and the counter, then
write one localized announcement to the pre-existing status region.
