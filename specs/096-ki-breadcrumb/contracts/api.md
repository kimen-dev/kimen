# Public contract: Breadcrumb

## `ki-breadcrumb`

| Surface | Default | Behavior |
| --- | --- | --- |
| `label` | `Breadcrumb` | Accessible name of the navigation landmark. |
| `max-items` | Unset | Positive, finite count that enables overflow above the threshold. A minimum threshold of four accommodates the three retained levels and the menu button. |
| `more-label` | `Show {n} more levels` | Accessible name template. Substitutes the number of collapsed levels for `{n}`. |
| Default slot | — | Ordered direct `ki-breadcrumb-item` children. |

## `ki-breadcrumb-item`

| Surface | Default | Behavior |
| --- | --- | --- |
| `href` | Unset | Native destination of an ancestor level. A level without a URL displays as text. |
| `current` | `false` | Explicit marker for the final level, which is treated as current automatically. |
| Default slot | — | The label mirrored as plain text by the owning breadcrumb. |

The current page uses `aria-current="page"` and has no link. The component exposes no custom actions or events.
