# ki-pagination

> Controls for moving among pages of results or appending the next batch.

## When to use

paged tables, search results or long lists. Use compact for
a previous/next stepper and load-more to append results in place.

## When not to use

short lists that fit in one view or the steps of a task.

## Examples

# Pagination examples

Import `@kimen/tokens/css/core` and `@kimen/tokens/css/ki-pagination`, and
register the element with `defineCustomElement` from
`@kimen/elements/components/ki-pagination.js`.

## Replace a results page

```html
<h2 id="results-heading" tabindex="-1">Results page 1</h2>
<ul id="results"><li>Mercury</li><li>Venus</li></ul>
<ki-pagination id="results-pages" page="1" pages="2" label="Planet results pages"></ki-pagination>

<script type="module">
  const pages = [['Mercury', 'Venus'], ['Earth', 'Mars']];
  const pager = document.getElementById('results-pages');
  const heading = document.getElementById('results-heading');
  const results = document.getElementById('results');

  pager.addEventListener('ki-page-change', ({ detail: { page } }) => {
    const items = pages[page - 1].map((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    });
    results.replaceChildren(...items);
    heading.textContent = `Results page ${page}`;
    pager.page = page;
    heading.focus();
  });
</script>
```

When fetching asynchronously, update `page` and move focus after the
requested results render. Keep the heading programmatically focusable.

## Let the server render each page

```html
<ki-pagination page="5" pages="12" href-template="?page={page}"
  label="Search results pages"></ki-pagination>
```

Place `{page}` in the path, query, or fragment of a relative or HTTP(S) URL.
The generated anchors support browser link actions. The catalog applies
its URL policy. For a guarded page action, use numbered or compact pagination
in button mode.

## Append results and announce the count

```html
<ul id="recent-results"><li>Mercury</li><li>Venus</li></ul>
<ki-pagination id="recent-pagination" variant="load-more" shown="2" total="4"
  label="More planets"></ki-pagination>

<script type="module">
  const pager = document.getElementById('recent-pagination');
  const results = document.getElementById('recent-results');

  pager.addEventListener('ki-load-more', () => {
    const items = ['Earth', 'Mars'].map((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    });
    results.append(...items);
    pager.shown = results.childElementCount;
  });
</script>
```

The last update keeps the same button in place and announces the final
count. Set `previous-label`, `next-label`, and `load-more-label` for
translated controls. Use `page-label`, `compact-label`, and `status-label`
with the named placeholders to translate the generated text.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-pagination`: the default, only the tokens ki-pagination needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `boundaries` (number, default 1, minimum 0, maximum 10): Number of pages to display at each end of the numbered list.
- `compact-label` (string, default 'Page {page} of {pages}'): Localized stepper label template. Include {page} and {pages}.
- `href-template` (string | undefined, URL): Relative or HTTP(S) URL template for native navigation. Place {page} in the path, query or fragment, for example "?page={page}".
- `label` (string, default 'Pagination'): Accessible name of the navigation landmark. Distinguish multiple result sets.
- `load-more-label` (string, default 'Load more'): Localized visible label for the button that appends results.
- `next-label` (string, default 'Next page'): Localized accessible name of the control that requests the next page.
- `page` (number, default 1, minimum 1): Current 1-based page. Update it when the requested results are ready.
- `page-label` (string, default 'Page {page}'): Localized accessible name template for numbered controls. Include {page}.
- `pages` (number | undefined, minimum 0): Total number of result pages. Omit it until a page count is available.
- `previous-label` (string, default 'Previous page'): Localized accessible name of the control that requests the previous page.
- `shown` (number | undefined, minimum 0): Displayed result count in load-more mode. Update it after appending results.
- `siblings` (number, default 1, minimum 0, maximum 10): Number of pages to display on each side of the current page.
- `status-label` (string, default 'Showing {shown} of {total} results'): Localized polite count template. Include {shown} and {total}.
- `total` (number | undefined, minimum 0): Total result count in load-more mode. Required with shown for the count.
- `variant` ("compact" | "load-more" | "pages", default 'pages'): Numbered pages, a previous/next stepper, or a button to append results. Numbered pages switch to the stepper below 480 CSS pixels of available width.

## Slots

None.

## Parts

- `compact`: Current page and page count in the stepper.
- `gap`: Decorative marker for omitted pages.
- `list`: Ordered list of pages in the numbered variant.
- `load-more`: Button that requests another batch.
- `navigation`: Named navigation landmark.
- `next`: Next-page control.
- `page`: Numbered button or link.
- `previous`: Previous-page control.
- `status`: Polite result-count announcement.

## Events

- `ki-load-more` (CustomEvent<void>): Requests another batch. Append results in place and update shown.
- `ki-page-change` (CustomEvent<{
    page: number;
  }>): Requests a different page. Update results and move focus to their heading when they are ready. Cancelling the event also cancels a plain link click.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-pagination-compact-gap`: Gap between the compact count and direction controls. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-pagination-current-bg`: Background of the current page control. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-pagination-current-fg`: Ink for the current page control. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-pagination-gap`: Gap between numbered page controls. Default: `var(--ki-layout-spacing-xs)`.
- `--ki-pagination-item-backdrop-filter`: Complete backdrop filter for the page control. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-pagination-item-bg`: Resting background of a numbered page control. Default: `var(--ki-surface-transparent)`.
- `--ki-pagination-item-bg-image`: Optional image above the page control background color. Default: `var(--ki-surface-image-none)`.
- `--ki-pagination-item-fg`: Resting ink for page labels and status text. Default: `var(--ki-text-supporting)`.
- `--ki-pagination-item-hover-bg`: Background of a hovered page control. Default: `var(--ki-surface-s2)`.
- `--ki-pagination-item-hover-fg`: Ink for a hovered page control. Default: `var(--ki-text-high-em)`.
- `--ki-pagination-item-radius`: Corner radius of numbered page controls and direction links. Default: `var(--ki-radius-component-sm)`.
- `--ki-pagination-item-size`: Minimum size of a numbered page control at standard density. Default: `var(--ki-layout-spacing-12xl)`.
- `--ki-pagination-more-gap`: Gap between the load-more button and the count. Default: `var(--ki-layout-spacing-md)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
