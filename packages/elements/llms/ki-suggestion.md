# ki-suggestion

> A native prompt button displayed by a ki-suggestions group.

## When to use

offer one short, actionable prompt in a suggestion group.

## When not to use

navigation, static content, or a submitted form value.

## Examples

# ki-suggestion examples

## Add context to a prompt

```html
<ki-suggestions label="Start a conversation" variant="cards">
  <ki-suggestion description="For the merged pull requests">Draft release notes</ki-suggestion>
  <ki-suggestion>Plan the next release</ki-suggestion>
</ki-suggestions>
```

Put the prompt in the default slot as plain text. The title supplies the
button's accessible name. Use `description` for separate context.

Register both tags for direct imports. Listen to `ki-select` on the group
for the chosen title.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-suggestion`: the default, only the tokens ki-suggestion needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `description` (string | undefined): Optional accessible description, visible below the title in cards.

## Slots

- (default): Plain text forming the visible and accessible prompt title.

## Parts

- `button`: The native suggestion button.
- `description`: Optional supporting text shown in cards.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-suggestion-backdrop-filter`: Filter behind the chip surface.
- `--ki-suggestion-bg`: Resting chip surface.
- `--ki-suggestion-bg-image`: Image layered over the chip surface.
- `--ki-suggestion-border`: Resting chip boundary.
- `--ki-suggestion-border-width`: Boundary width for either suggestion variant.
- `--ki-suggestion-card-description-fg`: Resting card description.
- `--ki-suggestion-card-gap`: Space between the card title and description.
- `--ki-suggestion-card-hover-description-fg`: Description over the card hover surface.
- `--ki-suggestion-card-pressed-description-fg`: Description over the pressed card surface.
- `--ki-suggestion-description-line-height`: Line height of the card description.
- `--ki-suggestion-description-size`: Type size of the card description.
- `--ki-suggestion-fg`: Resting chip title.
- `--ki-suggestion-font-family`: Typeface of the suggestion text.
- `--ki-suggestion-font-size`: Type size of the prompt title.
- `--ki-suggestion-height`: Minimum painted height of a chip.
- `--ki-suggestion-hover-bg`: Chip surface on a hovering device.
- `--ki-suggestion-hover-fg`: Title over the chip hover surface.
- `--ki-suggestion-inset`: Inline padding for either variant.
- `--ki-suggestion-line-height`: Line height of the prompt title.
- `--ki-suggestion-pressed-bg`: Chip surface while a pointer or key holds activation.
- `--ki-suggestion-pressed-fg`: Title over the pressed chip surface.
- `--ki-suggestion-radius`: Rounded outline of a chip.
- `--ki-suggestion-weight`: Weight of chip titles and card descriptions.
