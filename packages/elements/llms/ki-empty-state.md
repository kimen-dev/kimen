# ki-empty-state

> A short explanation and next step for an empty view.

## When to use

explain an empty list, table, search result, or first-run view.
Supply a localized heading that names what is empty and a short next step.
Use announce for results that change after an interaction.

## When not to use

signal that results are loading or draw attention to an error
that needs acknowledgement. Use ki-spinner or ki-alert for those states.

## Examples

Use EmptyState when a list, table or first-run screen is empty. Name what is
empty, explain why or what to do next, and offer at most one primary action.

```ts
import '@kimen/elements/icons/folder-plus';
```

```html
<ki-empty-state heading="No projects yet" icon-name="folder-plus" tone="primary-light">
  Projects hold your surfaces, catalogs and themes.
  <ki-button slot="actions" variant="primary">New project</ki-button>
</ki-empty-state>
```

Use `announce` for search or filter results. Insert the message when results
become empty. If it remains visible for a subsequent search, update its heading
and description.

```html
<ki-empty-state heading="No results for webhok" heading-level="2" size="sm" announce>
  Check the spelling or remove a filter.
  <ki-button slot="actions" variant="secondary">Clear filters</ki-button>
</ki-empty-state>
```

Put a decorative illustration in `media` to replace the icon.

```html
<ki-empty-state heading="Your inbox is clear">
  <img slot="media" src="/images/empty-inbox.svg" alt="" width="120" height="80">
  New messages will appear here.
</ki-empty-state>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-empty-state`: the default, only the tokens ki-empty-state needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `announce` (boolean, default false): Put the heading and description in a polite status, with actions outside the region. Set before mounting a message that reports changed results.
- `heading` (string, required): Localized heading that identifies the empty view. Blank text omits the heading.
- `heading-level` (number, default 3, minimum 2, maximum 6): Native heading level for the surrounding document outline. Only integers from 2 through 6 are valid; unsupported values use level 3.
- `icon-name` (string | undefined): Optional decorative Lucide glyph. Register it with a per-icon import before mounting. A supplied illustration takes precedence.
- `size` ("md" | "sm", default 'md'): Use small inside a table or narrow panel. Unrecognized sizes use the medium layout.
- `tone` ("danger" | "info" | "neutral" | "primary" | "primary-light" | "success" | "warning", default 'neutral'): FeatureIcon tone. Unrecognized tones use the neutral tile.

## Slots

- (default): Localized supporting text with a reason or recovery advice.
- `actions`: Optional controls for the next step, with at most one primary action. In a guarded surface, bind actions to these controls.
- `media`: Optional decorative illustration in place of the icon. Use an image with empty alt text or a decorative SVG. Keep this slot free of controls.

## Parts

- `actions`: Wrapping row of consumer-supplied controls.
- `container`: Centered layout for the illustration, message and actions.
- `description`: Wrapper for the default slot.
- `heading`: Native heading at the selected document level.
- `media`: Decorative illustration or FeatureIcon tile.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-empty-state-backdrop-filter`: Complete filter applied behind the empty view.
- `--ki-empty-state-bg`: Background behind the empty view.
- `--ki-empty-state-bg-image`: Optional image above the background color.
- `--ki-empty-state-description-bg`: Background layer behind the supporting copy.
- `--ki-empty-state-description-fg`: Supporting text ink, strengthened in contrast-more mode.
- `--ki-empty-state-description-line-height`: Line height of the supporting copy.
- `--ki-empty-state-description-size`: Font size of the supporting copy.
- `--ki-empty-state-fg`: Foreground ink for the heading.
- `--ki-empty-state-gap`: Gap between the decorative media, message and action row.
- `--ki-empty-state-gap-sm`: Gap between regions in a compact empty view.
- `--ki-empty-state-heading-font-family`: Typeface for the native heading.
- `--ki-empty-state-heading-line-height`: Heading line height in a regular empty view.
- `--ki-empty-state-heading-line-height-sm`: Heading line height in a compact empty view.
- `--ki-empty-state-heading-size`: Heading font size in a regular empty view.
- `--ki-empty-state-heading-size-sm`: Heading font size in a compact empty view.
- `--ki-empty-state-heading-weight`: Weight of the heading.
- `--ki-empty-state-max-width`: Maximum inline size of the centered content.
- `--ki-empty-state-tile-danger-bg`: Background of the danger decorative tile.
- `--ki-empty-state-tile-danger-fg`: Glyph ink on the danger decorative tile.
- `--ki-empty-state-tile-info-bg`: Background of the info decorative tile.
- `--ki-empty-state-tile-info-fg`: Glyph ink on the info decorative tile.
- `--ki-empty-state-tile-neutral-bg`: Background of the neutral decorative tile.
- `--ki-empty-state-tile-neutral-fg`: Glyph ink on the neutral decorative tile.
- `--ki-empty-state-tile-primary-bg`: Background of the primary decorative tile.
- `--ki-empty-state-tile-primary-fg`: Glyph ink on the primary decorative tile.
- `--ki-empty-state-tile-primary-light-bg`: Background of the primary-light decorative tile.
- `--ki-empty-state-tile-primary-light-fg`: Glyph ink on the primary-light decorative tile.
- `--ki-empty-state-tile-radius`: Corner radius of the regular fallback tile.
- `--ki-empty-state-tile-radius-sm`: Corner radius of the compact fallback tile.
- `--ki-empty-state-tile-size`: Regular FeatureIcon fallback tile size.
- `--ki-empty-state-tile-size-sm`: Compact FeatureIcon fallback tile size.
- `--ki-empty-state-tile-success-bg`: Background of the success decorative tile.
- `--ki-empty-state-tile-success-fg`: Glyph ink on the success decorative tile.
- `--ki-empty-state-tile-warning-bg`: Background of the warning decorative tile.
- `--ki-empty-state-tile-warning-fg`: Glyph ink on the warning decorative tile.
- `--ki-typography-family-body`: semantic font family for typography family body.
