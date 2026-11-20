# Stat API contract

`<ki-stat>` displays a finite metric value and an optional finite comparison.

| Property | Attribute | Type | Default |
| --- | --- | --- | --- |
| `label` | `label` | string | — |
| `value` | `value` | number | — |
| `unit` | `unit` | string | — |
| `format` | — | Intl.NumberFormatOptions | Decimal formatting |
| `delta` | `delta` | number | — |
| `deltaFormat` | — | Intl.NumberFormatOptions | Value format |
| `direction` | `direction` | higher-is-better, lower-is-better, neutral | higher-is-better |
| `deltaLabel` | `delta-label` | string | — |
| `upLabel` | `up-label` | string | up |
| `downLabel` | `down-label` | string | down |

The `chart` slot accepts an optional sparkline. Supply a textual equivalent
for chart content that adds information. Stat has no events or surface
actions and participates in no forms.
