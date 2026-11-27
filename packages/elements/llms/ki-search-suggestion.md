# ki-search-suggestion

> Declarative search suggestion or recent query rendered by its owning ki-search.

## When to use

supply one suggested or recent query as a direct ki-search child.

## When not to use

standalone display, form options or arbitrary results content.
Use the results slot of ki-search for independently rendered results.

## Examples

# Search suggestion examples

```html
<ki-search label="Search components">
  <ki-search-suggestion value="ki-dialog" description="Component">Dialog</ki-search-suggestion>
  <ki-search-suggestion recent>button tokens</ki-search-suggestion>
</ki-search>
```

The child text is the title. When `value` is omitted, that title supplies the
query. Use `recent` for a removable history item.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-search-suggestion`: the default, only the tokens ki-search-suggestion needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `description` (string | undefined): Optional supporting text displayed below the title.
- `recent` (boolean, default false): Display in the removable recent-search group.
- `value` (string | undefined): Query to run. When omitted, the trimmed title is used.

## Slots

- (default): Plain text title displayed in the owning search view.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-search-suggestion-font-family`: Inherited body typeface on the declarative suggestion host. Default: `var(--ki-typography-family-body)`.
