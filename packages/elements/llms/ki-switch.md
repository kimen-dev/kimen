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

The slotted label provides the accessible name.

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

## Settings row

Stretch the switch in a grid or set `display: block` on the host. Put the
current value in `slot="end"`. The default slot supplies the switch name and
the value sits at the inline end. Update the value when the switch changes.

```html
<ki-switch style="display: block" checked help-text="Get account updates by email.">
  Email notifications<span slot="end">On</span>
</ki-switch>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-switch`: the default, only the tokens ki-switch needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `checked` (boolean, default false): Live on/off state. When to use: set the initial on state for a setting that applies immediately. When NOT to use: do not use a switch for choices saved only on submit; use ki-checkbox for that pattern.
- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted setting ("Two-step sign-in needs a phone number"). While it holds text the switch is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting when the person toggles the switch, or when the form is reset, so it never blocks the corrected answer. It outranks an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for help that is not an error; use `help-text`. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Prevents toggling, removes the switch from keyboard reach, excludes it from form data, and exposes the unavailable state to assistive technology. When to use: make a setting temporarily unavailable while preserving its current state. When NOT to use: do not use disabled for pending or loading states.
- `help-text` (string | undefined): One line of help under the switch, read with it as its description: what turning it on changes. When NOT to use: do not repeat the label. A switch has no constraint of its own, so it takes no error text; an error the application sets with `custom-error` or `setCustomValidity` shows in this line's place.
- `name` (string | undefined): Form-data key contributed while the switch is on. When to use: include the immediate setting in native form data when on. When NOT to use: omit when no form entry should be submitted.
- `size` ("lg" | "md" | "sm" | "xl", default 'md'): Token-backed size: the track is 32 x 18, 40 x 22, 48 x 26 or 56 x 32px in onmars (`xl` is the design's mobile size), with its thumb. `sm` also takes the smaller label (13/20, 8px away). An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the text and controls around it. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string | undefined): Form-data value submitted while on. Omit for native checkbox parity: the submitted value defaults to `on`. When to use: submit a domain-specific value instead of the default `on`. When NOT to use: do not set a value to represent off; off contributes nothing.

## Slots

- (default): Label content. This is the accessible name source.
- `end`: Trailing value outside the label.

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

## Other CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-switch-border-width`: dimension used by the switch component for border width (MarsUI tracks are borderless; the 1px hairline in ki.outline.control is the declared WCAG 1.4.11 deviation at half the former weight, so the control stops reading as an outlined pill). Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-xxs)`.
- `--ki-switch-control-height`: dimension used by the switch component for the control footprint height at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. The well pads the track by half of (control-height - track-height) on every side. Default: onmars `var(--ki-space-9xl)`, material3 `var(--ki-space-10xl)`.
- `--ki-switch-control-width`: dimension used by the switch component for the control footprint width at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. The well is centred in it; set it to the track width, with control-height, to drop the well. Default: onmars `var(--ki-space-14xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-gap`: dimension used by the switch component for the gap between the control and its label at sizes md, lg and xl; sm-gap sets sm. Default: onmars `var(--ki-space-xl)`, material3 `var(--ki-space-md)`.
- `--ki-switch-glyph-checked`: Color of the enabled checked switch's thumb check. Use transparent to hide it. When visible, maintain 3:1 contrast with the thumb. Default: `var(--ki-text-primary-on-primary-light)`.
- `--ki-switch-glyph-dash-height`: dimension used by the switch component for the disabled dash glyph block size (Figma pointer exports: 8x2 rounded dash). Default: `var(--ki-space-xxs)`.
- `--ki-switch-glyph-disabled`: Color of the thumb check or dash on a disabled switch. Use transparent to hide both disabled glyphs. Default: `var(--ki-text-base-em)`.
- `--ki-switch-glyph-height`: dimension used by the switch component for the thumb state glyph block size (Figma pointer exports: 4px check ink height). Default: `var(--ki-space-sm)`.
- `--ki-switch-glyph-unchecked`: Color of the enabled unchecked switch's thumb dash. Transparent hides it by default. When visible, maintain 3:1 contrast with the thumb. Default: `var(--ki-text-none)`.
- `--ki-switch-glyph-width`: dimension used by the switch component for the thumb state glyph inline size (Figma pointer exports: 8px check/dash ink box inside the thumb). Default: `var(--ki-space-md)`.
- `--ki-switch-label-font-size`: Label font size. Default: `var(--ki-typography-size-body-2)`.
- `--ki-switch-label-line-height`: Label line height. Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-switch-lg-control-height`: dimension used by the switch component for the control footprint height at size lg. Default: `var(--ki-space-10xl)`.
- `--ki-switch-lg-control-width`: dimension used by the switch component for the control footprint width at size lg. Default: onmars `var(--ki-space-16xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-lg-label-font-size`: Label font size. Default: `var(--ki-typography-size-body-2)`.
- `--ki-switch-lg-label-line-height`: Label line height. Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-switch-lg-min-target`: dimension used by the switch component for min target at size lg. Default: onmars `var(--ki-space-10xl)`, material3 `var(--ki-space-9xl)`.
- `--ki-switch-lg-thumb-inset`: dimension used by the switch component for thumb inset at size lg. Default: onmars `var(--ki-space-xxs)`, material3 `var(--ki-space-xs)`.
- `--ki-switch-lg-thumb-radius`: dimension used by the switch component for thumb radius at size lg. Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-lg-thumb-size`: dimension used by the switch component for thumb block size at size lg. Default: onmars `var(--ki-space-5xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-lg-thumb-width`: dimension used by the switch component for thumb inline size at size lg. Default: onmars `var(--ki-space-8xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-lg-track-height`: dimension used by the switch component for track height at size lg. Default: onmars `var(--ki-space-8xl)`, material3 `var(--ki-space-10xl)`.
- `--ki-switch-lg-track-radius`: dimension used by the switch component for track radius at size lg. Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-lg-track-width`: dimension used by the switch component for track width at size lg. Default: onmars `var(--ki-space-14xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-lg-well-radius`: dimension used by the switch component for the well radius at size lg. Default: `var(--ki-radius-component-md)`.
- `--ki-switch-min-target`: dimension used by the switch component for min target at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: `var(--ki-space-9xl)`.
- `--ki-switch-sm-control-height`: dimension used by the switch component for the control footprint height at size sm. Default: onmars `var(--ki-space-9xl)`, material3 `var(--ki-space-10xl)`.
- `--ki-switch-sm-control-width`: dimension used by the switch component for the control footprint width at size sm. Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-sm-gap`: dimension used by the switch component for the gap between the control and its label at size sm. Default: `var(--ki-space-md)`.
- `--ki-switch-sm-label-font-size`: dimension used by the switch component for the label font size at size sm. Default: `var(--ki-typography-size-body-1)`.
- `--ki-switch-sm-label-line-height`: dimension used by the switch component for the label line height at size sm. Default: `var(--ki-typography-line-height-para)`.
- `--ki-switch-sm-min-target`: dimension used by the switch component for min target at size sm. Default: `var(--ki-space-9xl)`.
- `--ki-switch-sm-thumb-inset`: dimension used by the switch component for thumb inset at size sm. Default: onmars `var(--ki-space-xxs)`, material3 `var(--ki-space-xs)`.
- `--ki-switch-sm-thumb-radius`: dimension used by the switch component for thumb radius at size sm. Default: onmars `var(--ki-radius-component-xxs)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-sm-thumb-size`: dimension used by the switch component for thumb block size at size sm. Default: onmars `var(--ki-space-2xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-sm-thumb-width`: dimension used by the switch component for thumb inline size at size sm. Default: onmars `var(--ki-space-4xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-sm-track-height`: dimension used by the switch component for track height at size sm. Default: onmars `var(--ki-space-4xl)`, material3 `var(--ki-space-10xl)`.
- `--ki-switch-sm-track-radius`: dimension used by the switch component for track radius at size sm. Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-sm-track-width`: dimension used by the switch component for track width at size sm. Default: onmars `var(--ki-space-10xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-sm-well-radius`: dimension used by the switch component for the well radius at size sm. Default: `var(--ki-radius-component-md)`.
- `--ki-switch-thumb-inset`: dimension used by the switch component for thumb inset at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-space-xxs)`, material3 `var(--ki-space-xs)`.
- `--ki-switch-thumb-radius`: dimension used by the switch component for thumb radius at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-thumb-shadow`: shadow used by the switch component for the thumb in every state and size. Set it to none to drop the shadow. Default: `var(--ki-effect-small-dark-shadow)`.
- `--ki-switch-thumb-size`: dimension used by the switch component for thumb block size at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-space-4xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-thumb-width`: dimension used by the switch component for thumb inline size at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-space-6xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-track-height`: dimension used by the switch component for track height at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-space-6xl)`, material3 `var(--ki-space-10xl)`.
- `--ki-switch-track-radius`: dimension used by the switch component for track radius at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-radius-md)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-track-width`: dimension used by the switch component for track width at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-well-bg-end`: color used by the switch component for the bottom of the well gradient, at every size. Default: onmars `var(--ki-surface-s1)`, material3 `var(--ki-color-transparent-black)`.
- `--ki-switch-well-bg-start`: color used by the switch component for the top of the well gradient, at every size. Transparent drops the well. Default: onmars `var(--ki-surface-s3)`, material3 `var(--ki-color-transparent-black)`.
- `--ki-switch-well-radius`: dimension used by the switch component for the radius of the well that holds the track at the default md size (unprefixed); sm-, lg- and xl- tokens set the other sizes. Default: `var(--ki-radius-component-md)`.
- `--ki-switch-xl-control-height`: dimension used by the switch component for the control footprint height at size xl. Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-10xl)`.
- `--ki-switch-xl-control-width`: dimension used by the switch component for the control footprint width at size xl. Default: onmars `var(--ki-space-18xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-xl-label-font-size`: Label font size. Default: `var(--ki-typography-size-body-2)`.
- `--ki-switch-xl-label-line-height`: Label line height. Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-switch-xl-min-target`: dimension used by the switch component for min target at size xl. Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-9xl)`.
- `--ki-switch-xl-thumb-inset`: dimension used by the switch component for thumb inset at size xl. Default: `var(--ki-space-xs)`.
- `--ki-switch-xl-thumb-radius`: dimension used by the switch component for thumb radius at size xl. Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-xl-thumb-size`: dimension used by the switch component for thumb block size at size xl. Default: `var(--ki-space-7xl)`.
- `--ki-switch-xl-thumb-width`: dimension used by the switch component for thumb inline size at size xl. Default: onmars `var(--ki-space-10xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-switch-xl-track-height`: dimension used by the switch component for track height at size xl. Default: `var(--ki-space-10xl)`.
- `--ki-switch-xl-track-radius`: dimension used by the switch component for track radius at size xl. Default: onmars `var(--ki-radius-component-md)`, material3 `var(--ki-radius-round)`.
- `--ki-switch-xl-track-width`: dimension used by the switch component for track width at size xl. Default: onmars `var(--ki-space-16xl)`, material3 `var(--ki-space-15xl)`.
- `--ki-switch-xl-well-radius`: dimension used by the switch component for the well radius at size xl. Default: onmars `var(--ki-radius-component-lg)`, material3 `var(--ki-radius-component-md)`.
- `--ki-text-danger-high-em`: semantic color for text danger high em. Default: onmars `light-dark(#c21a45,var(--ki-color-danger-300))`, material3 `light-dark(#8c1d18,#f2b8b5)`.
- `--ki-text-high-em`: semantic color for text high em. Default: onmars `light-dark(var(--ki-color-gray-950),#edebe7)`, material3 `light-dark(#1d1b20,#e6e0e9)`.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted). Default: `var(--ki-text-med-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal. Default: `var(--ki-font-weight-body-normal)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | checked-active | `--ki-switch-checked-active-border` | `var(--ki-outline-none)` | color used by the switch component for checked active border. |
| — | — | checked-active | `--ki-switch-checked-active-thumb` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-text-primary-on-primary)` | color used by the switch component for checked active thumb. |
| — | — | checked-active | `--ki-switch-checked-active-track` | `var(--ki-surface-primary-med-em-hover)` | color used by the switch component for checked active track. |
| — | — | checked-disabled | `--ki-switch-checked-disabled-border` | `var(--ki-surface-disabled-med-em)` | color used by the switch component for checked disabled border. |
| — | — | checked-disabled | `--ki-switch-checked-disabled-thumb` | `var(--ki-surface-special-light-s0-dark-s4)` | color used by the switch component for checked disabled thumb (MarsUI pointer keeps its light construction in every state including disabled). |
| — | — | checked-disabled | `--ki-switch-checked-disabled-track` | `var(--ki-surface-disabled-med-em)` | color used by the switch component for checked disabled track (MarsUI disabled track keeps the OFF rest fill surface/disabled_med_em; the disabled signal lives in the glyph in the master). |
| — | — | checked-hover | `--ki-switch-checked-hover-border` | `var(--ki-outline-none)` | color used by the switch component for checked hover border. |
| — | — | checked-hover | `--ki-switch-checked-hover-thumb` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-text-primary-on-primary)` | color used by the switch component for checked hover thumb. |
| — | — | checked-hover | `--ki-switch-checked-hover-track` | `var(--ki-surface-primary-med-em-hover)` | color used by the switch component for checked hover track. |
| — | — | checked-rest | `--ki-switch-checked-rest-border` | `var(--ki-outline-none)` | color used by the switch component for checked rest border. |
| — | — | checked-rest | `--ki-switch-checked-rest-thumb` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-text-primary-on-primary)` | color used by the switch component for checked rest thumb. |
| — | — | checked-rest | `--ki-switch-checked-rest-track` | `var(--ki-surface-primary-med-em)` | color used by the switch component for checked rest track. |
| — | — | focus | `--ki-switch-focus-ring-color` | `var(--ki-focus-ring-color)` | color used by the switch component for focus ring color. |
| — | — | focus | `--ki-switch-focus-ring-offset` | `var(--ki-focus-ring-offset)` | dimension used by the switch component for focus ring offset. |
| — | — | focus | `--ki-switch-focus-ring-shadow` | `var(--ki-focus-primary)` | shadow used by the switch component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator). |
| — | — | focus | `--ki-switch-focus-ring-width` | `var(--ki-focus-ring-width)` | dimension used by the switch component for focus ring width. |
| — | — | unchecked-active | `--ki-switch-unchecked-active-border` | `var(--ki-outline-control-hover)` | color used by the switch component for unchecked active border. |
| — | — | unchecked-active | `--ki-switch-unchecked-active-thumb` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-outline-high-em)` | color used by the switch component for unchecked active thumb. |
| — | — | unchecked-active | `--ki-switch-unchecked-active-track` | onmars `var(--ki-surface-disabled-high-em)`, material3 `var(--ki-surface-s5)` | color used by the switch component for unchecked active track (one step beyond hover; the master defines no pressed variant). |
| — | — | unchecked-disabled | `--ki-switch-unchecked-disabled-border` | `var(--ki-surface-disabled-med-em)` | color used by the switch component for unchecked disabled border. |
| — | — | unchecked-disabled | `--ki-switch-unchecked-disabled-thumb` | `var(--ki-surface-special-light-s0-dark-s4)` | color used by the switch component for unchecked disabled thumb (MarsUI pointer keeps its light construction in every state including disabled). |
| — | — | unchecked-disabled | `--ki-switch-unchecked-disabled-track` | `var(--ki-surface-disabled-med-em)` | color used by the switch component for unchecked disabled track (MarsUI disabled track keeps the OFF rest fill surface/disabled_med_em; the disabled signal lives in the glyph in the master). |
| — | — | unchecked-hover | `--ki-switch-unchecked-hover-border` | `var(--ki-outline-control-hover)` | color used by the switch component for unchecked hover border. |
| — | — | unchecked-hover | `--ki-switch-unchecked-hover-thumb` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-outline-high-em)` | color used by the switch component for unchecked hover thumb. |
| — | — | unchecked-hover | `--ki-switch-unchecked-hover-track` | onmars `var(--ki-surface-s5)`, material3 `var(--ki-surface-s4)` | color used by the switch component for unchecked hover track (Kimen-invented one-step ramp over the corrected rest fill; the master defines no hover variant). |
| — | — | unchecked-rest | `--ki-switch-unchecked-rest-border` | `var(--ki-outline-control)` | color used by the switch component for unchecked rest border. |
| — | — | unchecked-rest | `--ki-switch-unchecked-rest-thumb` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-outline-high-em)` | color used by the switch component for unchecked rest thumb. |
| — | — | unchecked-rest | `--ki-switch-unchecked-rest-track` | onmars `var(--ki-surface-disabled-med-em)`, material3 `var(--ki-surface-s3)` | color used by the switch component for unchecked rest track (MarsUI OFF track = surface/disabled_med_em #dddfe4 light / White-18 dark — a solid soft fill, not an outlined pill). |
