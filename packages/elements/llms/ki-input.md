# ki-input

> A token-styled single-line text field with native input semantics. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously, on the custom-elements build (not on hosts created by the lazy loader).

## When to use

collect one line of free text from a person, always with a
visible `label`; choose the `type` and `autocomplete` that match the entry
purpose.

## When not to use

multiline text, predefined choices, boolean state, numeric
stepper entry, or placeholder-only labeling.

## Examples

A labeled field participating in native form submission (`label` is mandatory; it is the accessible name):

```html
<form>
  <ki-input label="Work email" name="email" type="email" required></ki-input>
  <ki-button variant="primary">Subscribe</ki-button>
</form>
```

Read-only and disabled are distinct states — read-only stays focusable and is submitted, disabled is neither:

```html
<ki-input label="Plan" value="Pro" readonly></ki-input>
<ki-input label="Legacy ID" value="A-1042" disabled></ki-input>
```

## Attributes

- `autocomplete` (string | undefined): Native autocomplete detail token forwarded to the internal input. When NOT to use: omit when no autofill entry purpose is known.
- `disabled` (boolean, default false): Prevents editing, removes the field from keyboard reach and exposes the unavailable state through the internal native input. When NOT to use: do not use disabled for readonly reference values.
- `error-text` (string | undefined): Message shown in place of the help text once the person's answer fails a constraint (`required`, `type`), and the field's `validationMessage`. Say how to fix the answer ("Enter an email address like name@example.com"). Without it the browser's own message shows, in the browser's language. An error set with `setCustomValidity` outranks it. When NOT to use: do not use it for server-side or cross-field errors; call `setCustomValidity` for those.
- `help-text` (string | undefined): One line of help under the field, read with it as its description: the format expected, or why the answer is asked. While an error shows, the error takes its place. When NOT to use: do not repeat the label, and do not use it for error messages; use `error-text`.
- `label` (string, required): Visible label rendered next to the entry area and used as the accessible name. This is mandatory for valid usage. When NOT to use: never use `placeholder` as a label substitute.
- `name` (string | undefined): Form-data key for the submitted value. When NOT to use: omit when the field must not contribute named form data.
- `placeholder` (string | undefined): Hint shown when the field is empty. When NOT to use: do not use placeholder as the accessible name.
- `readonly` (boolean, default false): Makes the value focusable and selectable while rejecting edits. When NOT to use: use `disabled` when the value must be unavailable and excluded from forms.
- `required` (boolean, default false): Marks the field as required for native constraint validation. When NOT to use: do not use required on optional fields.
- `type` ("email" | "password" | "search" | "tel" | "text" | "url", default 'text'): Entry kind with native single-line input semantics. Unknown runtime values fall back to `text`; `number` is not a v1 input kind. When NOT to use: use future numeric controls for locale-aware number entry.
- `value` (string, default ''): Live text value. The attribute declares the initial default; the property is the current value and programmatic assignments are silent. Deviation from native (deliberate, research D2): assigning the ATTRIBUTE programmatically also replaces the displayed value, silently — native inputs would keep the user's dirty value. Form reset restores the attribute's current value. When NOT to use: do not observe user edits by polling; listen for `input` and `change` (both re-dispatched composed across the shadow boundary).

## Slots

- `end`: Trailing icon or text affix inside the field. Follows writing direction.
- `start`: Leading icon or text affix inside the field. Follows writing direction.

## Parts

- `error`: Error line shown in place of the help text while the field is invalid after the person answered or submitted; a polite live region, starting with a decorative error symbol.
- `field`: Enclosure wrapper for background, border, radius and focus ring.
- `help`: Help line under the field, read as the field's description.
- `input`: Internal native input that owns entry text, caret and selection.
- `label`: Visible label that provides the accessible name.

## Events

- `change` (Event): Fired when the user commits an edited value (native text-field timing, such as on blur), composed across the shadow boundary; `value` is already current when listeners run. When to use: react to a committed value. When NOT to use: do not use it for per-keystroke updates; the native `input` event carries those.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce (WCAG 2.5.8 AA, 24 x 24 CSS px). Every scaled control floors its size at it: max(target-min, size + control-offset).
- `--ki-input-border-block-end-width`: dimension used by the input component for border block end width.
- `--ki-input-border-block-start-width`: dimension used by the input component for border block start width.
- `--ki-input-border-inline-end-width`: dimension used by the input component for border inline end width.
- `--ki-input-border-inline-start-width`: dimension used by the input component for border inline start width.
- `--ki-input-disabled-bg`: color used by the input component for disabled background.
- `--ki-input-disabled-border`: color used by the input component for disabled border.
- `--ki-input-disabled-fg`: color used by the input component for disabled foreground (MarsUI disabled text Text/base_em; disabled cells are exempt from the contrast sweep).
- `--ki-input-disabled-label-fg`: color used by the input component for disabled label foreground.
- `--ki-input-disabled-placeholder-fg`: color used by the input component for disabled placeholder foreground.
- `--ki-input-focus-bg`: color used by the input component for focus background (MarsUI active state switches the fill to Surface/Special white / dark s2 — modeled with the scheme ladder s0).
- `--ki-input-focus-fg`: color used by the input component for focus foreground.
- `--ki-input-focus-label-fg`: color used by the input component for focus label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-focus-placeholder-fg`: color used by the input component for focus placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-input-focus-ring-color`: color used by the input component for focus ring color.
- `--ki-input-focus-ring-offset`: dimension used by the input component for focus ring offset.
- `--ki-input-focus-ring-shadow`: shadow used by the input component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-input-focus-ring-width`: dimension used by the input component for focus ring width.
- `--ki-input-font-size`: dimension used by the input component for font size.
- `--ki-input-font-weight`: font weight used by the input component for font weight.
- `--ki-input-gap`: dimension used by the input component for gap.
- `--ki-input-height`: dimension used by the input component for height (MarsUI Input_field md cell: min-height 40px; consume as min-block-size so the field can grow).
- `--ki-input-hover-bg`: color used by the input component for hover background (MarsUI hover = s2 + Black/3 overlay; s3 is the nearest token).
- `--ki-input-hover-border`: color used by the input component for hover border.
- `--ki-input-hover-fg`: color used by the input component for hover foreground.
- `--ki-input-hover-label-fg`: color used by the input component for hover label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-hover-placeholder-fg`: color used by the input component for hover placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-input-icon-size`: dimension used by the input component for icon size.
- `--ki-input-invalid-bg`: color used by the input component for invalid background (MarsUI danger state keeps the white active fill; the ring and hint carry the signal).
- `--ki-input-invalid-border`: color used by the input component for invalid border.
- `--ki-input-invalid-fg`: color used by the input component for invalid foreground.
- `--ki-input-invalid-label-fg`: color used by the input component for invalid label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-invalid-placeholder-fg`: color used by the input component for invalid placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-input-invalid-ring`: shadow used by the input component for the persistent invalid ring (MarsUI Focus/danger: 3px danger-500 alpha spread; applied as box-shadow while :state(user-invalid)).
- `--ki-input-label-font-size`: dimension used by the input component for label font size (MarsUI UI/Para/medium: body_1 13px).
- `--ki-input-label-font-weight`: font weight used by the input component for label font weight.
- `--ki-input-label-gap`: dimension used by the input component for label gap.
- `--ki-input-label-line-height`: dimension used by the input component for label line height (MarsUI line_height/para 20px).
- `--ki-input-label-padding-inline`: dimension used by the input component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius).
- `--ki-input-line-height`: dimension used by the input component for line height.
- `--ki-input-padding-inline`: dimension used by the input component for padding inline.
- `--ki-input-radius`: dimension used by the input component for radius (MarsUI Radius/component/radius_md 10px, the md Input_cell binding; component ramp so personality modes reach it).
- `--ki-input-readonly-bg`: color used by the input component for readonly background (retires the deprecated ki.surface.raised alias; same resolved value).
- `--ki-input-readonly-border`: color used by the input component for readonly border.
- `--ki-input-readonly-fg`: color used by the input component for readonly foreground.
- `--ki-input-readonly-label-fg`: color used by the input component for readonly label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-readonly-placeholder-fg`: color used by the input component for readonly placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-input-rest-bg`: color used by the input component for rest background (MarsUI Input_field rest fill Surface/s2: the fill identifies the field, not the outline).
- `--ki-input-rest-border`: color used by the input component for rest border.
- `--ki-input-rest-fg`: color used by the input component for rest foreground.
- `--ki-input-rest-label-fg`: color used by the input component for rest label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-rest-placeholder-fg`: color used by the input component for rest placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
