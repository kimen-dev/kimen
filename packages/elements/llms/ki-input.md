# ki-input

> A token-styled single-line text field with native input semantics. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously on a defined custom element.

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

Place a one-field form's only submit action inside the field.

```html
<form role="search">
  <ki-input type="search" name="q" label="Search docs" placeholder="Components, tokens…">
    <ki-button slot="action" size="sm" variant="secondary" type="submit">Search</ki-button>
  </ki-input>
</form>
```

The action has a separate tab stop. Enter in the entry also submits the form.
For an icon-only action, give `ki-icon-button size="sm"` a `label` and call
`form.requestSubmit()` from its click handler.

Read-only and disabled are distinct states — read-only stays focusable and is submitted, disabled is neither:

```html
<ki-input label="Plan" value="Pro" readonly></ki-input>
<ki-input label="Legacy ID" value="A-1042" disabled></ki-input>
```

## Appearance and character limits

Set `appearance` to `outlined` for a full border or `filled` for a
tinted surface with a bottom indicator. Both keep the label above the field.
The default appearance follows the theme.

Set `minlength` and `maxlength` to use the native input limits. With
a maximum, `show-count` adds the current length to the field description
and announces when the user reaches the limit.

```html
<ki-input label="Workspace name" appearance="outlined" minlength="3" maxlength="30" show-count help-text="Shown to members" value="Kimen design"></ki-input>
<ki-input label="Price" appearance="filled" value="49.00"><span slot="start">EUR</span><span slot="end">/ month</span></ki-input>
```

## An error from the application

Set `custom-error` to show the application's verdict on a submitted answer,
such as a server-side check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next keystroke withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-input label="Work email" name="email" type="email" value="ana@example.com" custom-error="This email is already registered."></ki-input>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-input`: the default, only the tokens ki-input needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `ai-suggestion-text` (string, default 'Suggested by AI'): Localized provenance description read alongside help or an error when the end slot contains an AI label. Use this to translate the description.
- `appearance` ("default" | "filled" | "outlined" | undefined, default 'default'): Field appearance. `default` uses the current theme, `outlined` draws a full border, and `filled` uses a tinted surface and bottom indicator. The visible label stays above the field. When to use: set an explicit appearance when fields must share a shape across themes.
- `autocomplete` (string | undefined): Native autocomplete detail token forwarded to the internal input. When NOT to use: omit when no autofill entry purpose is known.
- `custom-error` (string | undefined): An error of the application's own, such as a server-side or cross-field verdict on the submitted answer ("Already registered"). While it holds text the field is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting at the person's next change of the answer, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for `required` or other constraints the field enforces itself; `error-text` words those. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Prevents editing, removes the field from keyboard reach and exposes the unavailable state through the internal native input. When NOT to use: do not use disabled for readonly reference values.
- `error-text` (string | undefined): Message shown in place of the help text once the person's answer fails a constraint (`required`, `type` or a length limit), and the field's `validationMessage`. Say how to fix the answer ("Enter an email address like name@example.com"). Without it the browser's own message shows, in the browser's language. An error set with `custom-error` or `setCustomValidity` outranks it. When NOT to use: do not use it for server-side or cross-field errors; set `custom-error` or call `setCustomValidity` for those.
- `help-text` (string | undefined): One line of help under the field, read with it as its description: the format expected, or why the answer is asked. While an error shows, the error takes its place. When NOT to use: do not repeat the label, and do not use it for error messages; use `error-text`.
- `label` (string, required): Visible label rendered next to the entry area and used as the accessible name. This is mandatory for valid usage. When NOT to use: never use `placeholder` as a label substitute.
- `label-hint` (string | undefined): Short text shown after the label and read with it as part of the field's name, so people know before submitting whether to answer: "(optional)" on the few optional fields of a mostly required form, or "(required)" the other way round, in the page's own language. It changes no validation; set `required` for that, and keep the two consistent. When NOT to use: do not put instructions or formats in it (use `help-text`), errors (use `error-text`), or a repeat of the label.
- `maxlength` (number | undefined, minimum 0, maximum 2147483647): Native maximum length in UTF-16 code units. The input prevents user entry past this limit. When to use: cap the number of characters people can enter.
- `minlength` (number | undefined, minimum 0, maximum 2147483647): Native minimum length in UTF-16 code units for a nonempty user edit. When to use: require a minimum number of characters in an answer.
- `name` (string | undefined): Form-data key for the submitted value. When NOT to use: omit when the field must not contribute named form data.
- `placeholder` (string | undefined): Hint shown when the field is empty. When NOT to use: do not use placeholder as the accessible name.
- `readonly` (boolean, default false): Makes the value focusable and selectable while rejecting edits. When NOT to use: use `disabled` when the value must be unavailable and excluded from forms.
- `required` (boolean, default false): Marks the field as required for native constraint validation. When NOT to use: do not use required on optional fields.
- `show-count` (boolean | undefined, default false): Shows the current count and maximum next to the help or error text and announces reaching or exceeding the limit. Requires `maxlength`. When to use: give people feedback while writing to a limit.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed field size (`--ki-input-{size}-*` tokens): the field box is 24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and icon box; the label and help text follow in three steps. An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the buttons and fields around it. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `type` ("email" | "password" | "search" | "tel" | "text" | "url", default 'text'): Entry kind with native single-line input semantics. Unknown runtime values fall back to `text`; `number` is not a v1 input kind. When NOT to use: use future numeric controls for locale-aware number entry.
- `value` (string, default ''): Live text value. The attribute declares the initial default; the property is the current value and programmatic assignments are silent. Deviation from native (deliberate, research D2): assigning the ATTRIBUTE programmatically also replaces the displayed value, silently — native inputs would keep the user's dirty value. Form reset restores the attribute's current value. When NOT to use: do not observe user edits by polling; listen for `input` and `change` (both re-dispatched composed across the shadow boundary).

## Slots

- `action`: One small submit action inside the field after the end adornment. Use for one-field forms such as search or subscribe. Place a named `ki-button size="sm" type="submit"` here, or wire a labeled `ki-icon-button size="sm"` to request form submission. The action has its own tab stop. Use the end slot for clear or reveal controls.
- `end`: Trailing icon or text affix inside the field. Follows writing direction. A directly slotted AI label also describes the field as suggested by AI.
- `start`: Leading icon or text affix inside the field. Follows writing direction.

## Parts

- `count`: Current character count and maximum at the end of the field message row.
- `error`: Error line shown in place of the help text while the field is invalid after the person answered or submitted; a polite live region, starting with a decorative error symbol.
- `field`: Enclosure wrapper for background, border, radius and focus ring.
- `help`: Help line under the field, read as the field's description.
- `input`: Internal native input that owns entry text, caret and selection.
- `label`: Visible label that provides the accessible name.
- `label-hint`: The `label-hint` text after the label text, inside the label and part of the accessible name; rendered only while a hint is set.

## Events

- `change` (Event): Fired when the user commits an edited value (native text-field timing, such as on blur), composed across the shadow boundary; `value` is already current when listeners run. When to use: react to a committed value. When NOT to use: do not use it for per-keystroke updates; the native `input` event carries those.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-input-action-gap`: Gap between the input action and the preceding control or adornment.
- `--ki-input-action-padding-end`: Inline-end inset between the input action and the inside edge of the field border.
- `--ki-input-appearance-border-width`: Resting stroke width of both explicit text field appearances.
- `--ki-input-border-block-end-width`: dimension used by the input component for border block end width.
- `--ki-input-border-block-start-width`: dimension used by the input component for border block start width.
- `--ki-input-border-inline-end-width`: dimension used by the input component for border inline end width.
- `--ki-input-border-inline-start-width`: dimension used by the input component for border inline start width.
- `--ki-input-count-bg`: Resting character count surface over the surrounding page.
- `--ki-input-count-fg`: Character count when the value fits the maximum.
- `--ki-input-count-over-bg`: Over-limit character count surface over the surrounding page.
- `--ki-input-count-over-fg`: Character count when the value exceeds the maximum.
- `--ki-input-disabled-bg`: color used by the input component for disabled background.
- `--ki-input-disabled-border`: color used by the input component for disabled border.
- `--ki-input-disabled-fg`: color used by the input component for disabled foreground (MarsUI disabled text Text/base_em; disabled cells are exempt from the contrast sweep).
- `--ki-input-disabled-label-fg`: color used by the input component for disabled label foreground.
- `--ki-input-disabled-placeholder-fg`: color used by the input component for disabled placeholder foreground.
- `--ki-input-filled-backdrop-filter`: Optional backdrop filter of a filled field.
- `--ki-input-filled-bg`: Surface of a filled text field.
- `--ki-input-filled-bg-image`: Optional background image of a filled field.
- `--ki-input-filled-fg`: Entered text on a filled field.
- `--ki-input-filled-focus-width`: Stroke width of the block-end indicator while focused.
- `--ki-input-filled-indicator`: Continuous block-end edge of an enabled filled text field.
- `--ki-input-filled-placeholder-fg`: Placeholder on a filled field.
- `--ki-input-filled-radius`: Block-start corner radius of a filled text field.
- `--ki-input-focus-bg`: color used by the input component for focus background (MarsUI active state switches the fill to Surface/Special white / dark s2 — modeled with the scheme ladder s0).
- `--ki-input-focus-fg`: color used by the input component for focus foreground.
- `--ki-input-focus-label-fg`: color used by the input component for focus label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-focus-placeholder-fg`: color used by the input component for focus placeholder foreground (Text/med_em — a declared a11y deviation from the MarsUI placeholder binding Text/low_em, which reads 2.66-3.13:1 on the light field fills; a placeholder is not the accessible name but it is still text, so the contrast gate holds it to 4.5:1).
- `--ki-input-focus-ring-color`: color used by the input component for focus ring color.
- `--ki-input-focus-ring-offset`: dimension used by the input component for focus ring offset.
- `--ki-input-focus-ring-shadow`: shadow used by the input component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-input-focus-ring-width`: dimension used by the input component for focus ring width.
- `--ki-input-font-size`: dimension used by the input component for font size.
- `--ki-input-font-size-touch`: dimension used by the input component for the text a person types under a coarse primary pointer: 16px, under which Safari on iOS zooms the page into the focused field (spec 048). The onmars type scale has no 16px step.
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
- `--ki-input-label-hint-fg`: color used by the input component for the label hint after the label text (spec 047: the supporting-text role, a declared a11y deviation from the MarsUI Input_label support text Text/low_em, which reads 2.8-3.13:1 on the onmars light surfaces; under more contrast it strengthens with every other supporting text).
- `--ki-input-label-hint-gap`: dimension used by the input component for the gap between the label text and the label hint (MarsUI Input_label: Space/xs 4px).
- `--ki-input-label-line-height`: dimension used by the input component for label line height (MarsUI line_height/para 20px).
- `--ki-input-label-padding-inline`: dimension used by the input component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius).
- `--ki-input-lg-font-size`: dimension used by the input component for lg font size: body-2 (Input-cell 8016:286 lg).
- `--ki-input-lg-height`: dimension used by the input component for lg height (Input-cell 8016:286 lg: 48px; consumed as min-block-size, spec 050).
- `--ki-input-lg-icon-size`: dimension used by the input component for the lg icon box (Input-cell 8016:286 lg icon 20px).
- `--ki-input-lg-label-font-size`: dimension used by the input component for the lg label font size: the Input-label 12021:6068 lg step, body-2 (spec 050 D4).
- `--ki-input-lg-label-line-height`: dimension used by the input component for the lg label line height (body-2, Input-label lg; spec 050 D4).
- `--ki-input-lg-line-height`: dimension used by the input component for lg line height (body-2, Input-cell 8016:286 lg).
- `--ki-input-lg-padding-inline`: dimension used by the input component for lg padding inline (Input-cell 8016:286 lg binds Space/xl, 12px).
- `--ki-input-lg-radius`: dimension used by the input component for lg radius (Input-cell 8016:286 lg binds Radius/small-component/lg).
- `--ki-input-lg-text-padding-inline`: dimension used by the input component for the lg inline padding of the native control (Input-cell 8016:286 lg Text_wrap binds Space/xs, 4px; medium uses the gap token).
- `--ki-input-line-height`: dimension used by the input component for line height.
- `--ki-input-outlined-bg`: Surface of an outlined text field.
- `--ki-input-outlined-border`: Full outline of an enabled outlined text field.
- `--ki-input-outlined-fg`: Entered text on an outlined field.
- `--ki-input-outlined-placeholder-fg`: Placeholder on an outlined field.
- `--ki-input-outlined-radius`: Corner radius of an outlined text field.
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
- `--ki-input-sm-font-size`: dimension used by the input component for sm font size: caption-2 (Input-cell 8016:286 sm).
- `--ki-input-sm-height`: dimension used by the input component for sm height (Input-cell 8016:286 sm: 32px; consumed as min-block-size, spec 050).
- `--ki-input-sm-icon-size`: dimension used by the input component for the sm icon box (Input-cell 8016:286 sm icon 16px).
- `--ki-input-sm-label-font-size`: dimension used by the input component for the sm label font size: the Input-label 12021:6068 sm step, caption-2 (spec 050 D4).
- `--ki-input-sm-label-line-height`: dimension used by the input component for the sm label line height (caption-2, Input-label sm; spec 050 D4).
- `--ki-input-sm-line-height`: dimension used by the input component for sm line height (caption-2, Input-cell 8016:286 sm).
- `--ki-input-sm-padding-inline`: dimension used by the input component for sm padding inline (Input-cell 8016:286 sm binds Space/md, 8px).
- `--ki-input-sm-radius`: dimension used by the input component for sm radius (Input-cell 8016:286 sm binds Radius/small-component/sm).
- `--ki-input-sm-text-padding-inline`: dimension used by the input component for the sm inline padding of the native control (Input-cell 8016:286 sm Text_wrap binds Space/xs, 4px; medium uses the gap token).
- `--ki-input-xl-font-size`: dimension used by the input component for xl font size: title-2 (Input-cell 8016:286 xl).
- `--ki-input-xl-height`: dimension used by the input component for xl height (Input-cell 8016:286 xl: 56px; consumed as min-block-size, spec 050).
- `--ki-input-xl-icon-size`: dimension used by the input component for the xl icon box (Input-cell 8016:286 xl icon 24px).
- `--ki-input-xl-label-font-size`: dimension used by the input component for the xl label font size: the Input-label 12021:6068 lg step, body-2 (spec 050 D4).
- `--ki-input-xl-label-line-height`: dimension used by the input component for the xl label line height (body-2, Input-label lg; spec 050 D4).
- `--ki-input-xl-line-height`: dimension used by the input component for xl line height (title-2, Input-cell 8016:286 xl).
- `--ki-input-xl-padding-inline`: dimension used by the input component for xl padding inline (Input-cell 8016:286 xl binds Space/2xl, 14px).
- `--ki-input-xl-radius`: dimension used by the input component for xl radius (Input-cell 8016:286 xl binds Radius/small-component/xl).
- `--ki-input-xl-text-padding-inline`: dimension used by the input component for the xl inline padding of the native control (Input-cell 8016:286 xl Text_wrap binds Space/sm, 6px; medium uses the gap token).
- `--ki-input-xs-font-size`: dimension used by the input component for xs font size: caption-2 (Input-cell 8016:286 xs). Figma draws caption_1, 10px; caption_2, 12px, is the smallest text the library ships (spec 050 D7).
- `--ki-input-xs-height`: dimension used by the input component for xs height (Input-cell 8016:286 xs: 24px; consumed as min-block-size, spec 050).
- `--ki-input-xs-icon-size`: dimension used by the input component for the xs icon box (Input-cell 8016:286 xs icon 14px).
- `--ki-input-xs-label-font-size`: dimension used by the input component for the xs label font size: the Input-label 12021:6068 sm step, caption-2 (spec 050 D4).
- `--ki-input-xs-label-line-height`: dimension used by the input component for the xs label line height (caption-2, Input-label sm; spec 050 D4).
- `--ki-input-xs-line-height`: dimension used by the input component for xs line height (caption-2, Input-cell 8016:286 xs).
- `--ki-input-xs-padding-inline`: dimension used by the input component for xs padding inline (Input-cell 8016:286 xs binds Space/sm, 6px).
- `--ki-input-xs-radius`: dimension used by the input component for xs radius (Input-cell 8016:286 xs binds Radius/small-component/xs).
- `--ki-input-xs-text-padding-inline`: dimension used by the input component for the xs inline padding of the native control (Input-cell 8016:286 xs Text_wrap binds Space/xxs, 2px; medium uses the gap token).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
