# Tree surface

| Element | Properties | Default content |
| --- | --- | --- |
| `ki-tree` | `label`, `selection` (`none`, `single`, `multiple`; defaults to `single`) | Direct `ki-tree-item` children. |
| `ki-tree-item` | `expanded`, `selected`, `disabled`, `lazy` (all default to false), `href`, `icon-name`, `loading-label` | The item label and direct child `ki-tree-item` elements. |

A tree with an explicit `label` exposes that name to assistive technology.
Provide unique, concise labels where a page contains more than one tree. Use
`icon-name` with a registered Kimen icon. Item icons are decorative.

| Event | Detail | Meaning |
| --- | --- | --- |
| `ki-selection-change` | `{ selectedItems }` | The interaction changed the selected items. |
| `ki-expand` | `{ item }` | The identified branch opened. |
| `ki-collapse` | `{ item }` | The identified branch closed. |
| `ki-load` | `{ item }` | The identified empty lazy branch opened for the first time. |

A loading handler adds child items to the affected branch. Clear `lazy` to
complete an empty response or to dismiss loading after an error. In catalog
renderers, hosts wire declared actions under the existing action and URL
policies.
