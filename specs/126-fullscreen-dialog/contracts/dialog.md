# Dialog surface

| Member | Contract |
| --- | --- |
| `fullscreen` | `never` by default. `compact` enters fullscreen below 600 CSS pixels. `always` fills the window at any width. |
| `confirm-label` | Optional label. Creates a ghost action in the fullscreen header or a primary action in the centered footer. |
| `close-label` | Accessible name of the fullscreen close button. Defaults to `Close`. |
| `ki-confirm` | A bubbling, composed confirmation notification. Application code decides whether to submit or dismiss. |
| `ki-close` | While fullscreen, Escape and the built-in close button produce a cancelable dismissal request. Other paths retain the existing post-close notification. |

The default slot remains the scrollable body. The `footer` slot remains available in both layouts. The modal is named by `heading` and retains the existing `open`, `show()` and `close()` controls.
