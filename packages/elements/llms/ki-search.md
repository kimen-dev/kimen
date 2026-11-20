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

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-glyph-size-md`: Medium glyph for body content (20px at the default root size).
- `--ki-layout-spacing-3xl`: The 3xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-sm`: The sm spacing step for a stack or grid gap.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-search-bar-backdrop-filter`: Complete backdrop filter for the bar.
- `--ki-search-bar-bg`: Fill of the collapsed and docked bar.
- `--ki-search-bar-bg-image`: Optional image painted over the bar fill.
- `--ki-search-bar-fg`: Query ink over the search bar.
- `--ki-search-bar-height`: Minimum height of the search bar, 56px at the default root size.
- `--ki-search-bar-placeholder`: Placeholder ink exposed by the Search API.
- `--ki-search-bar-placeholder-fg`: Default contrast pair for placeholder text over the search bar.
- `--ki-search-bar-radius`: Pill corner of the collapsed and docked bar.
- `--ki-search-control-size`: Base size of actions and minimum height of search rows.
- `--ki-search-group-heading-family`: Font family for the recent-query group heading.
- `--ki-search-input-touch-size`: Minimum input font size on coarse pointers to avoid focus zoom.
- `--ki-search-option-active-bg`: Fill of the focused or hovered suggestion.
- `--ki-search-option-active-fg`: Ink of the focused or hovered suggestion.
- `--ki-search-option-active-supporting-fg`: Description ink on the focused or hovered suggestion.
- `--ki-search-view-backdrop-filter`: Complete backdrop filter for the search view.
- `--ki-search-view-bg`: Raised fill of the docked and full-screen view.
- `--ki-search-view-bg-image`: Optional image painted over the view fill.
- `--ki-search-view-divider`: Divider separating the active field and full-screen results.
- `--ki-search-view-fg`: Ink over the search view.
- `--ki-search-view-radius`: Corner for the docked view.
- `--ki-search-view-shadow`: Resting elevation of the docked view.
- `--ki-search-view-supporting-fg`: Ink for descriptions and the recent-search group label.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
- `--ki-typography-weight-body-bold`: semantic font weight for typography weight body bold.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
