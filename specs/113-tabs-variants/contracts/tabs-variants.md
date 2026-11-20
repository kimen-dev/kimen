# Tabs variant contract

| Element | Surface | Values and defaults |
| --- | --- | --- |
| `ki-tabs` | `variant` | `primary` (default) or `secondary` |
| `ki-tabs` | `iconLayout` / `icon-layout` | `stacked` or `inline`. Omission uses stacked in primary and inline in secondary. |
| `ki-tab` | `icon` slot | Decorative SVG. Supply visible default-slot text for the tab name. |

Use one primary group per screen and secondary groups for peer views inside
content. Group styling applies only to its own tabs. Existing parts, event,
and APG relationships continue to be governed by
[the base tabs contract](../../014-ki-tabs/contracts/tabs-contract.md).

The primary icon indicator uses `--ki-tab-primary-indicator-height`.
Secondary uses `--ki-tab-secondary-indicator-height`.
Both use `--ki-tab-indicator-color` and icons use `--ki-tab-icon-size`.
