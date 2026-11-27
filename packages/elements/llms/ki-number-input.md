# ki-number-input

> A form field for a numeric quantity with optional stepper buttons, bounds, locale-aware formatting, and a visible unit.

## When to use

Collect a number like a quantity, amount, or limit. Provide a
visible label and choose bounds and an increment when they have meaning.

## When not to use

Use ki-input for identifiers, codes, or other text that only
looks numeric. Use a range control when relative position is the main cue.

## Examples

# ki-number-input examples

## Quantity with bounds

```html
<ki-number-input label="Seats" name="seats" value="3" min="1" max="50" steppers required></ki-number-input>
```

## Plain field with a unit

```html
<ki-number-input label="Timeout" name="timeout" value="30" unit="seconds" min="0"></ki-number-input>
```

The form submits `timeout=30`.

## Percentage with localized editing

```html
<ki-number-input
  lang="de-DE"
  label="Discount"
  name="discount"
  min="0"
  max="1"
  step="0.005"
  value="0.125"
  format='{"style":"percent","maximumFractionDigits":1}'
></ki-number-input>
```

The editor displays `12,5` while focused and formats it as a percentage on
blur. The form submits `discount=0.125`.

## Text that is not a number

The field keeps text it cannot read as a number so the person can correct
it, shows its own message (`error-text`, else `invalid-number-message`) once
the person leaves the field or presses Enter, and stays invalid, so its form
cannot submit it. What it reports depends on what it held before:

- If it held a number, leaving the field fires one `change` and `value` is
  `undefined`, exactly as when the field is emptied.
- If it never held a number, it fires no `change`.

The event cannot tell an emptied field from an unreadable one; validity can:
`checkValidity()` answers `false` for unreadable text.

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
number, such as a stock check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next edit or step withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-number-input label="Seats" name="seats" value="42" min="1" custom-error="Only 40 seats left."></ki-number-input>
```

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-number-input';

defineCustomElement();
const discount = document.querySelector('ki-number-input[name="discount"]');
if (discount) {
  discount.format = { style: 'percent', maximumFractionDigits: 1 };
}
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-number-input`: the default, only the tokens ki-number-input needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted number ("Only 40 seats left"). While it holds text the field is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting at the person's next edit or step of the number, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for `required`, the bounds or unreadable text, which the field reports itself; `error-text` words those. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `decrease-label` (string, default 'Decrease {label}'): Stepper's accessible name. The field label replaces {label}.
- `disabled` (boolean, default false): Prevents editing and excludes the control from form submission.
- `error-text` (string | undefined): Validation hint to show when the entry fails a constraint. A `custom-error` outranks it.
- `format` (string): Intl.NumberFormat options for display. In HTML or a catalog spec, supply these options as JSON text. The form value retains its original precision.
- `help-text` (string | undefined): Context or instructions displayed beneath the field when it has no visible error.
- `increase-label` (string, default 'Increase {label}'): Stepper's accessible name. The field label replaces {label}.
- `invalid-number-message` (string, default 'Enter a number.'): Default validation message for text that cannot be read as a number.
- `label` (string, required): Visible accessible name. Supply a meaningful label in the page language.
- `max` (number | undefined): Maximum permitted numeric value. Omit for an unbounded maximum.
- `maximum-message` (string, default 'Value adjusted to the maximum of {value}.'): Polite adjustment message after exceeding the maximum. The formatted bound replaces {value}.
- `min` (number | undefined): Minimum permitted numeric value. Omit for an unbounded minimum.
- `minimum-message` (string, default 'Value adjusted to the minimum of {value}.'): Polite adjustment message after falling below the minimum. The formatted bound replaces {value}.
- `name` (string | undefined): Form-data key for the plain numeric value.
- `required` (boolean, default false): Whether the user must enter a number before submitting the form.
- `step` (number, default 1): Positive increment for arrows and buttons. Page keys and Shift+arrows move ten increments.
- `steppers` (boolean, default false): Shows named decrease and increase buttons inside the field.
- `unit` (string | undefined): Visible suffix such as seconds or seats, included in the accessible description.
- `value` (number | undefined): Current numeric value, or undefined when empty or unparseable. Use the attribute for the form reset value. Property assignments are silent.

## Slots

None.

## Parts

- `decrease`: Button that subtracts one step.
- `error`: Polite validation feedback associated with the spinbutton.
- `field`: Enclosure around the editor, unit and stepper buttons.
- `help`: Help message associated with the spinbutton.
- `increase`: Button that adds one step.
- `input`: Native text editor carrying the spinbutton role.
- `label`: Visible name of the spinbutton.
- `status`: Polite feedback explaining a value adjustment.
- `unit`: Visible unit referenced by the spinbutton's description.

## Events

- `change` (Event): Composed event fired when the person commits an edited or stepped value. Read the host's numeric value. Listen to native input for live edits.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-number-input-border-block-end-width`: Field border width at block end. Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-xxs)`.
- `--ki-number-input-border-block-start-width`: Field border width at block start. Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-zero)`.
- `--ki-number-input-border-inline-width`: Field border width at either inline edge. Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-zero)`.
- `--ki-number-input-field-backdrop-filter`: Complete backdrop filter behind the field. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-number-input-field-bg`: Resting NumberInput field fill. Default: onmars `var(--ki-surface-special-light-s0-dark-s1)`, material3 `var(--ki-surface-s1)`.
- `--ki-number-input-field-bg-image`: Optional theme image layered over the field fill. Default: `var(--ki-surface-image-none)`.
- `--ki-number-input-field-border`: Resting NumberInput field boundary. Default: `var(--ki-outline-control)`.
- `--ki-number-input-field-disabled-bg`: Field fill when disabled. Default: `var(--ki-surface-disabled-base-em)`.
- `--ki-number-input-field-disabled-border`: Boundary when the entire field is disabled. Default: `var(--ki-outline-low-em)`.
- `--ki-number-input-field-disabled-fg`: Numeric entry ink when disabled. Default: onmars `var(--ki-text-base-em)`, material3 `var(--ki-outline-strong)`.
- `--ki-number-input-field-fg`: Foreground of the numeric entry. Default: `var(--ki-text-high-em)`.
- `--ki-number-input-field-focus-bg`: Field fill while focused. Default: onmars `var(--ki-surface-s0)`, material3 `var(--ki-surface-s1)`.
- `--ki-number-input-field-focus-fg`: Numeric entry ink while focused. Default: `var(--ki-text-high-em)`.
- `--ki-number-input-field-invalid-border`: Field boundary when a validation message is visible. Default: `var(--ki-outline-danger-high-em)`.
- `--ki-number-input-font-size`: Font size of the numeric entry and its suffix. Default: `var(--ki-typography-size-body-1)`.
- `--ki-number-input-font-size-touch`: Minimum input font size under a coarse pointer. Default: onmars `var(--ki-space-3xl)`, material3 `var(--ki-typography-size-body-2)`.
- `--ki-number-input-height`: Medium field height before applying regional density. Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-14xl)`.
- `--ki-number-input-label-font-size`: Field label font size. Default: onmars `var(--ki-typography-size-body-1)`, material3 `var(--ki-typography-size-caption-2)`.
- `--ki-number-input-label-font-weight`: Field label font weight. Default: onmars `var(--ki-typography-weight-body-medium)`, material3 `var(--ki-typography-weight-body-normal)`.
- `--ki-number-input-label-gap`: Gap between the label, field and supporting messages. Default: `var(--ki-space-xs)`.
- `--ki-number-input-label-line-height`: Line height of the field label. Default: onmars `var(--ki-typography-line-height-para)`, material3 `var(--ki-typography-line-height-caption-2)`.
- `--ki-number-input-line-height`: Line height of the numeric entry and its suffix. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-number-input-padding-inline`: Inline padding for the plain field and unit suffix. Default: onmars `var(--ki-space-lg)`, material3 `var(--ki-space-3xl)`.
- `--ki-number-input-radius`: Field corners. Default: onmars `var(--ki-radius-component-md)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-number-input-stepper-bg`: Resting stepper button fill. Default: `var(--ki-surface-transparent)`.
- `--ki-number-input-stepper-disabled-fg`: Stepper icon ink when disabled. Default: onmars `var(--ki-text-low-em)`, material3 `var(--ki-outline-strong)`.
- `--ki-number-input-stepper-fg`: Resting stepper icon ink. Default: `var(--ki-text-high-em)`.
- `--ki-number-input-stepper-hover-bg`: Stepper fill when hovered. Default: `var(--ki-surface-s2)`.
- `--ki-number-input-stepper-hover-fg`: Stepper icon ink when hovered. Default: `var(--ki-text-high-em)`.
- `--ki-number-input-stepper-padding-inline`: Editor inline padding between the steppers. Default: `var(--ki-space-xxs)`.
- `--ki-number-input-unit-bg`: Backing of the unit suffix within the field. Default: `var(--ki-surface-transparent)`.
- `--ki-number-input-unit-fg`: Unit suffix ink. Medium emphasis in the standard contrast setting. Default: `var(--ki-text-supporting)`.
- `--ki-text-danger-high-em`: semantic color for text danger high em. Default: onmars `light-dark(#c21a45,var(--ki-color-danger-300))`, material3 `light-dark(#8c1d18,#f2b8b5)`.
- `--ki-text-high-em`: semantic color for text high em. Default: onmars `light-dark(var(--ki-color-gray-950),#edebe7)`, material3 `light-dark(#1d1b20,#e6e0e9)`.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted). Default: `var(--ki-text-med-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal. Default: `var(--ki-font-weight-body-normal)`.
