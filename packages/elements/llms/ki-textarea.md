# ki-textarea

> A token-styled multiline text field with native form semantics. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously on a defined custom element.

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

## Appearance and character limits

Set `appearance` to `outlined` for a full border or `filled` for a
tinted surface with a bottom indicator. Both keep the label above the field.
The default appearance follows the theme.

`minlength` uses native minimum-length validation. The textarea keeps edits
past `maxlength` and blocks submission until the value fits. With a maximum,
`show-count` adds the current length to the field description and announces
when the user reaches or exceeds the limit. Use `maxlength-error-text` to
localize the default length error.

```html
<ki-textarea label="Bio" appearance="outlined" minlength="3" maxlength="24" show-count help-text="Keep it short" value="Designer and front-end developer"></ki-textarea>
<ki-textarea label="Short bio" appearance="filled" maxlength="12" show-count help-text="Keep it short" value="Designs generative interfaces."></ki-textarea>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted text,
such as a moderation check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next keystroke withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-textarea label="Bio" name="bio" value="Call me at 555-0100" custom-error="Remove the phone number from your bio."></ki-textarea>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-textarea`: the default, only the tokens ki-textarea needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `appearance` ("default" | "filled" | "outlined" | undefined, default 'default'): Field appearance. `default` uses the current theme, `outlined` draws a full border, and `filled` uses a tinted surface and bottom indicator. The visible label stays above the field. When to use: set an explicit appearance when fields must share a shape across themes.
- `autocomplete` (string | undefined): Autofill detail token forwarded to the native textarea. When to use: expose entry purpose such as `street-address` when available. When NOT to use: omit when no valid autofill purpose applies.
- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted text ("This title is taken"). While it holds text the field is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting at the person's next change of the text, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for `required` or a length limit the field enforces itself; `error-text` words those. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Disables editing, focus, validation and form-data contribution. When to use: make a field temporarily unavailable. When NOT to use: do not use disabled for readonly review text that should submit.
- `error-text` (string | undefined): Message shown in place of the help text once the person's answer fails a constraint (`required` or a length limit), and the field's `validationMessage`. Say how to fix the answer. Without it the browser's own message shows, in the browser's language. An error set with `custom-error` or `setCustomValidity` outranks it. When NOT to use: do not use it for server-side or cross-field errors; set `custom-error` or call `setCustomValidity` for those.
- `help-text` (string | undefined): One line of help under the field, read with it as its description: what to write, or how long. While an error shows, the error takes its place. When NOT to use: do not repeat the label, and do not use it for error messages; use `error-text`.
- `label` (string, required): Visible label rendered by the component and used as the accessible name. When to use: always provide a concise label for the requested long-form text. When NOT to use: do not substitute placeholder text for the label.
- `label-hint` (string | undefined): Short text shown after the label and read with it as part of the field's name, so people know before submitting whether to answer: "(optional)" on the few optional fields of a mostly required form, or "(required)" the other way round, in the page's own language. It changes no validation; set `required` for that, and keep the two consistent. When NOT to use: do not put instructions or length limits in it (use `help-text`), errors (use `error-text`), or a repeat of the label.
- `maxlength` (number | undefined, minimum 0, maximum 2147483647): Soft maximum in UTF-16 code units. Longer user edits and assigned values are preserved and fail form validation with `validity.tooLong`. When to use: let people revise an over-limit draft without losing text.
- `maxlength-error-text` (string | undefined, default 'Shorten the text to fit the character limit.'): Localized message for an over-limit value. `error-text` and `setCustomValidity()` take precedence. When to use: translate the soft maximum message for the page language.
- `minlength` (number | undefined, minimum 0, maximum 2147483647): Native minimum length in UTF-16 code units for a nonempty user edit. When to use: require a minimum number of characters in an answer.
- `name` (string | undefined): Form-data key used when the textarea submits with a form. When to use: provide for fields whose text must be included in FormData. When NOT to use: omit for display-only or client-only fields.
- `placeholder` (string | undefined): Hint shown while the textarea is empty. When to use: add an example or short formatting hint. When NOT to use: do not use placeholder as the accessible name or required instruction.
- `readonly` (boolean, default false): Makes the textarea focusable and selectable while rejecting edits. When to use: show submitted or policy text that should still be included in form data. When NOT to use: do not use readonly to remove a field from submission; use disabled.
- `required` (boolean, default false): Requires a non-empty value before form submission. When to use: mark mandatory long-form text. When NOT to use: do not pair with `readonly` expecting it to block; readonly fields are validation exempt like native textareas.
- `rows` (number, default 2): Visible line count. Invalid, non-numeric, zero, or negative values fall back to 2; no auto-grow or user resize handle exists in v1. When to use: set the stable multiline height needed by the layout. When NOT to use: do not use rows as a responsive size axis.
- `show-count` (boolean | undefined, default false): Shows the current count and maximum next to the help or error text and announces reaching or exceeding the limit. Requires `maxlength`. When to use: give people feedback while writing to a limit.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed field size (`--ki-textarea-{size}-*` tokens): padding, radius and text; the label and help text follow in three steps. The height stays `rows` lines. An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the fields around it. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string, default ''): Live current text. The `value` attribute declares the reset default; element text content is ignored. Programmatic assignments replace the display and emit no events. When to use: preload or read free-form text, line breaks included. When NOT to use: do not put initial text between the element tags.

## Slots

None.

## Parts

- `count`: Current character count and maximum at the end of the field message row.
- `error`: Error line shown in place of the help text while the field is invalid after the person answered or submitted; a polite live region, starting with a decorative error symbol.
- `field`: The enclosure wrapper.
- `help`: Help line under the field, read as the field's description.
- `label`: Rendered visible label and accessible-name source.
- `label-hint`: The `label-hint` text after the label text, inside the label and part of the accessible name; rendered only while a hint is set.
- `textarea`: Internal native multiline control.

## Events

- `change` (Event): Fired when the user commits an edited value (on blur, with native textarea timing), composed across the shadow boundary; `value` is already current when listeners run. When to use: react to a committed value. When NOT to use: do not use it for per-keystroke updates; the native `input` event carries those.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-input-appearance-border-width`: Resting stroke width of both explicit text field appearances.
- `--ki-input-count-bg`: Resting character count surface over the surrounding page.
- `--ki-input-count-fg`: Character count when the value fits the maximum.
- `--ki-input-count-over-bg`: Over-limit character count surface over the surrounding page.
- `--ki-input-count-over-fg`: Character count when the value exceeds the maximum.
- `--ki-input-filled-backdrop-filter`: Optional backdrop filter of a filled field.
- `--ki-input-filled-bg`: Surface of a filled text field.
- `--ki-input-filled-bg-image`: Optional background image of a filled field.
- `--ki-input-filled-fg`: Entered text on a filled field.
- `--ki-input-filled-focus-width`: Stroke width of the block-end indicator while focused.
- `--ki-input-filled-indicator`: Continuous block-end edge of an enabled filled text field.
- `--ki-input-filled-placeholder-fg`: Placeholder on a filled field.
- `--ki-input-filled-radius`: Block-start corner radius of a filled text field.
- `--ki-input-label-gap`: dimension used by the input component for label gap.
- `--ki-input-outlined-bg`: Surface of an outlined text field.
- `--ki-input-outlined-border`: Full outline of an enabled outlined text field.
- `--ki-input-outlined-fg`: Entered text on an outlined field.
- `--ki-input-outlined-placeholder-fg`: Placeholder on an outlined field.
- `--ki-input-outlined-radius`: Corner radius of an outlined text field.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
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
- `--ki-textarea-font-size-touch`: dimension used by the textarea component for the text a person types under a coarse primary pointer: 16px, under which Safari on iOS zooms the page into the focused field (spec 048). The onmars type scale has no 16px step.
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
- `--ki-textarea-label-hint-fg`: color used by the textarea component for the label hint after the label text (spec 047: the supporting-text role, a declared a11y deviation from the MarsUI Input_label support text Text/low_em, which reads 2.8-3.13:1 on the onmars light surfaces; under more contrast it strengthens with every other supporting text).
- `--ki-textarea-label-hint-gap`: dimension used by the textarea component for the gap between the label text and the label hint (MarsUI Input_label: Space/xs 4px).
- `--ki-textarea-label-line-height`: dimension used by the textarea component for label line height (MarsUI line_height/para 20px).
- `--ki-textarea-label-padding-inline`: dimension used by the textarea component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius; matches ki-input).
- `--ki-textarea-lg-font-size`: dimension used by the textarea component for lg font size: body-2 (Input-cell 8016:286 Type=textarea lg).
- `--ki-textarea-lg-label-font-size`: dimension used by the textarea component for the lg label font size: the Input-label 12021:6068 lg step, body-2 (spec 050 D4).
- `--ki-textarea-lg-label-line-height`: dimension used by the textarea component for the lg label line height (body-2, Input-label lg; spec 050 D4).
- `--ki-textarea-lg-line-height`: dimension used by the textarea component for lg line height (body-2, Input-cell 8016:286 Type=textarea lg).
- `--ki-textarea-lg-padding-block`: dimension used by the textarea component for lg padding block (Input-cell 8016:286 Type=textarea lg binds Space/lg, 10px).
- `--ki-textarea-lg-padding-inline`: dimension used by the textarea component for lg padding inline (Input-cell 8016:286 Type=textarea lg binds Space/xl, 12px).
- `--ki-textarea-lg-radius`: dimension used by the textarea component for lg radius (Input-cell 8016:286 Type=textarea lg binds Radius/small-component/lg).
- `--ki-textarea-line-height`: dimension used by the textarea component for line height.
- `--ki-textarea-min-target`: dimension used by the textarea component for min target.
- `--ki-textarea-padding-block`: dimension used by the textarea component for padding block (Input-cell textarea md 8018:176: Space/md 8px).
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
- `--ki-textarea-sm-font-size`: dimension used by the textarea component for sm font size: caption-2 (Input-cell 8016:286 Type=textarea sm).
- `--ki-textarea-sm-label-font-size`: dimension used by the textarea component for the sm label font size: the Input-label 12021:6068 sm step, caption-2 (spec 050 D4).
- `--ki-textarea-sm-label-line-height`: dimension used by the textarea component for the sm label line height (caption-2, Input-label sm; spec 050 D4).
- `--ki-textarea-sm-line-height`: dimension used by the textarea component for sm line height (caption-2, Input-cell 8016:286 Type=textarea sm).
- `--ki-textarea-sm-padding-block`: dimension used by the textarea component for sm padding block (Input-cell 8016:286 Type=textarea sm binds Space/md, 8px).
- `--ki-textarea-sm-padding-inline`: dimension used by the textarea component for sm padding inline (Input-cell 8016:286 Type=textarea sm binds Space/md, 8px).
- `--ki-textarea-sm-radius`: dimension used by the textarea component for sm radius (Input-cell 8016:286 Type=textarea sm binds Radius/small-component/sm).
- `--ki-textarea-xl-font-size`: dimension used by the textarea component for xl font size: title-2 (Input-cell 8016:286 Type=textarea xl).
- `--ki-textarea-xl-label-font-size`: dimension used by the textarea component for the xl label font size: the Input-label 12021:6068 lg step, body-2 (spec 050 D4).
- `--ki-textarea-xl-label-line-height`: dimension used by the textarea component for the xl label line height (body-2, Input-label lg; spec 050 D4).
- `--ki-textarea-xl-line-height`: dimension used by the textarea component for xl line height (title-2, Input-cell 8016:286 Type=textarea xl).
- `--ki-textarea-xl-padding-block`: dimension used by the textarea component for xl padding block (Input-cell 8016:286 Type=textarea xl binds Space/xl, 12px).
- `--ki-textarea-xl-padding-inline`: dimension used by the textarea component for xl padding inline (Input-cell 8016:286 Type=textarea xl binds Space/2xl, 14px).
- `--ki-textarea-xl-radius`: dimension used by the textarea component for xl radius (Input-cell 8016:286 Type=textarea xl binds Radius/small-component/xl).
- `--ki-textarea-xs-font-size`: dimension used by the textarea component for xs font size: caption-2 (Input-cell 8016:286 Type=textarea xs). Figma draws caption_1, 10px; caption_2, 12px, is the smallest text the library ships (spec 050 D7).
- `--ki-textarea-xs-label-font-size`: dimension used by the textarea component for the xs label font size: the Input-label 12021:6068 sm step, caption-2 (spec 050 D4).
- `--ki-textarea-xs-label-line-height`: dimension used by the textarea component for the xs label line height (caption-2, Input-label sm; spec 050 D4).
- `--ki-textarea-xs-line-height`: dimension used by the textarea component for xs line height (caption-2, Input-cell 8016:286 Type=textarea xs).
- `--ki-textarea-xs-padding-block`: dimension used by the textarea component for xs padding block (Input-cell 8016:286 Type=textarea xs binds Space/md, 8px).
- `--ki-textarea-xs-padding-inline`: dimension used by the textarea component for xs padding inline (Input-cell 8016:286 Type=textarea xs binds Space/sm, 6px).
- `--ki-textarea-xs-radius`: dimension used by the textarea component for xs radius (Input-cell 8016:286 Type=textarea xs binds Radius/small-component/xs).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
