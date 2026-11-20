# Invoker contract

| Surface | Contract |
| --- | --- |
| `ki-button`, `ki-icon-button` | Optional `commandfor` contains the target dialog's ID. Optional `command` accepts `show-modal`, `close` or `request-close`. |
| `ki-dialog` | A show command opens the modal. A close command dismisses it and reports `ki-close` with `reason: 'command'`. A close request first runs the native cancellation path. Closing restores the opening control. |
| Guarded surface | A command pair resolves to a `ki-dialog` in the same surface by neutral node ID. The renderer assigns the DOM ID. |
| A2UI Modal | The adapter emits the entry-point button and the named content dialog joined by a show command. |

Existing imperative dialog methods and unconfigured buttons retain their current behavior.
