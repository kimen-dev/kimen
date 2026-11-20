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

## Styling

The trail exposes `navigation`, `list`, `list-item`, `link`, `label`,
`current`, `more-button`, `menu` and `menu-item` parts.

The main trail tokens are `--ki-breadcrumb-fg`, `--ki-breadcrumb-current-fg`,
`--ki-breadcrumb-separator` and `--ki-breadcrumb-gap`. The popup uses the
`--ki-breadcrumb-menu-*` surface tokens. Interactive targets inherit
`--ki-density-target-min`.
