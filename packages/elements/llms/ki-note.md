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

[Boolean attributes](boolean-attributes.md).

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

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-note-backdrop-filter`: Complete filter behind the note.
- `--ki-note-bg`: Background of a neutral note.
- `--ki-note-bg-image`: Optional image over the note's solid background.
- `--ki-note-danger-bg`: Background of a danger note.
- `--ki-note-danger-fg`: Text ink of a danger note.
- `--ki-note-danger-icon`: Decorative icon ink of a danger note.
- `--ki-note-fg`: Text ink of a neutral note.
- `--ki-note-font-family`: Note text font family.
- `--ki-note-font-size`: Medium note text size.
- `--ki-note-gap`: Space between the icon and the text.
- `--ki-note-icon`: Decorative icon ink of a neutral note.
- `--ki-note-icon-offset`: Medium icon offset from the first line's block start.
- `--ki-note-icon-size`: Medium note icon size.
- `--ki-note-info-bg`: Background of an info note.
- `--ki-note-info-fg`: Text ink of an info note.
- `--ki-note-info-icon`: Decorative icon ink of an info note.
- `--ki-note-line-height`: Medium note text line height.
- `--ki-note-padding-block`: Medium note block padding.
- `--ki-note-padding-inline`: Medium note inline padding.
- `--ki-note-primary-bg`: Background of a primary note.
- `--ki-note-primary-fg`: Text ink of a primary note.
- `--ki-note-primary-icon`: Decorative icon ink of a primary note.
- `--ki-note-radius`: Note surface corner radius.
- `--ki-note-sm-font-size`: Small note caption size.
- `--ki-note-sm-icon-offset`: Small icon offset from the first line's block start.
- `--ki-note-sm-icon-size`: Small note icon size.
- `--ki-note-sm-line-height`: Small note caption line height.
- `--ki-note-sm-padding-block`: Small note block padding.
- `--ki-note-sm-padding-inline`: Small note inline padding.
- `--ki-note-success-bg`: Background of a success note.
- `--ki-note-success-fg`: Text ink of a success note.
- `--ki-note-success-icon`: Decorative icon ink of a success note.
- `--ki-note-warning-bg`: Background of a warning note.
- `--ki-note-warning-fg`: Text ink of a warning note.
- `--ki-note-warning-icon`: Decorative icon ink of a warning note.
