# Search API contract

`ki-search` exposes `label`, `placeholder`, `value`, `name`, `mode` (auto,
docked or fullscreen), `open`, `highlight` and `loading`. The named slots
`leading` and `trailing` furnish the collapsed and docked bar. The default
slot takes `ki-search-suggestion` children with optional `value`,
`description` and `recent`. A missing value derives from the child text.
The `results` slot takes host-rendered content below the suggestions and history.

`ki-input` and `ki-search` report `{ value }`. `ki-clear` reports a cleared
query. `ki-remove-recent` reports `{ value }` when a history entry is
removed. The host handles fetching, search and durable history. A named
Search contributes its current query to native form data.
