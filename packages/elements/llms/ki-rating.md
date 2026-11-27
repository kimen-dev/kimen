# ki-rating

> Displays a score or collects one choice on a small rating scale.

## When to use

Show an average review score in readonly mode or ask people to rate
an answer, experience, or product on a small scale.

## When not to use

Use message actions for yes/no feedback and a slider for a
continuous or large numeric range.

## Examples

# Rating usage

## Display a review average

```html
<ki-rating readonly label="Average review score" value="4.3"></ki-rating>
```

The text reads 4.3. The glyphs fill to 4.5 and assistive technology receives one image named “Rated 4.3 out of 5”.

## Collect answer feedback

```html
<form>
  <ki-rating
    label="How useful was this answer?"
    name="usefulness"
    precision="0.5"
    required
  ></ki-rating>
  <button>Submit feedback</button>
</form>
```

A choice of 2.5 submits as `usefulness=2.5`. A form reset restores the starting value. Subscribe to `ki-change` for a user's changed choice and read its numeric `detail.value`.

## Use a different glyph

```js
import '@kimen/elements/icons/heart';
```

```html
<ki-rating
  label="How much did you enjoy the experience?"
  icon-name="heart"
  option-singular-label="{value} heart"
  option-label="{value} hearts"
></ki-rating>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-rating`: the default, only the tokens ki-rating needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `disabled` (boolean, default false): Makes an editable rating unavailable and excludes it from form submission.
- `icon-name` (string, default 'star'): Lucide icon name. Import custom names before mounting. Unavailable names use star.
- `label` (string, required): Visible question in input mode and accessible context in read-only mode. Always supply it.
- `max` (number, default 5, minimum 1, maximum 10): Highest score and number of glyphs. Use a whole number from 1 to 10.
- `name` (string | undefined): Form field name for a selected editable score.
- `option-label` (string, default '{value} stars'): Accessible name pattern for the other choices. Use {value} for the choice.
- `option-singular-label` (string, default '{value} star'): Accessible name pattern for the one-star choice. Use {value} for the choice.
- `precision` (number, default 1): Choose 1 for whole steps or 0.5 for half steps. Other inputs use whole steps.
- `rated-label` (string, default 'Rated {value} out of {max}'): Accessible name pattern for the read-only image. Use {value} and {max} for the scores.
- `readonly` (boolean, default false): Displays a score without editing or submitting it.
- `required` (boolean, default false): Requires an editable score before the form can be submitted.
- `required-message` (string, default 'Select a rating.'): Validation message for an unanswered required rating.
- `score-label` (string, default '{value} of {max}'): Visible score pattern in input mode. Use {value} and {max} for the scores.
- `value` (number, default 0, minimum 0, maximum 10): Current score. Zero means unanswered in input mode. Editable scores use the nearest allowed step. Read-only scores retain their decimal precision.

## Slots

None.

## Parts

- `choice`: Native radio target for one selectable score.
- `glyph`: Decorative artwork for one rating step.
- `label`: Visible question above the editable scale.
- `scale`: Read-only score image or editable radio group.
- `score`: Visible numeric score.

## Events

- `ki-change` (CustomEvent<{ value: number }>): Fires once when a person changes the selection. The detail contains the numeric value.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-rating-disabled-fg`: Glyph ink while the rating is unavailable.
- `--ki-rating-gap`: Space between rating glyphs or targets.
- `--ki-rating-hover-backdrop-filter`: Complete backdrop filter for the hovered choice.
- `--ki-rating-hover-bg`: Surface of the choice under the pointer.
- `--ki-rating-hover-bg-image`: Optional image over the hovered choice surface.
- `--ki-rating-label-bg`: Backdrop of the visible question.
- `--ki-rating-label-fg`: Ink of the visible question.
- `--ki-rating-label-gap`: Space between the question and scale.
- `--ki-rating-off-bg`: Backdrop of an outlined glyph.
- `--ki-rating-off-fg`: Ink of an outlined glyph.
- `--ki-rating-on-bg`: Backdrop of a filled glyph.
- `--ki-rating-on-fg`: Ink of a filled glyph.
- `--ki-rating-score-bg`: Backdrop of the visible score.
- `--ki-rating-score-fg`: Ink of the visible score.
- `--ki-rating-score-gap`: Space between the glyphs and visible score.
- `--ki-rating-size`: Size of a rating glyph.
- `--ki-rating-target-radius`: Corners of the interactive target.
- `--ki-rating-target-size`: Default whole-step target size.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
