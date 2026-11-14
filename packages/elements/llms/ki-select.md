# ki-select

> A form-associated select-only combobox for choosing one option from declarative `ki-option` children.

## When to use

choose exactly one value from a known closed list, especially
when there are roughly five or more choices or space is limited.

## When not to use

`ki-radio-group` for a few always-visible choices,
`ki-input` for free or searchable text, `ki-checkbox`/`ki-switch` for
binary decisions, or multiselect and command menus.

## Examples

Options are declared as `ki-option` children; the option text is the visible label and `value` is the submitted value:

```html
<ki-select label="Country" name="country" placeholder="Choose a country">
  <ki-option value="es">Spain</ki-option>
  <ki-option value="fr">France</ki-option>
  <ki-option value="pt">Portugal</ki-option>
</ki-select>
```

An option without `value` submits its trimmed label text, and `required` blocks submission while empty:

```html
<form>
  <ki-select label="Team size" name="size" required>
    <ki-option>1-10</ki-option>
    <ki-option>11-50</ki-option>
    <ki-option disabled>51+</ki-option>
  </ki-select>
  <ki-button variant="primary">Continue</ki-button>
</form>
```

## Attributes

- `disabled` (boolean, default false): Prevents opening, removes the trigger from keyboard reach, and excludes the select from form submission. Boolean presence semantics apply.
- `label` (string, required): Visible label and accessible-name source for the combobox trigger. When NOT to use: do not omit it; unlabeled selects are invalid usage.
- `name` (string | undefined): Form-data key used when a selected option contributes its value. When NOT to use: omit it when the select should not submit data.
- `placeholder` (string, default ''): Text shown while no option is selected. When NOT to use: do not use it as a replacement for `label`.
- `required` (boolean, default false): Requires a non-empty submitted value. The platform validation message is donated by a hidden native select.
- `value` (string, default ''): Live projection of the selected option value, or `""` when unselected. Assigning it selects the first matching option silently; the attribute is the reset/default declaration and is not updated by user commits.

## Slots

- (default): `ki-option` data children. They do not paint; rows are mirrored.

## Parts

- `indicator`: Decorative dropdown indicator.
- `label`: Visible label and accessible-name source.
- `listbox`: Popup listbox surface.
- `option`: Mirrored option row rendered in this shadow root.
- `trigger`: Native button carrying the combobox role.
- `value`: Displayed selection or placeholder.

## Events

- `change` (Event): Fired once after the user commits a different option, composed across the shadow boundary and preceded by `input`; `value` is already current when listeners run. When to use: react to the committed choice. When NOT to use: do not expect it for programmatic `value` writes, which are silent.

## Methods

None.

## CSS custom properties

- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with backdrop-filter blur(var(--ki-effect-component-backdrop-blur)).
- `--ki-elevation-e1`: MarsUI Elevation/e1. Scheme-aware: every layer colors through ki.elevation.shadow.
- `--ki-focus-danger`: MarsUI Focus/danger: persistent 3px spread ring of Outline/danger_base_em_alpha (danger-500 at 20% light / 40% dark) — the danger state signal on Input_field and Dropdown masters (measured rgb(252,220,219) over white). Pairs with a white fill and hairline border; Kimen keeps its opaque danger border on top as a declared a11y deviation.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-distance-xs`: Motion travel distance xs (2px): hover-lift offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-option-disabled-bg`: color used by the option component for disabled background.
- `--ki-option-disabled-fg`: color used by the option component for disabled foreground.
- `--ki-option-font-size`: dimension used by the option component for font size.
- `--ki-option-highlight-bg`: color used by the option component for keyboard-highlight background (MarsUI active row = same Black/3 wash plus Elevation/e1; purple is reserved for the selected tint).
- `--ki-option-highlight-fg`: color used by the option component for highlight foreground.
- `--ki-option-hover-bg`: color used by the option component for hover background (MarsUI hover_overlay_inverse Black/3 wash over the glass panel — not a solid surface step).
- `--ki-option-hover-fg`: color used by the option component for hover foreground.
- `--ki-option-min-target`: dimension used by the option component for min target (MarsUI Dropmenu row height Space/11xl 36px; comfortably above the 24px a11y floor).
- `--ki-option-padding-inline`: dimension used by the option component for padding inline.
- `--ki-option-radius`: dimension used by the option component for radius (MarsUI Radius/component/radius_lg 12px bound on Dropmenu rows).
- `--ki-option-rest-bg`: color used by the option component for rest background (MarsUI Dropmenu rows are transparent over the glass panel; only hover/selected paint).
- `--ki-option-rest-fg`: color used by the option component for rest foreground.
- `--ki-option-selected-bg`: color used by the option component for selected background.
- `--ki-option-selected-fg`: color used by the option component for selected foreground.
- `--ki-select-border-block-end-width`: dimension used by the select component for border block end width.
- `--ki-select-border-block-start-width`: dimension used by the select component for border block start width.
- `--ki-select-border-inline-end-width`: dimension used by the select component for border inline end width.
- `--ki-select-border-inline-start-width`: dimension used by the select component for border inline start width.
- `--ki-select-border-width`: dimension used by the select component for border width (MarsUI Input_cell strokeWeight 1px; the color stays ki.outline.control per the declared a11y deviation — only the 2px width was undocumented).
- `--ki-select-disabled-bg`: color used by the select component for disabled background.
- `--ki-select-disabled-border`: color used by the select component for disabled border (MarsUI Outline/base_em Black/3).
- `--ki-select-disabled-fg`: color used by the select component for disabled foreground (MarsUI disabled text Text/base_em Gray/400; disabled cells are exempt from the contrast sweep).
- `--ki-select-disabled-label-fg`: color used by the select component for disabled label foreground.
- `--ki-select-focus-bg`: color used by the select component for focus background (MarsUI Dropdown focus fill Surface/Special/light-s0_dark-s4).
- `--ki-select-focus-border`: color used by the select component for focus border (MarsUI active is glow-only: the border stays the rest hairline while Focus/primary carries the emphasis — repointed from ki.outline.primary-high-em per the fidelity audit; material3 keeps the opaque primary border via its override).
- `--ki-select-focus-fg`: color used by the select component for focus foreground.
- `--ki-select-focus-label-fg`: color used by the select component for focus label foreground.
- `--ki-select-focus-ring-color`: color used by the select component for focus ring color.
- `--ki-select-focus-ring-offset`: dimension used by the select component for focus ring offset.
- `--ki-select-focus-ring-shadow`: shadow used by the select component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-select-focus-ring-width`: dimension used by the select component for focus ring width.
- `--ki-select-font-size`: dimension used by the select component for font size.
- `--ki-select-font-weight`: font weight used by the select component for the trigger value (MarsUI UI/Body 1/medium: weight 600).
- `--ki-select-gap`: dimension used by the select component for gap.
- `--ki-select-height`: dimension used by the select component for height.
- `--ki-select-hover-border`: color used by the select component for hover border. Brief §1: hover moves along the neutral outline em ramp (Black/12), matching ki-input/ki-textarea; the primary accent outline is the focus language (Focus/primary), not hover.
- `--ki-select-hover-fg`: color used by the select component for hover foreground.
- `--ki-select-hover-label-fg`: color used by the select component for hover label foreground.
- `--ki-select-indicator-glyph-size`: dimension used by the select component for the chevron glyph box inside the 18px indicator slot (MarsUI Dropdown chevron 8px border-box square drawn by [part=indicator]::before).
- `--ki-select-indicator-size`: dimension used by the select component for indicator size.
- `--ki-select-label-font-size`: dimension used by the select component for label font size (MarsUI UI/Para/medium: body_1 13px).
- `--ki-select-label-font-weight`: font weight used by the select component for label font weight.
- `--ki-select-label-gap`: dimension used by the select component for label gap.
- `--ki-select-label-line-height`: dimension used by the select component for label line height (MarsUI line_height/para 20px).
- `--ki-select-label-padding-inline`: dimension used by the select component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius; matches ki-input/ki-textarea).
- `--ki-select-line-height`: dimension used by the select component for the trigger value line height (MarsUI body_1 24px).
- `--ki-select-listbox-backdrop-blur`: backdrop blur used by the select component listbox glass panel (MarsUI BACKGROUND_BLUR Blur/48 = CSS 24px; material3 resolves to blur none via its override).
- `--ki-select-listbox-bg`: color used by the select component for listbox background (MarsUI Dropmenu glass panel Surface/Special/blur_base_light White/80; pair with backdrop-filter blur(var(--ki-select-listbox-backdrop-blur))).
- `--ki-select-listbox-max-block-size`: dimension used by the select component for listbox max block size (surface size scale; the former ki.space.25xl reference misused the spacing scale).
- `--ki-select-listbox-offset`: dimension used by the select component for listbox offset.
- `--ki-select-listbox-padding`: dimension used by the select component for listbox padding (MarsUI Dropmenu content inset Space/xl 12px).
- `--ki-select-listbox-radius`: dimension used by the select component for listbox radius (MarsUI Radius/big_component/radius_sm 20px bound on the Dropmenu panel).
- `--ki-select-listbox-shadow`: shadow used by the select component for the listbox: MarsUI elevation ramp e3 (brief §5), the medium floating-surface level, replacing the former hand-composed offset/color shadow. Declared level: e3 (M3 analog: menu/dialog band; material3 overrides to e2 = md.sys.elevation.level2 for menus).
- `--ki-select-min-target`: dimension used by the select component for min target.
- `--ki-select-padding-inline`: dimension used by the select component for padding inline.
- `--ki-select-placeholder-fg`: color used by the select component for placeholder foreground.
- `--ki-select-radius`: dimension used by the select component for radius (MarsUI Radius/component/radius_md 10px; component ramp so personality modes reach it).
- `--ki-select-rest-bg`: color used by the select component for rest background (MarsUI Dropdown rest fill Surface/Special/light-s0_dark-s2: white light, Dark/800 dark).
- `--ki-select-rest-border`: color used by the select component for rest border.
- `--ki-select-rest-fg`: color used by the select component for rest foreground.
- `--ki-select-rest-label-fg`: color used by the select component for rest label foreground.
- `--ki-surface-hover-overlay-inverse`: semantic color for surface hover overlay inverse.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
