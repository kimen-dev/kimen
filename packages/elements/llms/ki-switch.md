# ki-switch

> A token-styled switch for immediate on/off settings. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously on a defined custom element.

## When to use

binary settings whose change takes effect immediately, always
with a slotted label.

## When not to use

selections collected for later form submission; use
ki-checkbox for recorded choices, ki-radio-group for mutually exclusive
choices, and ki-button for actions.

## Examples

The slotted label is the accessible name source, and boolean presence semantics apply to `checked` — any present attribute means on, omit it for off:

```html
<ki-switch checked>Autosave</ki-switch>
<ki-switch>Desktop notifications</ki-switch>
```

While on, a named switch contributes `name`/`value` to native form data (`on` when `value` is omitted, checkbox parity); while off it contributes nothing:

```html
<form>
  <ki-switch name="tracking" value="enabled" checked>Usage analytics</ki-switch>
</form>
```

User toggles dispatch composed `input` and `change` events — apply the setting immediately, a switch never waits for a submit; `disabled` preserves the current state while removing the switch from keyboard reach and form data:

```html
<ki-switch checked disabled>Beta features (unavailable on this plan)</ki-switch>
```

## An error from the application

Set `custom-error` to show the application's verdict on a setting it could
not apply. The switch is invalid, blocks its form and is announced as
invalid at once. Toggling it withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-switch name="two-step" checked custom-error="Add a phone number before turning on two-step sign-in.">Two-step sign-in</ki-switch>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-switch`: the default, only the tokens ki-switch needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `checked` (boolean, default false): Live on/off state. Boolean presence semantics apply: any present `checked` attribute value, including `checked="false"` or malformed agent output, means on. Omit the attribute to express off. When to use: set the initial on state for a setting that applies immediately. When NOT to use: do not use a switch for choices saved only on submit; use ki-checkbox for that pattern.
- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted setting ("Two-step sign-in needs a phone number"). While it holds text the switch is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting when the person toggles the switch, or when the form is reset, so it never blocks the corrected answer. It outranks an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for help that is not an error; use `help-text`. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Prevents toggling, removes the switch from keyboard reach, excludes it from form data, and exposes the unavailable state to assistive technology. When to use: make a setting temporarily unavailable while preserving its current state. When NOT to use: do not use disabled for pending or loading states.
- `help-text` (string | undefined): One line of help under the switch, read with it as its description: what turning it on changes. When NOT to use: do not repeat the label. A switch has no constraint of its own, so it takes no error text; an error the application sets with `custom-error` or `setCustomValidity` shows in this line's place.
- `name` (string | undefined): Form-data key contributed while the switch is on. When to use: include the immediate setting in native form data when on. When NOT to use: omit when no form entry should be submitted.
- `size` ("lg" | "md" | "sm" | "xl", default 'md'): Token-backed size: the track is 32 x 18, 40 x 22, 48 x 26 or 56 x 32px in onmars (`xl` is the design's mobile size), with its thumb. `sm` also takes the smaller label (13/20, 8px away). An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the text and controls around it. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string | undefined): Form-data value submitted while on. Omit for native checkbox parity: the submitted value defaults to `on`. When to use: submit a domain-specific value instead of the default `on`. When NOT to use: do not set a value to represent off; off contributes nothing.

## Slots

- (default): Label content. This is the accessible name source.

## Parts

- `error`: Line that shows, in place of the help text, an error the application set with `setCustomValidity` once the form is submitted; a polite live region, starting with a decorative error symbol.
- `help`: Help line under the switch, read as its description.
- `label`: Label wrapper around the default slot.
- `thumb`: Traveling handle.
- `track`: On/off channel.

## Events

- `change` (Event): Fired once after a user toggle commits, composed across the shadow boundary; `checked` is already current when listeners run. `click()` from a script, or a page `<label>` for the switch, toggles it like a native checkbox: one `input`, then one `change`. When to use: apply the on/off effect. When NOT to use: do not expect it for programmatic `checked` writes, which are silent.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-switch-border-width`: dimension used by the switch component for border width (MarsUI tracks are borderless; the 1px hairline in ki.outline.control is the declared WCAG 1.4.11 deviation at half the former weight, so the control stops reading as an outlined pill).
- `--ki-switch-checked-active-border`: color used by the switch component for checked active border.
- `--ki-switch-checked-active-thumb`: color used by the switch component for checked active thumb.
- `--ki-switch-checked-active-track`: color used by the switch component for checked active track.
- `--ki-switch-checked-disabled-border`: color used by the switch component for checked disabled border.
- `--ki-switch-checked-disabled-thumb`: color used by the switch component for checked disabled thumb (MarsUI pointer keeps its light construction in every state including disabled).
- `--ki-switch-checked-disabled-track`: color used by the switch component for checked disabled track (MarsUI disabled track keeps the OFF rest fill surface/disabled_med_em; the disabled signal lives in the glyph in the master).
- `--ki-switch-checked-hover-border`: color used by the switch component for checked hover border.
- `--ki-switch-checked-hover-thumb`: color used by the switch component for checked hover thumb.
- `--ki-switch-checked-hover-track`: color used by the switch component for checked hover track.
- `--ki-switch-checked-rest-border`: color used by the switch component for checked rest border.
- `--ki-switch-checked-rest-thumb`: color used by the switch component for checked rest thumb.
- `--ki-switch-checked-rest-track`: color used by the switch component for checked rest track.
- `--ki-switch-control-height`: dimension used by the switch component for the control footprint height at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. The well pads the track by half of (control-height - track-height) on every side.
- `--ki-switch-control-width`: dimension used by the switch component for the control footprint width at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. The well is centred in it; set it to the track width, with control-height, to drop the well.
- `--ki-switch-focus-ring-color`: color used by the switch component for focus ring color.
- `--ki-switch-focus-ring-offset`: dimension used by the switch component for focus ring offset.
- `--ki-switch-focus-ring-shadow`: shadow used by the switch component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-switch-focus-ring-width`: dimension used by the switch component for focus ring width.
- `--ki-switch-gap`: dimension used by the switch component for the gap between the control and its label at sizes md, lg and xl; sm-gap sets sm.
- `--ki-switch-glyph-checked`: Color of the enabled checked switch's thumb check. Use transparent to hide it. When visible, maintain 3:1 contrast with the thumb.
- `--ki-switch-glyph-dash-height`: dimension used by the switch component for the disabled dash glyph block size (Figma pointer exports: 8x2 rounded dash).
- `--ki-switch-glyph-disabled`: Color of the thumb check or dash on a disabled switch. Use transparent to hide both disabled glyphs.
- `--ki-switch-glyph-height`: dimension used by the switch component for the thumb state glyph block size (Figma pointer exports: 4px check ink height).
- `--ki-switch-glyph-unchecked`: Color of the enabled unchecked switch's thumb dash. Transparent hides it by default. When visible, maintain 3:1 contrast with the thumb.
- `--ki-switch-glyph-width`: dimension used by the switch component for the thumb state glyph inline size (Figma pointer exports: 8px check/dash ink box inside the thumb).
- `--ki-switch-lg-control-height`: dimension used by the switch component for the control footprint height at size lg.
- `--ki-switch-lg-control-width`: dimension used by the switch component for the control footprint width at size lg.
- `--ki-switch-lg-min-target`: dimension used by the switch component for min target at size lg.
- `--ki-switch-lg-thumb-inset`: dimension used by the switch component for thumb inset at size lg.
- `--ki-switch-lg-thumb-radius`: dimension used by the switch component for thumb radius at size lg.
- `--ki-switch-lg-thumb-size`: dimension used by the switch component for thumb block size at size lg.
- `--ki-switch-lg-thumb-width`: dimension used by the switch component for thumb inline size at size lg.
- `--ki-switch-lg-track-height`: dimension used by the switch component for track height at size lg.
- `--ki-switch-lg-track-radius`: dimension used by the switch component for track radius at size lg.
- `--ki-switch-lg-track-width`: dimension used by the switch component for track width at size lg.
- `--ki-switch-lg-well-radius`: dimension used by the switch component for the well radius at size lg.
- `--ki-switch-min-target`: dimension used by the switch component for min target at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-sm-control-height`: dimension used by the switch component for the control footprint height at size sm.
- `--ki-switch-sm-control-width`: dimension used by the switch component for the control footprint width at size sm.
- `--ki-switch-sm-gap`: dimension used by the switch component for the gap between the control and its label at size sm.
- `--ki-switch-sm-label-font-size`: dimension used by the switch component for the label font size at size sm.
- `--ki-switch-sm-label-line-height`: dimension used by the switch component for the label line height at size sm.
- `--ki-switch-sm-min-target`: dimension used by the switch component for min target at size sm.
- `--ki-switch-sm-thumb-inset`: dimension used by the switch component for thumb inset at size sm.
- `--ki-switch-sm-thumb-radius`: dimension used by the switch component for thumb radius at size sm.
- `--ki-switch-sm-thumb-size`: dimension used by the switch component for thumb block size at size sm.
- `--ki-switch-sm-thumb-width`: dimension used by the switch component for thumb inline size at size sm.
- `--ki-switch-sm-track-height`: dimension used by the switch component for track height at size sm.
- `--ki-switch-sm-track-radius`: dimension used by the switch component for track radius at size sm.
- `--ki-switch-sm-track-width`: dimension used by the switch component for track width at size sm.
- `--ki-switch-sm-well-radius`: dimension used by the switch component for the well radius at size sm.
- `--ki-switch-thumb-inset`: dimension used by the switch component for thumb inset at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-thumb-radius`: dimension used by the switch component for thumb radius at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-thumb-shadow`: shadow used by the switch component for the thumb in every state and size. Set it to none to drop the shadow.
- `--ki-switch-thumb-size`: dimension used by the switch component for thumb block size at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-thumb-width`: dimension used by the switch component for thumb inline size at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-track-height`: dimension used by the switch component for track height at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-track-radius`: dimension used by the switch component for track radius at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-track-width`: dimension used by the switch component for track width at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-unchecked-active-border`: color used by the switch component for unchecked active border.
- `--ki-switch-unchecked-active-thumb`: color used by the switch component for unchecked active thumb.
- `--ki-switch-unchecked-active-track`: color used by the switch component for unchecked active track (one step beyond hover; the master defines no pressed variant).
- `--ki-switch-unchecked-disabled-border`: color used by the switch component for unchecked disabled border.
- `--ki-switch-unchecked-disabled-thumb`: color used by the switch component for unchecked disabled thumb (MarsUI pointer keeps its light construction in every state including disabled).
- `--ki-switch-unchecked-disabled-track`: color used by the switch component for unchecked disabled track (MarsUI disabled track keeps the OFF rest fill surface/disabled_med_em; the disabled signal lives in the glyph in the master).
- `--ki-switch-unchecked-hover-border`: color used by the switch component for unchecked hover border.
- `--ki-switch-unchecked-hover-thumb`: color used by the switch component for unchecked hover thumb.
- `--ki-switch-unchecked-hover-track`: color used by the switch component for unchecked hover track (Kimen-invented one-step ramp over the corrected rest fill; the master defines no hover variant).
- `--ki-switch-unchecked-rest-border`: color used by the switch component for unchecked rest border.
- `--ki-switch-unchecked-rest-thumb`: color used by the switch component for unchecked rest thumb.
- `--ki-switch-unchecked-rest-track`: color used by the switch component for unchecked rest track (MarsUI OFF track = surface/disabled_med_em #dddfe4 light / White-18 dark — a solid soft fill, not an outlined pill).
- `--ki-switch-well-bg-end`: color used by the switch component for the bottom of the well gradient, at every size.
- `--ki-switch-well-bg-start`: color used by the switch component for the top of the well gradient, at every size. Transparent drops the well.
- `--ki-switch-well-radius`: dimension used by the switch component for the radius of the well that holds the track at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes.
- `--ki-switch-xl-control-height`: dimension used by the switch component for the control footprint height at size xl.
- `--ki-switch-xl-control-width`: dimension used by the switch component for the control footprint width at size xl.
- `--ki-switch-xl-min-target`: dimension used by the switch component for min target at size xl.
- `--ki-switch-xl-thumb-inset`: dimension used by the switch component for thumb inset at size xl.
- `--ki-switch-xl-thumb-radius`: dimension used by the switch component for thumb radius at size xl.
- `--ki-switch-xl-thumb-size`: dimension used by the switch component for thumb block size at size xl.
- `--ki-switch-xl-thumb-width`: dimension used by the switch component for thumb inline size at size xl.
- `--ki-switch-xl-track-height`: dimension used by the switch component for track height at size xl.
- `--ki-switch-xl-track-radius`: dimension used by the switch component for track radius at size xl.
- `--ki-switch-xl-track-width`: dimension used by the switch component for track width at size xl.
- `--ki-switch-xl-well-radius`: dimension used by the switch component for the well radius at size xl.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
