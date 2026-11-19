# `ki-empty-state` public contract

| HTML attribute | Property | Type | Default |
| --- | --- | --- | --- |
| `heading` | `heading` | string, required in the catalog | None |
| `icon-name` | `iconName` | Registered Lucide name | None |
| `tone` | `tone` | `neutral \| primary \| primary-light \| info \| success \| warning \| danger` | `neutral` |
| `size` | `size` | `sm \| md` | `md` |
| `heading-level` | `headingLevel` | Integer from 2 through 6 | 3 |
| `announce` | `announce` | Boolean | `false` |

The default slot holds the description. The `media` slot accepts a decorative
illustration in place of the icon. The `actions` slot takes controls in
document order, with at most one primary action. The component has no events,
methods or actions of its own. In a guarded surface, bind each action to its
slotted control and declare the action ID at surface level.

Use `announce` when an interaction can empty a list. The heading and recovery
advice appear in a polite region established before the first update. A native
heading exposes the level regardless of presentation size.

The `container`, `media`, `heading`, `description` and `actions` parts
allow scoped styling. The theme can override the spacing, maximum inline
size, background and text colors. The heading family follows
`--ki-typography-family-heading`.
