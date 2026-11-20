# Public interface

| Attribute | Type | Default |
| --- | --- | --- |
| label | string | Slider |
| help-text | string | — |
| name | string | — |
| disabled | boolean | false |
| min / max / step | number | 0 / 100 / 1 |
| value | number or comma-separated pair | Minimum for one thumb, endpoints for a range |
| range | boolean | false |
| marks | number | 0 |
| format | number, percent or currency | number |
| currency | ISO 4217 code | EUR |
| minimum-label / maximum-label | string | minimum / maximum |
| centered | boolean | false |
| orientation | horizontal or vertical | horizontal |

Each thumb exposes the slider role and current bounds. A range's lower thumb
has the upper thumb's value as its maximum, and vice versa. The two focus stops
remain in minimum then maximum order.

`input` bubbles on a user-driven value update. `change` bubbles once when a
pointer adjustment is committed, or after each value-changing keyboard
action. Read the current value from the host. Range submission uses a single
comma-separated form entry. The component has no slots.
