# Public surface

| Tag | Properties | Default slot |
| --- | --- | --- |
| `ki-fab-menu` | Required `label`, `icon-name="plus"`, `close-label="Close menu"`, `open=false`, `variant="secondary"`, `position="static"`, `scrim=true` | Two to six direct `ki-fab-menu-item` children |
| `ki-fab-menu-item` | Optional `icon-name`, `href` and `value` | Visible action label |

The parent emits `ki-open`, `ki-close` and `ki-select`. Only `ki-select` is the catalog action. Its detail is `{ value: string }`.

The parent exposes `trigger`, `menu` and `scrim` parts. The item exposes `control` and `icon` parts.
