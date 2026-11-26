# ki-radio

> One option in a token-styled radio group.

## When to use

place inside `ki-radio-group` when a person must choose
exactly one of a small visible set.

## When not to use

`ki-radio` standalone, multiple selection,
or authored selection state; set the parent group's `value` instead.

## Examples

Each option is a `ki-radio` child of a `ki-radio-group`; the slotted text is the option's accessible name and activation surface, and `value` is what the group submits when the option is selected:

```html
<ki-radio-group label="Delivery speed" name="delivery">
  <ki-radio value="standard">Standard (3–5 days)</ki-radio>
  <ki-radio value="express">Express (1–2 days)</ki-radio>
</ki-radio-group>
```

A disabled option cannot be selected or focused, and group arrow navigation skips it:

```html
<ki-radio-group label="Plan" name="plan" value="pro">
  <ki-radio value="free">Free</ki-radio>
  <ki-radio value="pro">Pro</ki-radio>
  <ki-radio value="enterprise" disabled>Enterprise (contact sales)</ki-radio>
</ki-radio-group>
```

Selection is never authored on the option — the parent group's `value` selects the matching option:

```html
<ki-radio-group label="Theme" name="theme" value="dark">
  <ki-radio value="light">Light</ki-radio>
  <ki-radio value="dark">Dark</ki-radio>
  <ki-radio value="system">Match system</ki-radio>
</ki-radio-group>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-radio`: the default, only the tokens ki-radio needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `disabled` (boolean, default false): Prevents this option from being selected or focused. Disabled options are skipped by group arrow navigation and omitted from form submission when selected before becoming disabled. When NOT to use: do not use disabled as a temporary loading state.
- `value` (string, default 'on'): Submission value projected by the parent `ki-radio-group` when this option is selected. Omit for native radio parity with value `"on"`. When NOT to use: do not use `value` to author selection; set the group's `value` property or attribute.

## Slots

- (default): Option label. This is the accessible name and activation surface.

## Parts

- `control`: Visual ring and selected dot.
- `label`: Wrapper around the option label.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-effect-component-primary-default-shadow`: MarsUI Component_effect/primary_default: drop 0/1/1/-0.5 plus inner White/12 0/3/3. Pair with --ki-effect-component-backdrop-filter — CSS cannot mix backdrop blur into box-shadow.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-emphasized-out`: Expressive exit curve for selected controls. Onmars eases out without overshoot.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-radio-border-width`: dimension used by the radio component for border width.
- `--ki-radio-control-radius`: dimension used by the radio component for control radius.
- `--ki-radio-control-size`: dimension used by the radio component for control size.
- `--ki-radio-dot-shadow`: shadow used by the radio component for the selected dot (MarsUI Small_dark_shadow: drop 0/2/3/-1.5 Elevation/shadow_dark, the lifted-dot look of the master).
- `--ki-radio-dot-size`: dimension used by the radio component for dot size.
- `--ki-radio-focus-ring-color`: color used by the radio component for focus ring color.
- `--ki-radio-focus-ring-offset`: dimension used by the radio component for focus ring offset.
- `--ki-radio-focus-ring-shadow`: shadow used by the radio component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-radio-focus-ring-width`: dimension used by the radio component for focus ring width.
- `--ki-radio-gap`: dimension used by the radio component for gap (MarsUI md label pairing: Space/xl 12px for the 20px circle / 24px target geometry).
- `--ki-radio-label-font-size`: dimension used by the radio component for label font size (MarsUI md pairing: body_2 15px; line-height stays 24 and weight 500).
- `--ki-radio-label-font-weight`: font weight used by the radio component for label font weight.
- `--ki-radio-label-line-height`: dimension used by the radio component for label line height.
- `--ki-radio-min-target`: dimension used by the radio component for min target.
- `--ki-radio-selected-active-bg`: color used by the radio component for selected active background (MarsUI defines no pressed state; mirrors rest).
- `--ki-radio-selected-active-border`: color used by the radio component for selected active border (same as the fill: borderless look).
- `--ki-radio-selected-active-fg`: color used by the radio component for selected active foreground.
- `--ki-radio-selected-active-overlay`: color used by the radio component for the selected pressed wash (ki-button active/overlay precedent). MarsUI defines no pressed fill and the brand ramp has no darker rung that survives the dark scheme, so the press composites the pressed state layer over the rest fill — a keyboard hold shows a real paint delta even under reduced motion, where the transform compress is gated off (bare-page state-delta contract).
- `--ki-radio-selected-disabled-bg`: color used by the radio component for selected disabled background (MarsUI Surface/disabled_med_em Gray/300).
- `--ki-radio-selected-disabled-border`: color used by the radio component for selected disabled border (same as the fill: borderless look).
- `--ki-radio-selected-disabled-fg`: color used by the radio component for selected disabled dot (MarsUI Surface/disabled_base_em Gray/100 — a light dot one quiet value step above the gray donut, not a dark dot).
- `--ki-radio-selected-hover-bg`: color used by the radio component for selected hover background (the master has no selected-hover variant; mirrors ki-checkbox checked hover: a real delta in both schemes).
- `--ki-radio-selected-hover-border`: color used by the radio component for selected hover border (same as the fill: borderless look).
- `--ki-radio-selected-hover-fg`: color used by the radio component for selected hover foreground.
- `--ki-radio-selected-rest-bg`: color used by the radio component for selected rest background (MarsUI active radio is a solid Surface/primary_med_em #845abe circle — the filled donut with a white dot is the signature, mirroring ki-checkbox checked).
- `--ki-radio-selected-rest-border`: color used by the radio component for selected rest border (same as the fill: the selected circle is borderless in the master).
- `--ki-radio-selected-rest-fg`: color used by the radio component for selected rest dot (MarsUI Text/primary_on_primary white 8px dot).
- `--ki-radio-unselected-active-bg`: color used by the radio component for unselected active background. Brief §1: neutral surface em ramp one step above hover (s1→s2), matching ki-checkbox unchecked active; the primary-tinted alpha stays in radio.material3.
- `--ki-radio-unselected-active-border`: color used by the radio component for unselected active border.
- `--ki-radio-unselected-active-fg`: color used by the radio component for unselected active foreground.
- `--ki-radio-unselected-disabled-bg`: color used by the radio component for unselected disabled background (MarsUI Surface/disabled_med_em Gray/300).
- `--ki-radio-unselected-disabled-border`: color used by the radio component for unselected disabled border (same as the fill: borderless look in the master).
- `--ki-radio-unselected-disabled-fg`: color used by the radio component for unselected disabled dot color (dot is hidden unselected; kept coherent with the disabled ladder, retiring the deprecated ki.text.muted alias).
- `--ki-radio-unselected-hover-bg`: color used by the radio component for unselected hover background. Brief §1: onmars hover is neutral (hover overlay / surface em ramp), matching ki-checkbox unchecked hover (s1); the former primary-tinted alpha is the M3 state-layer pattern and stays in radio.material3.
- `--ki-radio-unselected-hover-border`: color used by the radio component for unselected hover border.
- `--ki-radio-unselected-hover-fg`: color used by the radio component for unselected hover foreground.
- `--ki-radio-unselected-rest-bg`: color used by the radio component for unselected rest background.
- `--ki-radio-unselected-rest-border`: color used by the radio component for unselected rest border.
- `--ki-radio-unselected-rest-fg`: color used by the radio component for unselected rest foreground.
- `--ki-surface-special-dark-s0-light-s2`: semantic color for surface special dark s0 light s2.
- `--ki-surface-special-light-s0-dark-s4`: semantic color for surface special light s0 dark s4.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-med-em`: semantic color for text med em.
- `--ki-typography-family-body`: semantic font family for typography family body.
