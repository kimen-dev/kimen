# `ki-spinner` public contract

| HTML attribute | Property | Type | Default |
| --- | --- | --- | --- |
| `label` | `label` | `string`, required | None |
| `variant` | `variant` | `ring \| dots` | `ring` |
| `size` | `size` | `sm \| md \| lg` | `md` |
| `show-label` | `showLabel` | `boolean` | `false` |

Use `label` to describe the activity in the page's language. Add
`show-label` when sighted users also need that text. Insert the element when
the wait begins and remove it when the application completes the operation.

The status is polite and has the supplied accessible name. The ring and dots
are decorative. The element adds no tab stop and exposes no slots, events,
actions or methods. Use `ki-progress` for page-level work or progress with a
known value.

The ring consumes `--ki-spinner-size`, `--ki-spinner-stroke`,
`--ki-spinner-track` and `--ki-spinner-indicator`. The `ring`, `dots` and
`label` parts expose the painted graphic and its optional adjacent text for
style customization.
