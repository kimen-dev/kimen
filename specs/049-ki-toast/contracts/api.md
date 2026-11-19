# Public contract: ki-toast and ki-toaster

The generated surfaces (`packages/elements/generated/*`, the catalog and
`llms`) are the authoritative form; this page summarizes them for review.

## `<ki-toast>`

| Member | Kind | Default | Contract |
|---|---|---|---|
| `tone` | prop, reflected | `"neutral"` | `neutral` · `info` · `success` · `warning` · `danger`; icon and ink only; `danger` is `role="alert"` and waits. |
| `heading` | prop, reflected | — | Bold first line, inside the live region. |
| `duration` | prop (ms, ≥ 0) | 5000 | `0` waits; ignored with an action or in `danger`. |
| `dismissible` | prop, reflected | `true` | Renders the dismiss `ki-icon-button`. |
| `dismiss-label` | prop, reflected | `"Dismiss"` | Name of the dismiss button. |
| `dismissed` | prop, reflected, mutable | `false` | True once the toast has left. |
| `queued` | prop, reflected, output-only | `false` | Written by `ki-toaster`. |
| `ki-dismiss` | event | — | `{ reason: "timeout" \| "button" \| "escape" \| "action" }`. |
| default / `action` | slots | — | Message text / one ghost `ki-button size="sm"`. |
| `toast`, `icon`, `heading`, `message`, `action`, `dismiss` | parts | — | — |

## `<ki-toaster>`

| Member | Kind | Default | Contract |
|---|---|---|---|
| `placement` | prop, reflected | `"bottom-end"` | `top-center` · `top-end` · `bottom-center` · `bottom-end`; bottom center on a narrow touch screen. |
| `max` | prop, reflected (≥ 1) | 3 | Newest toasts shown; older ones queue. |
| `label` | prop, reflected | `"Notifications"` | Name of the group. |
| `show(options)` | method | — | `{ tone, title, message, duration, dismissible, action: { label, onClick } }` → the toast; removed once it has left. The page defines `ki-toast` and `ki-button`. |
| default | slot | — | `ki-toast` elements. |
| `stack` | part | — | The top-layer stack. |

## Tokens

`--ki-toast-{bg, bg-image, backdrop-filter, fg, message-fg, border,
border-width, shadow, radius, padding, gap, width, icon-size}`,
`--ki-toast-heading-font-family`, `--ki-toast-{tone}-icon`;
`--ki-toaster-{inset-block, inset-inline, gap}`. Heading and message type
read the semantic `--ki-typography-*` tokens directly.
