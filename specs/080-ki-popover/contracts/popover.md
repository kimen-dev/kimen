# Popover public surface

| Member | Contract |
| --- | --- |
| `for` | Literal ID of a native or Kimen button in the same tree |
| `placement` | `top`, `bottom`, `start`, or `end`, with optional `-start` or `-end`. Defaults to `bottom-start` |
| `open` | Reflected visibility. Defaults to false |
| `label` | Accessible name of the dialog kind. Defaults to “Popover” |
| `arrow` | Shows the arrow. Defaults to true |
| `kind` | `dialog` or `toggletip`. Defaults to `dialog` |
| Default slot | Dialog content or toggletip text |
| Parts | `surface` and `arrow` |
| Events | `ki-open` and `ki-close` report actual visibility transitions |

The native popup remains non-modal. Escape and outside click dismiss it. A dialog can contain a form that owns its submission. A toggletip holds supplemental text announced through a polite status region.
