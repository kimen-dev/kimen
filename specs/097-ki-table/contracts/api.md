# ki-table API

| Attribute | Type | Default |
|---|---|---|
| `density` | `"default" \| "compact"` | `"default"` |
| `selectable` | boolean | false |
| `sticky-header` | boolean | false |
| `loading` | boolean | false |
| `select-all-label` | string | `"Select all rows"` |
| `row-selection-label` | string, with `{row}` replaced by the row header or key | `"Select {row}"` |

The default content is one native `<table>`. Supply `<caption>`, `<thead>` and `<tbody>` as in a regular data table. Use `<th scope="col">` for column headers and `<th scope="row">` for row names. Use `data-sort` on sortable column headers, `data-key` on selectable body rows, and `data-numeric` on numeric headers and cells. `data-meta` styles secondary cell text.

| Event | Detail | Application responsibility |
|---|---|---|
| `ki-sort` | `{ key: string, direction: "ascending" \| "descending" }` | Apply the sort and move `aria-sort` to the active header. |
| `ki-selection-change` | `{ keys: string[] }` | Consume the current selection for any application actions. |

Both events bubble and are composed. Table selection is independent of form submission. Native table markup belongs to the application. The catalog describes the slot and events without opening an HTML input surface.
