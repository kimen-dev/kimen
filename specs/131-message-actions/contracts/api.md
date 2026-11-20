# Message actions API

| Surface | Contract |
| --- | --- |
| `actions` slot | Existing slot for app-supplied controls. In toolbar mode, use direct buttons or a ButtonGroup of actions and an optional Menu. |
| `actions-label` | Localized name that opts an assistant reply into the managed toolbar. Leave ButtonGroup in its default layout mode. |
| `data-message-action` | Put `regenerate`, `good` or `bad` on the corresponding control. Rating icon buttons use the controlled `pressed` API. |
| `feedback` | Optional `good` or `bad` rating. Sets the pressed state of the corresponding control and updates on rating activation. |
| `branch-index`, `branch-count` | One-based current index and total. The default is one response. |
| `previous-branch-label`, `next-branch-label` | Localized branch control names. |
| `branch-status-label` | Polite status text using `{index}` and `{count}`. |
| `ki-branch-change` | Detail `{ index: number }` carries the requested index. The application updates the index and reply content. |
| `ki-feedback` | Detail `{ value: 'good' \| 'bad' }` carries the rating. |
| `ki-regenerate` | Requests another reply. |

Events bubble across shadow boundaries. Branching, feedback persistence, and
regeneration belong to the application. These events do not add catalog
action bindings.
