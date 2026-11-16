# ki-textarea

> A token-styled multiline text field with native form semantics. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously, on the custom-elements build (not on hosts created by the lazy loader).

## When to use

free-form text longer than one line, such as comments,
descriptions, messages, delivery notes, or addresses when paired with a
matching `autocomplete` purpose.

## When not to use

single-line values (`ki-input`), constrained choices,
rich or formatted text editing, or search boxes.

Agent note: initial text is declared through the `value` attribute; element
text content is ignored. Enter inserts a line break and never submits the
enclosing form, the inverse of `ki-input`.

## Examples

A labeled multiline field in a form (`label` is mandatory — the visible label and accessible name); `rows` sets the stable visible line count (default `2`, no auto-grow in v1):

```html
<form>
  <ki-textarea label="Comments" name="comments" rows="4"></ki-textarea>
  <ki-button variant="primary">Send</ki-button>
</form>
```

Initial text is declared through the `value` attribute — element text content is ignored — and Enter inserts a line break, never submitting the enclosing form:

```html
<ki-textarea label="Bio" name="bio" value="Web components enthusiast."></ki-textarea>
```

`required` blocks submission while empty, and an `autocomplete` purpose such as `street-address` exposes the entry's meaning to autofill:

```html
<ki-textarea
  label="Shipping address"
  name="address"
  rows="3"
  autocomplete="street-address"
  required
></ki-textarea>
```

Read-only and disabled are distinct states — `readonly` stays focusable, selectable, submitted and validation-exempt; `disabled` is none of those:

```html
<ki-textarea label="Accepted policy" value="Version 2.1, accepted 2026-05-02." readonly></ki-textarea>
<ki-textarea label="Legacy notes" value="Migrated from v1." disabled></ki-textarea>
```

## Attributes

- `autocomplete` (string | undefined): Autofill detail token forwarded to the native textarea. When to use: expose entry purpose such as `street-address` when available. When NOT to use: omit when no valid autofill purpose applies.
- `disabled` (boolean, default false): Disables editing, focus, validation and form-data contribution. When to use: make a field temporarily unavailable. When NOT to use: do not use disabled for readonly review text that should submit.
- `label` (string, required): Visible label rendered by the component and used as the accessible name. When to use: always provide a concise label for the requested long-form text. When NOT to use: do not substitute placeholder text for the label.
- `name` (string | undefined): Form-data key used when the textarea submits with a form. When to use: provide for fields whose text must be included in FormData. When NOT to use: omit for display-only or client-only fields.
- `placeholder` (string | undefined): Hint shown while the textarea is empty. When to use: add an example or short formatting hint. When NOT to use: do not use placeholder as the accessible name or required instruction.
- `readonly` (boolean, default false): Makes the textarea focusable and selectable while rejecting edits. When to use: show submitted or policy text that should still be included in form data. When NOT to use: do not use readonly to remove a field from submission; use disabled.
- `required` (boolean, default false): Requires a non-empty value before form submission. When to use: mark mandatory long-form text. When NOT to use: do not pair with `readonly` expecting it to block; readonly fields are validation exempt like native textareas.
- `rows` (number, default 2): Visible line count. Invalid, non-numeric, zero, or negative values fall back to 2; no auto-grow or user resize handle exists in v1. When to use: set the stable multiline height needed by the layout. When NOT to use: do not use rows as a responsive size axis.
- `value` (string, default ''): Live current text. The `value` attribute declares the reset default; element text content is ignored. Programmatic assignments replace the display and emit no events. When to use: preload or read free-form text, line breaks included. When NOT to use: do not put initial text between the element tags.

## Slots

None.

## Parts

- `field`: The enclosure wrapper.
- `label`: Rendered visible label and accessible-name source.
- `textarea`: Internal native multiline control.

## Events

- `change` (Event): Fired when the user commits an edited value (on blur, with native textarea timing), composed across the shadow boundary; `value` is already current when listeners run. When to use: react to a committed value. When NOT to use: do not use it for per-keystroke updates; the native `input` event carries those.

## Methods

None.

## CSS custom properties

- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-textarea-border-block-end-width`: dimension used by the textarea component for border block end width.
- `--ki-textarea-border-block-start-width`: dimension used by the textarea component for border block start width.
- `--ki-textarea-border-inline-end-width`: dimension used by the textarea component for border inline end width.
- `--ki-textarea-border-inline-start-width`: dimension used by the textarea component for border inline start width.
- `--ki-textarea-disabled-bg`: color used by the textarea component for disabled background (MarsUI Surface/disabled_base_em Gray/100; aligned with ki-input).
- `--ki-textarea-disabled-border`: color used by the textarea component for disabled border.
- `--ki-textarea-disabled-fg`: color used by the textarea component for disabled foreground.
- `--ki-textarea-disabled-label-fg`: color used by the textarea component for disabled label foreground.
- `--ki-textarea-disabled-placeholder-fg`: color used by the textarea component for disabled placeholder foreground.
- `--ki-textarea-focus-bg`: color used by the textarea component for focus background (MarsUI active fill switches to white / dark s2 — modeled with the scheme ladder s0).
- `--ki-textarea-focus-fg`: color used by the textarea component for focus foreground.
- `--ki-textarea-focus-label-fg`: color used by the textarea component for focus label foreground (MarsUI label is Text/med_em in every non-disabled state; matches ki-input).
- `--ki-textarea-focus-placeholder-fg`: color used by the textarea component for focus placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-textarea-focus-ring-color`: color used by the textarea component for focus ring color.
- `--ki-textarea-focus-ring-offset`: dimension used by the textarea component for focus ring offset.
- `--ki-textarea-focus-ring-shadow`: shadow used by the textarea component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-textarea-focus-ring-width`: dimension used by the textarea component for focus ring width.
- `--ki-textarea-font-size`: dimension used by the textarea component for font size.
- `--ki-textarea-font-weight`: font weight used by the textarea component for font weight.
- `--ki-textarea-hover-bg`: color used by the textarea component for hover background (MarsUI hover = s2 + Black/3 overlay; s3 is the nearest token).
- `--ki-textarea-hover-border`: color used by the textarea component for hover border.
- `--ki-textarea-hover-fg`: color used by the textarea component for hover foreground.
- `--ki-textarea-hover-label-fg`: color used by the textarea component for hover label foreground (MarsUI label is Text/med_em in every non-disabled state; matches ki-input).
- `--ki-textarea-hover-placeholder-fg`: color used by the textarea component for hover placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-textarea-invalid-bg`: color used by the textarea component for invalid background (MarsUI danger keeps the white active fill — no tinted slab; ring and hint carry the signal).
- `--ki-textarea-invalid-border`: color used by the textarea component for invalid border.
- `--ki-textarea-invalid-fg`: color used by the textarea component for invalid foreground.
- `--ki-textarea-invalid-label-fg`: color used by the textarea component for invalid label foreground (MarsUI label is Text/med_em in every non-disabled state; matches ki-input).
- `--ki-textarea-invalid-placeholder-fg`: color used by the textarea component for invalid placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-textarea-invalid-ring`: shadow used by the textarea component for the persistent invalid ring (MarsUI Focus/danger: 3px danger-500 alpha spread; applied as box-shadow while :state(user-invalid)).
- `--ki-textarea-label-font-size`: dimension used by the textarea component for label font size (MarsUI UI/Para/medium: body_1 13px).
- `--ki-textarea-label-font-weight`: font weight used by the textarea component for label font weight.
- `--ki-textarea-label-gap`: dimension used by the textarea component for label gap.
- `--ki-textarea-label-line-height`: dimension used by the textarea component for label line height (MarsUI line_height/para 20px).
- `--ki-textarea-label-padding-inline`: dimension used by the textarea component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius; matches ki-input).
- `--ki-textarea-line-height`: dimension used by the textarea component for line height.
- `--ki-textarea-min-target`: dimension used by the textarea component for min target.
- `--ki-textarea-padding-block`: dimension used by the textarea component for padding block (MarsUI 96px md textarea: 12px ink inset).
- `--ki-textarea-padding-inline`: dimension used by the textarea component for padding inline (MarsUI 96px md textarea: 12px ink inset).
- `--ki-textarea-radius`: dimension used by the textarea component for radius (MarsUI Radius/component/radius_md 10px for the md size; component ramp so personality modes reach it).
- `--ki-textarea-readonly-bg`: color used by the textarea component for readonly background.
- `--ki-textarea-readonly-border`: color used by the textarea component for readonly border.
- `--ki-textarea-readonly-fg`: color used by the textarea component for readonly foreground.
- `--ki-textarea-readonly-label-fg`: color used by the textarea component for readonly label foreground (MarsUI label is Text/med_em in every non-disabled state; matches ki-input).
- `--ki-textarea-readonly-placeholder-fg`: color used by the textarea component for readonly placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-textarea-rest-bg`: color used by the textarea component for rest background (MarsUI textarea fill Surface/s2).
- `--ki-textarea-rest-border`: color used by the textarea component for rest border.
- `--ki-textarea-rest-fg`: color used by the textarea component for rest foreground.
- `--ki-textarea-rest-label-fg`: color used by the textarea component for rest label foreground (MarsUI label is Text/med_em in every non-disabled state; matches ki-input).
- `--ki-textarea-rest-placeholder-fg`: color used by the textarea component for rest placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-typography-family-body`: semantic font family for typography family body.
