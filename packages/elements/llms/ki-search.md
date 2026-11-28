# ki-search

> A query field with a responsive view for suggestions, recent searches and results.

## When to use

accept free-text searches and let the user run a typed or suggested
query. Listen for ki-input to update suggestions, and ki-search to render results.

## When not to use

selecting one value from a fixed set belongs in ki-select.
Use ki-input when a plain search field is enough.

## Examples

# Search examples

```html
<ki-search label="Search Kimen" placeholder="Search Kimen" name="q">
  <ki-search-suggestion value="ki-dialog" description="Component">
    Dialog
  </ki-search-suggestion>
  <ki-search-suggestion recent>button tokens</ki-search-suggestion>
  <section slot="results" aria-label="Results"></section>
</ki-search>
```

```js
const search = document.querySelector('ki-search');

search.addEventListener('ki-input', ({ detail }) => {
  // Load suggestions for detail.value and update the direct children.
});

search.addEventListener('ki-search', ({ detail }) => {
  search.querySelector('[slot="results"]').textContent = `Query: ${detail.value}`;
});
```

Use `ki-clear` to clear host-rendered content and `ki-remove-recent` to
update saved history. Set `loading` during a request. The results slot stays
visible while suggestions load. To offer voice search, supply a button
with an accessible name in the trailing slot and handle its activation.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-search`: the default, only the tokens ki-search needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `back-label` (string, default 'Back'): Accessible name of the full-screen Back button.
- `clear-label` (string, default 'Clear search'): Accessible name of the query clear button.
- `highlight` (boolean, default true): Emphasize literal, case-insensitive matches in suggestion titles.
- `label` (string, default 'Search'): Accessible name of the search landmark, input and full-screen dialog.
- `loading` (boolean, default false): Show a loading indicator while the host fetches suggestions.
- `loading-label` (string, default 'Loading suggestions'): Accessible name of the loading indicator.
- `mode` ("auto" | "docked" | "fullscreen", default 'auto'): View presentation. Auto uses a full-screen dialog below 600 CSS pixels.
- `name` (string | undefined): Name under which the current query is included in form data.
- `open` (boolean, default false): Whether the search view is open. The field opens it on focus, click or input.
- `placeholder` (string, default ''): Optional hint displayed inside the empty search field.
- `recent-label` (string, default 'Recent searches'): Visible and accessible name of the recent-search group.
- `remove-recent-label` (string, default 'Remove {value}'): Accessible name template for recent-query removal. Use {value} for the query title.
- `suggestion-count-plural` (string, default '{count} suggestions'): Polite announcement for zero or multiple suggestions. Use {count} for the number.
- `suggestion-count-singular` (string, default '1 suggestion'): Polite announcement when the list contains one suggestion.
- `suggestions-label` (string, default 'Suggestions'): Accessible name of the suggestion listbox.
- `value` (string, default ''): Current query. Edits and selected suggestions update this property.

## Slots

- (default): Direct ki-search-suggestion children supply suggestion and recent-query data.
- `leading`: A control or decorative icon at the start of the collapsed or docked bar.
- `results`: Host-rendered results beneath suggestions and recent searches.
- `trailing`: A control or avatar at the end of the collapsed or docked bar. Supply a labelled button here to surface voice search.

## Parts

- `bar`: Collapsed and docked search bar.
- `dialog-bar`: Search bar inside the full-screen view.
- `input`: Native query input in each presentation.
- `option`: A selectable suggestion in the listbox.
- `recent`: Labelled group of recent searches.
- `results`: Container around host-rendered results.
- `view`: Docked popover or full-screen dialog surface.

## Events

- `ki-clear` (CustomEvent<void>): The user cleared the query with the clear control or with Escape.
- `ki-input` (CustomEvent<KiSearchValueDetail>): The current query after 200 ms of inactivity following an edit.
- `ki-remove-recent` (CustomEvent<KiSearchValueDetail>): The removed recent query. Hosts can use this to persist the updated history.
- `ki-search` (CustomEvent<KiSearchValueDetail>): The query to run, emitted on Enter or activation of a suggestion or recent search.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-glyph-size-md`: Medium glyph for body content (20px at the default root size). Default: `var(--ki-space-5xl)`.
- `--ki-layout-spacing-3xl`: The 3xl spacing step for a stack or grid gap. Default: `var(--ki-space-3xl)`.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap. Default: `var(--ki-space-md)`.
- `--ki-layout-spacing-sm`: The sm spacing step for a stack or grid gap. Default: `var(--ki-space-sm)`.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap. Default: `var(--ki-space-xl)`.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap. Default: `var(--ki-space-xs)`.
- `--ki-search-bar-backdrop-filter`: Complete backdrop filter for the bar. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-search-bar-bg`: Fill of the collapsed and docked bar. Default: `var(--ki-surface-s2)`.
- `--ki-search-bar-bg-image`: Optional image painted over the bar fill. Default: `var(--ki-surface-image-none)`.
- `--ki-search-bar-fg`: Query ink over the search bar. Default: `var(--ki-text-high-em)`.
- `--ki-search-bar-height`: Minimum height of the search bar, 56px at the default root size. Default: `var(--ki-layout-spacing-16xl)`.
- `--ki-search-bar-placeholder`: Placeholder ink exposed by the Search API. Default: `var(--ki-text-supporting)`.
- `--ki-search-bar-placeholder-fg`: Default contrast pair for placeholder text over the search bar. Default: `var(--ki-text-supporting)`.
- `--ki-search-bar-radius`: Pill corner of the collapsed and docked bar. Default: `var(--ki-corner-search-bar)`.
- `--ki-search-control-size`: Base size of actions and minimum height of search rows. Default: `var(--ki-layout-spacing-13xl)`.
- `--ki-search-group-heading-family`: Font family for the recent-query group heading. Default: `var(--ki-typography-family-heading)`.
- `--ki-search-input-touch-size`: Minimum input font size on coarse pointers to avoid focus zoom. Default: `var(--ki-layout-spacing-3xl)`.
- `--ki-search-option-active-bg`: Fill of the focused or hovered suggestion. Default: `var(--ki-surface-s2)`.
- `--ki-search-option-active-fg`: Ink of the focused or hovered suggestion. Default: `var(--ki-text-high-em)`.
- `--ki-search-option-active-supporting-fg`: Description ink on the focused or hovered suggestion. Default: `var(--ki-text-supporting)`.
- `--ki-search-view-backdrop-filter`: Complete backdrop filter for the search view. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-search-view-bg`: Raised fill of the docked and full-screen view. Default: `var(--ki-surface-s1)`.
- `--ki-search-view-bg-image`: Optional image painted over the view fill. Default: `var(--ki-surface-image-none)`.
- `--ki-search-view-divider`: Divider separating the active field and full-screen results. Default: `var(--ki-outline-low-em)`.
- `--ki-search-view-fg`: Ink over the search view. Default: `var(--ki-text-high-em)`.
- `--ki-search-view-radius`: Corner for the docked view. Default: `var(--ki-corner-search-view)`.
- `--ki-search-view-shadow`: Resting elevation of the docked view. Default: `var(--ki-elevation-e3)`.
- `--ki-search-view-supporting-fg`: Ink for descriptions and the recent-search group label. Default: `var(--ki-text-supporting)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2. Default: `var(--ki-font-size-body-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
- `--ki-typography-weight-body-bold`: semantic font weight for typography weight body bold. Default: `var(--ki-font-weight-body-bold)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
