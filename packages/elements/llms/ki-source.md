# ki-source

> Declares one named web source for a `ki-sources` list.

## When to use

As a direct child of `ki-sources`. In HTML provide an `id`,
`href` and `title`; in guarded specs provide `source-id`, `href` and
`title`. Use the same identifier on any citation of the source.

## When not to use

For standalone links outside a source list; use `ki-link`.

## Examples

# Using ki-source

Declare a source directly inside the default slot of `ki-sources`.

```html
<ki-sources open>
  <ki-source id="methods" href="/methods" title="Study design" snippet="How the study ran."></ki-source>
</ki-sources>
```

Use a unique identifier in the current document or shadow root. In a
guarded spec, use the `source-id` prop instead of the native `id`. The
disclosure displays the hostname from the resolved URL.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-source`: the default, only the tokens ki-source needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `href` (string, required, URL): Source destination. Accepts HTTP(S) URLs and relative web references. The source list shows the resolved hostname.
- `snippet` (string | undefined): Optional plain-text excerpt displayed in the source card.
- `source-id` (string | undefined): Source identifier in this document or shadow root. Overrides the native HTML `id` when set. Use this value in guarded specs and in citation refs.
- `title` (string, required): Required plain-text source title. In HTML use the `title` attribute.

## Slots

None.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
