# ki-counter

> A decorative count or dot over a trigger or avatar.

## When to use

mark unread or pending items on a trigger, or presence on an
avatar. Supply the full meaning in the host's accessible name and use a
page-owned polite live region for important updates.

## When not to use

for an object's status (use ki-badge), a count inside a list
row (use text or ki-badge), or an announcement that needs its own semantics.

## Examples

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

## Attributes

- `dot` (boolean, default false): Show a dot independently of the count, including when the value is zero.
- `for` (string | undefined): Literal ID of a trigger in the same document or shadow root. Places the indicator at its block-start inline-end corner and hides it while the trigger is unavailable. For a named host slot, omit this property.
- `max` (number, default 99): Largest count displayed in full. Higher values display the cap with a plus sign. Fractional caps round down; invalid caps use 99.
- `tone` ("danger" | "neutral" | "primary" | "success", default 'danger'): Semantic palette of the pill or dot. An unknown tone uses danger.
- `value` (number | undefined): Count of unread or pending items. Finite values are rounded down. Values below one and non-finite values hide the count.

## Slots

None.

## Parts

- `indicator`: Painted pill or dot, including the surrounding ring.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-counter-backdrop-filter`: Complete backdrop filter for the indicator.
- `--ki-counter-bg`: Danger notification indicator fill.
- `--ki-counter-bg-image`: Optional image over the notification indicator fill.
- `--ki-counter-dot-size`: Width and height of the presence dot.
- `--ki-counter-fg`: Danger notification count text.
- `--ki-counter-font-family`: Font family for the count.
- `--ki-counter-font-size`: Font size for the count.
- `--ki-counter-font-weight`: Font weight for the count.
- `--ki-counter-neutral-bg`: Neutral notification indicator fill.
- `--ki-counter-neutral-fg`: Neutral notification count text.
- `--ki-counter-padding-inline`: Horizontal padding of a count pill.
- `--ki-counter-primary-bg`: Primary notification indicator fill.
- `--ki-counter-primary-fg`: Primary notification count text.
- `--ki-counter-radius`: Radius of the painted pill or dot.
- `--ki-counter-ring`: Surface-colored ring that separates the indicator from the trigger.
- `--ki-counter-ring-width`: Thickness of the separating ring.
- `--ki-counter-size`: Minimum width and height of a count pill.
- `--ki-counter-success-bg`: Success notification indicator fill.
- `--ki-counter-success-fg`: Success notification count text.
