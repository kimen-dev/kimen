# ki-code-input

> A form-associated verification field with one native text input and a visual box per character.

## When to use

Collect a one-time code of four to eight characters for sign-in or verification.

## When not to use

Use ki-input for passwords, long codes or free text.

## Examples

# ki-code-input examples

Use `ki-code-input` for fixed one-time codes of four to eight characters. Use
`ki-input` for passwords, longer codes and free text.

## Numeric verification with a resend action

```html
<form id="verification">
  <ki-code-input
    label="Verification code"
    name="otp"
    required
    help-text="We sent a code to ana@example.com. It is valid for ten minutes."
    error-text="Enter all six digits."
  ></ki-code-input>
  <ki-button type="submit">Verify</ki-button>
  <ki-button id="resend-code" type="button" variant="ghost">Resend code</ki-button>
</form>
```

Read `new FormData(form).get('otp')` in the submit handler and send the string
to the verification service. The application knows the expiration time and
owns the resend request. On successful resend, clear the old value and any
custom validity error, update the help text, and focus the field. Offer a
visible and announced status if a request is still pending or fails.

On the custom-elements build, use `field.setCustomValidity(message)` and
`field.reportValidity()` to display a server rejection. Clear the message
with `field.setCustomValidity('')` once the person edits or resends the code.

## Four-character recovery code

```html
<ki-code-input
  label="Recovery code"
  name="recovery"
  type="alphanumeric"
  length="4"
  size="sm"
  help-text="Use the four characters from your verification email."
></ki-code-input>
```

Both `ki-input` and `ki-complete` carry `{ value }`. Listen for
`ki-complete` if filling the last box enables the next step. Leave submission
to the form unless completing the code can safely advance the flow.

## An error from the application

Set `custom-error` to show the server's verdict on the submitted code. The
field is invalid, blocks its form and is announced as invalid at once. The
person's next edit of the code withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-code-input label="Verification code" name="code" value="042911" custom-error="This code has expired. Request a new one."></ki-code-input>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-code-input`: the default, only the tokens ki-code-input needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted code ("This code has expired"). While it holds text the field is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting at the person's next edit of the code, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for an incomplete code, which the field reports itself; `error-text` words that. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Disable editing, sequential focus and form participation.
- `error-text` (string | undefined): Message for a failing code constraint. Omit to use the browser's message. A `custom-error` outranks it.
- `help-text` (string | undefined): Instructions saying where the code was sent and how long it is valid.
- `label` (string, required): Visible accessible name. Supply a label in the language of the form.
- `length` (number, default 6, minimum 4, maximum 8): Number of cells and maximum code length. Unsupported lengths fall back to six.
- `name` (string | undefined): Key for the single value submitted to the enclosing form.
- `required` (boolean, default false): Require a complete code before submitting. An optional field may be empty.
- `size` ("md" | "sm", default 'md'): Medium or small cells. The form region's density adjusts both sizes.
- `type` ("alphanumeric" | "numeric", default 'numeric'): Allowed characters and keyboard hint. Alphanumeric mode preserves ASCII letter case.
- `value` (string, default ''): The current code, including leading zeros. Use the attribute to declare the reset value. Programmatic assignments are normalized and silent.

## Slots

None.

## Parts

- `cell`: Decorative box for one code character.
- `error`: Polite validation message that replaces the instructions.
- `field`: Enclosure of the native input and its visual boxes.
- `help`: Delivery and validity instructions read with the field.
- `input`: Single native text input, responsible for editing and autofill.
- `label`: Visible label supplying the native input's accessible name.

## Events

- `ki-complete` (CustomEvent<KiCodeInputDetail>): Emitted after the input event when the edited code fills all the cells.
- `ki-input` (CustomEvent<KiCodeInputDetail>): Emitted when a user edit changes the code.

## Methods

None.

## Other CSS custom properties

- `--ki-code-input-backdrop-filter`: Optional compositing filter behind a code cell. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-code-input-bg`: Resting code cell fill. Default: `var(--ki-surface-s0)`.
- `--ki-code-input-bg-image`: Optional image painted over the code cell fill. Default: `var(--ki-surface-image-none)`.
- `--ki-code-input-blink-duration`: Duration of one code caret blink. Default: `var(--ki-motion-duration-activity-pulse)`.
- `--ki-code-input-border`: Resting code cell boundary. Default: `var(--ki-outline-control)`.
- `--ki-code-input-cell-size`: Default code cell edge before applying control density. Default: `var(--ki-layout-spacing-14xl)`.
- `--ki-code-input-cell-size-sm`: Small code cell edge before applying control density. Default: `var(--ki-control-size-md)`.
- `--ki-code-input-fg`: Resting code character ink. Default: `var(--ki-text-high-em)`.
- `--ki-code-input-font-size`: Code character size. Default: `var(--ki-typography-size-title-2)`.
- `--ki-code-input-gap`: Inline space between code cells. Default: `var(--ki-layout-spacing-md)`.
- `--ki-code-input-radius`: Code cell corner radius. Default: `var(--ki-radius-component-md)`.
- `--ki-code-input-selection-bg`: Background of a selected code character. Default: `var(--ki-surface-s2)`.
- `--ki-code-input-selection-fg`: Ink of a selected code character. Default: `var(--ki-text-high-em)`.
- `--ki-code-input-touch-font-size`: Minimum native input text size on a coarse pointer. Default: `var(--ki-layout-spacing-3xl)`.
- `--ki-control-border-width`: Stroke width of the boundary of a compact control. Default: `var(--ki-size-border-hairline)`.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap. Default: `var(--ki-space-xs)`.
- `--ki-text-danger-high-em`: semantic color for text danger high em. Default: onmars `light-dark(#c21a45,var(--ki-color-danger-300))`, material3 `light-dark(#8c1d18,#f2b8b5)`.
- `--ki-text-high-em`: semantic color for text high em. Default: onmars `light-dark(var(--ki-color-gray-950),#edebe7)`, material3 `light-dark(#1d1b20,#e6e0e9)`.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted). Default: `var(--ki-text-med-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-family-mono`: semantic font family for typography family mono. Default: `var(--ki-font-family-mono)`.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1. Default: `var(--ki-font-line-height-body-1)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal. Default: `var(--ki-font-weight-body-normal)`.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold. Default: `var(--ki-font-weight-body-semibold)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | active | `--ki-code-input-active-border` | `var(--ki-focus-ring-color)` | Focus outline around the active or selected cells. |
| — | — | disabled | `--ki-code-input-disabled-fg` | `var(--ki-text-med-em)` | Code character ink while the field is disabled. |
| — | — | error | `--ki-code-input-error-border` | `var(--ki-outline-danger-high-em)` | Code cell boundary after failed validation. |
