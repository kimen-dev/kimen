# TopNav public contract

| Member | Default | Meaning |
| --- | --- | --- |
| `variant` | `header` | `header` for primary site navigation, `app-bar` for the current screen. |
| `label` | `Main` | Accessible name of the navigation landmark. |
| `size` | `md` | `sm` or `md`; app bars also accept two-row `lg` and `xl`. |
| `collapse-at` | `48rem` | Below this available inline size, navigation moves into a menu. With `none`, the links stay visible and wrap across the full width below the brand and actions when space runs out. |
| `sticky` | `false` | Stick to the scroll container's block-start edge with a bottom border. |
| `navigation-label` | `Open navigation` | Localized name of the collapsible navigation trigger and its menu. |
| `overflow-label` | `More actions` | Localized name of the app-bar overflow trigger and its menu. |
| `title`, `subtitle` | — | Screen heading and supporting text. Frameworks set the heading with `screenTitle`. |
| `heading-level` | `1` | HTML heading level from 1 through 6. |
| `title-align` | `start` | `center` is available for compact one-row bars with up to one action. |
| `scroll-behavior` | `elevate` | `none`, tint with `elevate`, or tint and reduce tall bars to medium with `collapse`. |
| `--ki-top-nav-links-gap` | `0rem` | Column gap between inline primary links. |
| `--ki-top-nav-links-justify` | `flex-start` | Inline link alignment. Use `flex-end` to align links next to the actions on a shared row or with the trailing edge on their own row. |

Header slots are `brand`, default (primary anchors), and `actions`. App-bar
slots are `leading`, `search`, and `actions`. Use directly slotted, named
buttons or links for actions that can overflow. The component dispatches no
custom actions. Slot content retains its own links and activation handlers.
