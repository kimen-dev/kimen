# ki-note

> A compact, static explanation beside a control or inside a card.

## When to use

Add a short constraint, tip or consequence next to the content
it explains. Put the consequence first when warning the reader.

## When not to use

For updates that must be announced, use ki-alert. Use Toast
for transient confirmations and the field's help-text for field guidance.

## Examples

# ki-note usage

Place one or two lines of static context beside a control or inside a card.
Use `ki-alert` for results that need announcing, Toast for transient
confirmations and the field's `help-text` for field guidance.

```html
<ki-note>Only workspace owners can change billing details.</ki-note>
<ki-note tone="warning" size="sm">Changing the slug breaks existing links.</ki-note>
<ki-note tone="info" icon="false">This link is visible to everyone in the workspace.</ki-note>
```

## Decorative icon replacement

```html
<ki-note tone="info">
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 3v18M3 12h18"></path>
  </svg>
  Adding a billing contact gives them access to invoices.
</ki-note>
```

The words convey the message by themselves. The decorative icon is hidden
from assistive technology and adds no tab stop. Start warnings with the
consequence.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-note`: the default, only the tokens ki-note needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `icon` (boolean, default true): Shows the decorative icon. Set icon="false" in HTML to hide it.
- `size` ("md" | "sm", default 'md'): Uses caption text at sm and body text at md. Unknown values use md.
- `tone` ("danger" | "info" | "neutral" | "primary" | "success" | "warning", default 'neutral'): Selects the background tint and decorative icon. Unknown values use neutral.

## Slots

- (default): Short explanatory text that carries the full meaning.
- `icon`: A decorative glyph that replaces the tone's built-in icon.

## Parts

- `icon`: The decorative icon frame.
- `message`: The explanatory text.
- `note`: The surface, including the tint, typography and spacing.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-note-backdrop-filter`: Complete filter behind the note. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-note-bg`: Background of a neutral note. Default: `var(--ki-surface-s2)`.
- `--ki-note-bg-image`: Optional image over the note's solid background. Default: `var(--ki-surface-image-none)`.
- `--ki-note-danger-bg`: Background of a danger note. Default: `var(--ki-surface-danger-tint)`.
- `--ki-note-danger-fg`: Text ink of a danger note. Default: `var(--ki-text-high-em)`.
- `--ki-note-danger-icon`: Decorative icon ink of a danger note. Default: `var(--ki-text-danger-high-em)`.
- `--ki-note-fg`: Text ink of a neutral note. Default: `var(--ki-text-high-em)`.
- `--ki-note-font-family`: Note text font family. Default: `var(--ki-typography-family-body)`.
- `--ki-note-font-size`: Medium note text size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-note-gap`: Space between the icon and the text. Default: `var(--ki-space-md)`.
- `--ki-note-icon`: Decorative icon ink of a neutral note. Default: `var(--ki-text-med-em)`.
- `--ki-note-icon-offset`: Medium icon offset from the first line's block start. Default: `var(--ki-space-xxs)`.
- `--ki-note-icon-size`: Medium note icon size. Default: `var(--ki-space-3xl)`.
- `--ki-note-info-bg`: Background of an info note. Default: `var(--ki-surface-info-tint)`.
- `--ki-note-info-fg`: Text ink of an info note. Default: `var(--ki-text-high-em)`.
- `--ki-note-info-icon`: Decorative icon ink of an info note. Default: `var(--ki-text-info-high-em)`.
- `--ki-note-line-height`: Medium note text line height. Default: `var(--ki-typography-line-height-para)`.
- `--ki-note-padding-block`: Medium note block padding. Default: `var(--ki-space-md)`.
- `--ki-note-padding-inline`: Medium note inline padding. Default: `var(--ki-space-xl)`.
- `--ki-note-primary-bg`: Background of a primary note. Default: `var(--ki-surface-primary-tint)`.
- `--ki-note-primary-fg`: Text ink of a primary note. Default: `var(--ki-text-high-em)`.
- `--ki-note-primary-icon`: Decorative icon ink of a primary note. Default: `var(--ki-text-primary-high-em)`.
- `--ki-note-radius`: Note surface corner radius. Default: `var(--ki-radius-component-md)`.
- `--ki-note-sm-font-size`: Small note caption size. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-note-sm-icon-offset`: Small icon offset from the first line's block start. Default: `var(--ki-size-border-hairline)`.
- `--ki-note-sm-icon-size`: Small note icon size. Default: `var(--ki-space-2xl)`.
- `--ki-note-sm-line-height`: Small note caption line height. Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-note-sm-padding-block`: Small note block padding. Default: `var(--ki-space-xs)`.
- `--ki-note-sm-padding-inline`: Small note inline padding. Default: `var(--ki-space-md)`.
- `--ki-note-success-bg`: Background of a success note. Default: `var(--ki-surface-success-tint)`.
- `--ki-note-success-fg`: Text ink of a success note. Default: `var(--ki-text-high-em)`.
- `--ki-note-success-icon`: Decorative icon ink of a success note. Default: `var(--ki-text-success-high-em)`.
- `--ki-note-warning-bg`: Background of a warning note. Default: `var(--ki-surface-warning-tint)`.
- `--ki-note-warning-fg`: Text ink of a warning note. Default: `var(--ki-text-high-em)`.
- `--ki-note-warning-icon`: Decorative icon ink of a warning note. Default: `var(--ki-text-warning-high-em)`.
