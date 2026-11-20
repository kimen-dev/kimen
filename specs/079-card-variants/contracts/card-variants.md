# Additions to the ki-card public contract

| Member | Contract |
| --- | --- |
| `variant` | `default` (the theme's existing card), `elevated`, `filled` or `outlined`. Unknown values use the default appearance. |
| `href` | Nonblank destination for the native title link. Takes precedence over `interactive`. |
| `interactive` | Boolean, defaults to false. Enables a native title button for a card action. |
| `ki-activate` | Bubbles and is composed. Emitted once when the action card is activated, with no payload. |
| `trigger` | The native link or button in the clickable card's heading. |

Use one text heading in the `header` slot for a clickable card. The title is
the primary control's accessible name. Keep other controls separately
focusable in the card. Supporting text remains selectable. The component
emits only the declared event, and generated UI uses the renderer's existing
URL and action policies.
