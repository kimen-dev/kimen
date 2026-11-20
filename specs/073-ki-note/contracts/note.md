# Note public contract

| Property | Values | Default |
| --- | --- | --- |
| `tone` | `neutral`, `primary`, `info`, `success`, `warning`, `danger` | `neutral` |
| `size` | `sm`, `md` | `md` |
| `icon` | Boolean | `true` |

The default slot holds the explanation. The `icon` slot takes a decorative
replacement. Neutral and info use an info glyph, primary uses sparkles, success
uses circle-check, warning uses triangle-alert and danger uses circle-alert.
The `note`, `icon` and `message` CSS parts expose the surface and its content.
The component has no events or actions.
