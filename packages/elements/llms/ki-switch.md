# ki-switch

> A token-styled switch for immediate on/off settings. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously, on the custom-elements build (not on hosts created by the lazy loader).

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

## Attributes

- `checked` (boolean, default false): Live on/off state. Boolean presence semantics apply: any present `checked` attribute value, including `checked="false"` or malformed agent output, means on. Omit the attribute to express off. When to use: set the initial on state for a setting that applies immediately. When NOT to use: do not use a switch for choices saved only on submit; use ki-checkbox for that pattern.
- `disabled` (boolean, default false): Prevents toggling, removes the switch from keyboard reach, excludes it from form data, and exposes the unavailable state to assistive technology. When to use: make a setting temporarily unavailable while preserving its current state. When NOT to use: do not use disabled for pending or loading states.
- `help-text` (string | undefined): One line of help under the switch, read with it as its description: what turning it on changes. When NOT to use: do not repeat the label. A switch has no constraint of its own, so it takes no error text; an error the application sets with `setCustomValidity` shows in this line's place.
- `name` (string | undefined): Form-data key contributed while the switch is on. When to use: include the immediate setting in native form data when on. When NOT to use: omit when no form entry should be submitted.
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

- `change` (Event): Fired once after a user toggle commits, composed across the shadow boundary; `checked` is already current when listeners run. When to use: apply the on/off effect. When NOT to use: do not expect it for programmatic `checked` writes, which are silent.

## Methods

None.

## CSS custom properties

- `--ki-effect-small-dark-shadow`: MarsUI Small_dark_shadow: drop 0/2/3/-1.5 in Elevation/shadow_dark (Black/32 light, Black/48 dark). Lifts small light glyphs off saturated fills — the radio selected dot and the switch pointer carry it in the masters.
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
- `--ki-switch-focus-ring-color`: color used by the switch component for focus ring color.
- `--ki-switch-focus-ring-offset`: dimension used by the switch component for focus ring offset.
- `--ki-switch-focus-ring-shadow`: shadow used by the switch component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-switch-focus-ring-width`: dimension used by the switch component for focus ring width.
- `--ki-switch-gap`: dimension used by the switch component for gap (MarsUI sm label pairing: Space/md 8px).
- `--ki-switch-glyph-dash-height`: dimension used by the switch component for the disabled dash glyph block size (Figma pointer exports: 8x2 rounded dash).
- `--ki-switch-glyph-height`: dimension used by the switch component for the thumb state glyph block size (Figma pointer exports: 4px check ink height).
- `--ki-switch-glyph-width`: dimension used by the switch component for the thumb state glyph inline size (Figma pointer exports: 8px check/dash ink box inside the thumb).
- `--ki-switch-min-target`: dimension used by the switch component for min target (MarsUI component frame is 28px tall for sm/md — the designed interactive footprint).
- `--ki-switch-thumb-inset`: dimension used by the switch component for thumb inset.
- `--ki-switch-thumb-radius`: dimension used by the switch component for thumb radius (MarsUI pointer corner radius is half the height with corner smoothing; radius_round clamps to the smoothed pill).
- `--ki-switch-thumb-size`: dimension used by the switch component for thumb size.
- `--ki-switch-thumb-width`: dimension used by the switch component for thumb inline size (MarsUI md pointer is 22x18 — wider than tall; thumb-size remains the block size).
- `--ki-switch-track-height`: dimension used by the switch component for track height.
- `--ki-switch-track-radius`: dimension used by the switch component for track radius.
- `--ki-switch-track-width`: dimension used by the switch component for track width.
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
- `--ki-text-base-em`: semantic color for text base em.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-med-em`: semantic color for text med em.
- `--ki-text-primary-on-primary-light`: semantic color for text primary on primary light.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
