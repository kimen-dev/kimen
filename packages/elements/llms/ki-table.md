# ki-table

> A scrollable frame for a native data table with optional sorting and selection.

## When to use

Show records with shared fields that people compare, scan or sort.
Supply a native caption, column headers with scope="col" and record headers
with scope="row". Mark numeric cells with data-numeric and secondary cells
with data-meta. The host application supplies the native table markup.

## When not to use

Lay out a screen, show a short one-line list, or present the
name-value details of one record. Use CSS grid, ki-list or a description list.

## Examples

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
using `selectable`. The loader defines the checkbox when the table draws it.

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-table`: the default, only the tokens ki-table needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `density` ("compact" | "default", default 'default'): Row density. Default measures 48px and compact measures 40px at a 16px root on desktop.
- `loading` (boolean, default false): Makes the native table busy and adds a decorative loading row after the current records.
- `row-selection-label` (string, default 'Select {row}'): Accessible name template for each row checkbox. Include {row} for the row header or key.
- `select-all-label` (string, default 'Select all rows'): Accessible name for the bulk selection checkbox. Translate for the page language.
- `selectable` (boolean, default false): Adds a leading selection column with a checked, mixed or unchecked bulk control. Give each selectable body row a distinct, nonempty data-key. Register ki-checkbox alongside ki-table when using individual component imports.
- `sticky-header` (boolean, default false): Keeps the native column header in view inside a vertically constrained frame.

## Slots

- (default): One native light-DOM table with a caption, head and body. Use data-sort on sortable headers and data-key on each record available for selection.

## Parts

None.

## Events

- `ki-selection-change` (CustomEvent<KiTableSelectionDetail>): A person changes selection with a checkbox. The event supplies the selected data-key values in displayed order.
- `ki-sort` (CustomEvent<KiTableSortDetail>): A person activates a sortable column. Use the key and direction to sort records and move aria-sort to the active header. The event is a request.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-table-backdrop-filter`: Complete filter applied behind the frame. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-table-bg`: Table frame and caption surface. Default: `var(--ki-surface-s0)`.
- `--ki-table-bg-image`: Optional image layered over the table frame. Default: `var(--ki-surface-image-none)`.
- `--ki-table-border`: Frame and row dividers. Default: `var(--ki-outline-low-em)`.
- `--ki-table-border-width`: Frame and row divider stroke. Default: `var(--ki-layout-rule-width)`.
- `--ki-table-caption-font-family`: Typeface of the native table caption. Default: `var(--ki-typography-family-heading)`.
- `--ki-table-cell-padding-inline`: Horizontal space inside cells. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-table-fg`: Primary record and caption ink. Default: `var(--ki-text-high-em)`.
- `--ki-table-focus-radius`: Corner radius of the sort button focus ring. Default: `var(--ki-corner-inline)`.
- `--ki-table-focus-ring-color`: Keyboard focus outline ink. Default: `var(--ki-focus-ring-color)`.
- `--ki-table-focus-ring-offset`: Space between a focus outline and its control. Default: `var(--ki-focus-ring-offset)`.
- `--ki-table-focus-ring-width`: Keyboard focus outline stroke. Default: `var(--ki-focus-ring-width)`.
- `--ki-table-header-bg`: Column header surface, including when sticky. Default: `var(--ki-surface-s1)`.
- `--ki-table-header-bg-image`: Optional image layered over the column header. Default: `var(--ki-surface-image-none)`.
- `--ki-table-header-fg`: Column header ink. Default: `var(--ki-text-supporting)`.
- `--ki-table-header-height`: Column header row height. Default: `var(--ki-layout-spacing-12xl)`.
- `--ki-table-meta-fg`: Secondary and numeric value ink. Default: `var(--ki-text-supporting)`.
- `--ki-table-radius`: Outer frame corner radius. Default: `var(--ki-radius-component-lg)`.
- `--ki-table-row-height`: Default data row height. Default: `var(--ki-layout-spacing-14xl)`.
- `--ki-table-row-height-compact`: Compact data row height. Default: `var(--ki-layout-spacing-12xl)`.
- `--ki-table-row-hover-bg`: Surface under a record on hover. Default: `var(--ki-surface-s1)`.
- `--ki-table-row-hover-fg`: Record ink on hover. Default: `var(--ki-text-high-em)`.
- `--ki-table-row-selected-bg`: Surface under a selected record. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-table-row-selected-fg`: Record ink when selected. Default: `var(--ki-text-high-em)`.
- `--ki-table-skeleton`: Decorative loading bar fill. Default: `var(--ki-surface-s3)`.
- `--ki-table-skeleton-height`: Loading bar height. Default: `var(--ki-layout-spacing-lg)`.
- `--ki-table-skeleton-radius`: Loading bar corner radius. Default: `var(--ki-radius-round)`.
- `--ki-table-sort-gap`: Space between a column label and sort indicator. Default: `var(--ki-layout-spacing-xs)`.
- `--ki-table-sort-glyph-size`: Decorative sort indicator edge. Default: `var(--ki-layout-spacing-2xl)`.
- `--ki-table-touch-target-min`: Minimum width and height of controls with a coarse pointer. Default: `var(--ki-layout-spacing-13xl)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1. Default: `var(--ki-font-line-height-body-1)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold. Default: `var(--ki-font-weight-body-semibold)`.
