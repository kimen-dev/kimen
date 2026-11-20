# ki-tool-call API

| HTML attribute | Type | Behavior |
| --- | --- | --- |
| `name` | string | Tool identifier displayed in monospace. |
| `title` | string | Optional visible human label. Typed bindings expose `toolTitle`. |
| `status` | `pending\|running\|done\|failed\|approval` | Pending by default. Each status has a text label. |
| `duration` | number | Non-negative milliseconds, displayed when Done. |
| `open` | boolean | Explicit expansion choice. The automatic default expands failed calls and collapses other calls. |
| `locale` | string | Language tag for duration formatting. Defaults to `en`. |
| `retryable` | boolean | Offer Retry on failed calls. Defaults to false. |

Localizable labels are `pending-label`, `running-label`, `done-label`, `failed-label`, `approval-label`, `input-label`, `output-label`, `error-label` and `retry-label`.

Place optional payloads in the `input` and `output` slots and a failure message or custom control in `error`. The latter is visible when a failed call is expanded.

`ki-tool-status-change` bubbles and crosses shadow boundaries. Its detail carries `name`, `status` and `label` for a conversation-owned log. It fires once per status transition after initialization.

`ki-tool-retry` bubbles and crosses shadow boundaries with the tool ID in `detail.name`. This is the guarded catalog activation event. Bind a declared action to it when retries are available.
