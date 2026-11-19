# Counter public contract

| Attribute / property | Type | Default | Behavior |
|---|---|---|---|
| `value` | `number` | unset | Positive whole count. Zero or missing hides the indicator unless dot mode is active. |
| `max` | `number` | `99` | Largest count shown in full. Higher counts use the cap followed by `+`. |
| `dot` | `boolean` | `false` | Shows a dot without digits, including when the count is unset or zero. |
| `tone` | `'danger' \| 'primary' \| 'success' \| 'neutral'` | `'danger'` | Changes the visible palette. |
| `for` | `string` | unset | Literal ID of the associated element in the same document or shadow root. |

The `indicator` part paints the count or dot. The element has no own slots,
events, actions, keyboard stops, or form behavior. It is hidden from
assistive technology and ignores pointer input. The icon button and avatar
each accept one decorative counter in their named `counter` slot. Avatar
counts sit at block-start inline-end and avatar dots at block-end inline-end.
The consumer supplies the meaningful accessible name through the host's
existing `label` API and owns any page-level polite announcement.
