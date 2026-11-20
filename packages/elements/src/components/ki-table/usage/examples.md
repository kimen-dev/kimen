# Table examples

Wrap one native table and keep the caption, column scope and row scope in
the markup. A selected row's `data-key` identifies its record after sorting
or replacement.

```html
<ki-table id="services" selectable sticky-header style="max-block-size: 14rem">
  <table>
    <caption>Services</caption>
    <thead>
      <tr>
        <th scope="col" data-sort="name" aria-sort="ascending">Name</th>
        <th scope="col">Status</th>
        <th scope="col" data-numeric>Runs</th>
      </tr>
    </thead>
    <tbody>
      <tr data-key="billing">
        <th scope="row">Billing API</th>
        <td><ki-badge size="sm" tone="success">Ready</ki-badge></td>
        <td data-numeric>64</td>
      </tr>
      <tr data-key="search">
        <th scope="row">Search index</th>
        <td><ki-badge size="sm" tone="warning">Slow</ki-badge></td>
        <td data-numeric>18</td>
      </tr>
    </tbody>
  </table>
</ki-table>
```

With individual imports or a framework wrapper, register `ki-checkbox` when
using `selectable`. The full Kimen loader registers both elements.

```js
import { defineCustomElement as defineTable } from '@kimen/elements/ki-table';
import { defineCustomElement as defineCheckbox } from '@kimen/elements/ki-checkbox';

defineTable();
defineCheckbox();
```

Apply sort requests and update the native header state from the page.

```js
const frame = document.querySelector('#services');
const table = frame.querySelector('table');

frame.addEventListener('ki-sort', ({ detail: { key, direction } }) => {
  if (key !== 'name') return;
  const body = table.tBodies[0];
  const nameOf = (row) => row.querySelector('th[scope="row"]').textContent.trim();
  const sign = direction === 'ascending' ? 1 : -1;
  body.append(...Array.from(body.rows).sort((a, b) => sign * nameOf(a).localeCompare(nameOf(b))));

  for (const header of table.tHead.querySelectorAll('th[data-sort]')) {
    if (header.dataset.sort === key) header.setAttribute('aria-sort', direction);
    else header.removeAttribute('aria-sort');
  }
});

frame.addEventListener('ki-selection-change', ({ detail: { keys } }) => {
  updateBulkActions(keys);
});
```

Use `density="compact"` where the available block space is tight.
During a refresh, set `loading` to mark the native table busy and show
a placeholder below the existing records. Remove it once the refresh ends.

For a person column, place `<ki-avatar size="xs" initials="AG"></ki-avatar>`
next to the visible name. For a row menu, use a trailing "Actions" header
and a button whose name includes the row. Import
`@kimen/elements/icons/ellipsis` before mounting the glyph.

```html
<td>
  <ki-icon-button
    id="billing-actions"
    size="xs"
    variant="ghost"
    label="More actions for Billing API"
  >
    <ki-icon name="ellipsis"></ki-icon>
  </ki-icon-button>
  <ki-menu anchor="billing-actions">
    <ki-menu-item value="inspect">View service</ki-menu-item>
  </ki-menu>
</td>
```

Give each row trigger a unique ID and handle the menu's `ki-select` event in
the application. Translate the checkbox labels with `select-all-label="Sélectionner toutes les lignes"`
and `row-selection-label="Sélectionner {row}"` on a French page.
