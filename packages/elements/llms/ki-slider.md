# ki-slider

> Adjusts a value or an interval on a bounded scale.

## When to use

coarse adjustments such as volume, balance or a price filter,
with a descriptive label.

## When not to use

when people need to enter exact numbers or choose among a
few named options. Use a number input or radio group for those tasks.

## Examples

# Slider examples

Import the element, the token core and the slider's token sheet before
mounting the examples.

```js
import '@kimen/tokens/css/core';
import '@kimen/tokens/css/ki-slider';
import { defineCustomElement } from '@kimen/elements/ki-slider';

defineCustomElement();
```

```html
<form>
  <ki-slider label="Volume" name="volume" help-text="Playback level"
    min="0" max="100" step="1" value="60" marks="5" format="percent"></ki-slider>
  <ki-slider label="Price per night" name="price" range
    value="20,80" format="currency" currency="EUR"></ki-slider>
  <button type="reset">Reset</button>
</form>

<ki-slider label="Exposure" centered min="-50" max="50" value="-20"></ki-slider>
<ki-slider label="Bass" orientation="vertical" max="10" value="4"></ki-slider>
```

A named slider contributes one form entry. The form above starts with
`volume=60` and `price=20,80`. Range values always run from lower to upper.
The closest `lang` controls the display format. Localize the thumb suffixes
through `minimum-label` and `maximum-label`.

```js
const volume = document.querySelector('ki-slider[name="volume"]');
volume.addEventListener('input', () => previewVolume(volume.value));
volume.addEventListener('change', () => saveVolume(volume.value));
```

The neutral catalog exposes the `change` action event. Bind it to a declared
action to receive the current value on commit.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-slider`: the default, only the tokens ki-slider needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `centered` (boolean, default false): Shows a midpoint tick and fills from that point to a single thumb.
- `currency` (string, default 'EUR'): ISO 4217 code used with currency format.
- `disabled` (boolean, default false): Makes the slider unavailable for pointer, keyboard and form submission.
- `format` ("currency" | "number" | "percent", default 'number'): Display format for the readout and accessible values.
- `help-text` (string | undefined): Optional supporting text, read as the description of each thumb.
- `label` (string | undefined, default 'Slider'): Visible base name. Use a task-specific, localized label.
- `marks` (number, default 0, minimum 0, maximum 100): Number of evenly spaced tick intervals, up to 100. Zero hides ticks.
- `max` (number, default 100): Inclusive upper bound. A maximum below min collapses the scale.
- `maximum-label` (string | undefined, default 'maximum'): Localized suffix for the upper thumb's accessible name.
- `min` (number, default 0): Inclusive lower bound and step origin.
- `minimum-label` (string | undefined, default 'minimum'): Localized suffix for the lower thumb's accessible name.
- `name` (string | undefined): Native form key. Omit when the value should remain local to the control.
- `orientation` ("horizontal" | "vertical", default 'horizontal'): Axis of the scale. A vertical scale increases towards the top.
- `range` (boolean, default false): Enables two non-crossing thumbs in minimum then maximum tab order.
- `step` (number, default 1): Positive increment. Values snap from min and max is always reachable.
- `value` (number | string | undefined): Current selection as a number or, in range mode, a comma-separated pair. HTML attributes also accept the scalar as numeric text. Defaults to min for one thumb and to both bounds for a range. User updates are normalized.

## Slots

None.

## Parts

- `center-tick`: Midpoint mark on a centered scale.
- `field`: Layout containing the visible label, value, controls and help.
- `fill`: Active portion of the rail.
- `help`: Supporting text associated with each thumb.
- `label`: Visible text used to name the control.
- `mark`: Decorative scale mark at an interval boundary.
- `thumb`: Focusable pointer target for one end of the selection.
- `track`: Inactive rail between the two ends of the scale.
- `value`: Formatted value or interval shown beside the label.

## Events

- `change` (Event): Bubbles once when a pointer operation commits a different selection or a keyboard action changes it. Read the current host value. For updates during a drag, listen for the standard bubbling `input` event. Programmatic updates and form resets are silent.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-slider-coarse-target`: Minimum target size on a coarse pointer. Default: `var(--ki-scale-control-coarse-target)`.
- `--ki-slider-fill-backdrop-filter`: Optional effect behind the active rail. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-slider-fill-bg`: Colour of the active section of the rail. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-slider-fill-bg-image`: Optional image painted on the active rail. Default: `var(--ki-surface-image-none)`.
- `--ki-slider-gap`: Gap between the slider control and its labels. Default: `var(--ki-spacing-activity-label-gap)`.
- `--ki-slider-label-bg`: Background beneath the field label. Default: `var(--ki-surface-transparent)`.
- `--ki-slider-label-fg`: Ink of the field label. Default: `var(--ki-text-high-em)`.
- `--ki-slider-mark-width`: Thickness of each interval tick. Default: `var(--ki-scale-control-mark-width)`.
- `--ki-slider-radius`: Round rail, grip and midpoint tick corners. Default: `var(--ki-corner-activity-mark)`.
- `--ki-slider-text-bg`: Background beneath the value readout and help. Default: `var(--ki-surface-transparent)`.
- `--ki-slider-text-fg`: Ink of the value readout and help. Default: `var(--ki-text-high-em)`.
- `--ki-slider-thumb-backdrop-filter`: Optional effect behind the grip. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-slider-thumb-bg`: Grip surface behind the outline. Default: `var(--ki-surface-s0)`.
- `--ki-slider-thumb-bg-image`: Optional image painted on the grip. Default: `var(--ki-surface-image-none)`.
- `--ki-slider-thumb-border`: Outline colour of the visible grip. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-slider-thumb-border-width`: Outline thickness of the visible grip. Default: `var(--ki-scale-control-thumb-border-width)`.
- `--ki-slider-thumb-shadow`: Optional grip elevation. Default: `var(--ki-elevation-e2)`.
- `--ki-slider-thumb-size`: Diameter of the visible grip within the pointer target. Default: `var(--ki-glyph-size-md)`.
- `--ki-slider-track-backdrop-filter`: Optional effect behind the inactive rail. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-slider-track-bg`: Inactive rail colour against the surrounding surface. Default: `var(--ki-outline-control)`.
- `--ki-slider-track-bg-image`: Optional image painted on the inactive rail. Default: `var(--ki-surface-image-none)`.
- `--ki-slider-track-height`: Inactive rail thickness. Default: `var(--ki-scale-control-track-height)`.
- `--ki-slider-vertical-length`: Length of the vertical rail. Default: `var(--ki-scale-control-vertical-length)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1. Default: `var(--ki-font-line-height-body-1)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
