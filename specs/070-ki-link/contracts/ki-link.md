# `ki-link` public contract

| Property | Default | Behavior |
| --- | --- | --- |
| `href` | Required | Native anchor destination. |
| `variant` | `primary` | Accent ink. `neutral` selects body ink. |
| `underline` | `always` | Visible in running text. `hover` is for standalone navigation. |
| `external` | `false` | Sets `target="_blank"`, adds `noopener`, displays the external icon and announces the new-tab behavior. |
| `external-label` | `(opens in a new tab)` | Localizable announcement appended to the link name in external mode. |
| `download`, `target`, `rel` | Browser defaults | Native anchor settings. |

The default slot provides the visible link text and accessible name. The
`link` part exposes the native anchor. The component inherits text metrics
from its context and supports keyboard focus and activation through the
anchor. Render plain text when no link should be available.

The guarded catalog uses its URL policy for `href`. The link declares no
actions.
