# Layout API

| Tag | Property | Values | Default |
| --- | --- | --- | --- |
| `ki-stack` | `direction` | `column`, `row` | `column` |
| `ki-stack` | `gap` | Non-negative Kimen spacing step | `md` |
| `ki-stack` | `align` | `start`, `center`, `end`, `stretch`, `baseline` | `stretch` |
| `ki-stack` | `justify` | `start`, `center`, `end`, `between` | `start` |
| `ki-stack` | `wrap` | Boolean | `false` |
| `ki-grid` | `columns` | Positive whole count | Automatic |
| `ki-grid` | `min-column` | CSS length usable as a grid track minimum | `15rem` |
| `ki-grid` | `gap` | Non-negative Kimen spacing step | `xl` |

Both tags have a default slot and no events or actions of their own. Direct
stack children may set `data-grow`. Direct grid children may set
`data-span="2"`; the span reduces to one when only one track fits. A fixed
grid uses equal columns, ignores `min-column` and switches to one track below
30rem of available inline size.

The default values come from `--ki-stack-gap`, `--ki-grid-gap`, and
`--ki-grid-min`. A supported non-default prop selects its corresponding
spacing token or track length.
