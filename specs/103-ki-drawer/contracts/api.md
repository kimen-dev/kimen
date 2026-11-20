# Drawer API

| Member | Contract |
| --- | --- |
| `heading` | The visible title and accessible name. Supply it when opening. |
| `placement` | `end` (default), `start`, or `bottom`. Side placements follow direction. |
| `open` | Reflected boolean, initially false. |
| `size` | Optional CSS length overriding the themed 18rem width or bottom height cap. |
| `modal` | Boolean, true by default. Use `modal="false"` in markup for no scrim or background inertness. |
| `close-label` | Localizable accessible name for the built-in Close button. Defaults to “Close”. |
| `show()` | Open the drawer. |
| `close()` | Request dismissal. |
| `ki-close` | Bubbling, composed, cancelable request with `detail.reason` of `button`, `escape`, `method` (including open-state changes), or `swipe`. |
| Slots | Default content, `header-actions`, `footer`. |
| Parts | `dialog`, `heading`, `handle`, `header`, `close`, `body`, `footer`. |

The catalog declares `ki-close` as its action. The application owns saved data
and wires slotted actions to its own behavior.
