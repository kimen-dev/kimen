# ki-select

> A form-associated select-only combobox for choosing one option from declarative `ki-option` children. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously on a defined custom element.

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

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
choice, such as a server-side check. The select is invalid, blocks its form
and is announced as invalid at once. Choosing another option withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-select label="Country" name="country" value="ch" custom-error="We do not ship to Switzerland yet.">
  <ki-option value="es">Spain</ki-option>
  <ki-option value="ch">Switzerland</ki-option>
</ki-select>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-select`: the default, only the tokens ki-select needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted choice ("We do not ship there"). While it holds text the select is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting when the person chooses another option, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for a `required` select left without a choice; `error-text` words that. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Prevents opening, removes the trigger from keyboard reach, and excludes the select from form submission.
- `error-text` (string | undefined): Message shown in place of the help text once a `required` select is left without a choice, and its `validationMessage` ("Choose a country"). Without it the browser's own message shows, in the browser's language. An error set with `custom-error` or `setCustomValidity` outranks it. When NOT to use: do not use it for server-side or cross-field errors; set `custom-error` or call `setCustomValidity` for those.
- `help-text` (string | undefined): One line of help under the trigger, read with it as the combobox description: what the choice decides. While an error shows, the error takes its place. When NOT to use: do not repeat the label, and do not use it for error messages; use `error-text`.
- `label` (string, required): Visible label and accessible-name source for the combobox trigger. When NOT to use: do not omit it; unlabeled selects are invalid usage.
- `label-hint` (string | undefined): Short text shown after the label and read with it as part of the combobox name, so people know before submitting whether to choose: "(optional)" on the few optional fields of a mostly required form, or "(required)" the other way round, in the page's own language. It changes no validation; set `required` for that, and keep the two consistent. When NOT to use: do not put instructions in it (use `help-text`), errors (use `error-text`), or a repeat of the label.
- `name` (string | undefined): Form-data key used when a selected option contributes its value. When NOT to use: omit it when the select should not submit data.
- `placeholder` (string, default ''): Text shown while no option is selected. When NOT to use: do not use it as a replacement for `label`.
- `required` (boolean, default false): Requires a non-empty submitted value. The platform validation message is donated by a hidden native select.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed trigger size (`--ki-select-{size}-*` tokens): the trigger is 24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and indicator; the label and help text follow in three steps. The listbox and its options keep their size. An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the fields around it. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string, default ''): Live projection of the selected option value, or `""` when unselected. Assigning it selects the first matching option silently; the attribute is the reset/default declaration and is not updated by user commits.

## Slots

- (default): `ki-option` data children. They do not paint; rows are mirrored.

## Parts

- `error`: Error line shown in place of the help text while the select is invalid after the person chose or submitted; a polite live region, starting with a decorative error symbol.
- `help`: Help line under the trigger, read as the combobox description.
- `indicator`: Decorative dropdown indicator.
- `label`: Visible label and accessible-name source.
- `label-hint`: The `label-hint` text after the label text, inside the label and part of the accessible name of the combobox and its listbox; rendered only while a hint is set.
- `listbox`: Popup listbox surface.
- `option`: Mirrored option row rendered in this shadow root.
- `trigger`: Native button carrying the combobox role.
- `value`: Displayed selection or placeholder.

## Events

- `change` (Event): Fired once after the user commits a different option, composed across the shadow boundary and preceded by `input`; `value` is already current when listeners run. When to use: react to the committed choice. When NOT to use: do not expect it for programmatic `value` writes, which are silent.

## Methods

None.

## Other CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-effect-component-backdrop-filter`: Complete backdrop filter for translucent components. Use none to turn the effect off. Default: onmars `none`, material3 `blur(var(--ki-effect-component-backdrop-blur))`.
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-elevation-e1`: MarsUI Elevation/e1. Scheme-aware: every layer colors through ki.elevation.shadow. Default: onmars `0 1px 2px 0 light-dark(rgba(24,22,19,0.05),rgba(0,0,0,0.4))`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-focus-danger`: MarsUI Focus/danger: persistent 3px spread ring of Outline/danger_base_em_alpha (danger-500 at 20% light / 40% dark) — the danger state signal on Input_field and Dropdown masters (measured rgb(252,220,219) over white). Pairs with a white fill and hairline border; Kimen keeps its opaque danger border on top as a declared a11y deviation. Default: `0 0 0 var(--ki-shadow-ring) var(--ki-outline-danger-base-em-alpha)`.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets. Default: `var(--ki-space-xs)`.
- `--ki-motion-distance-xs`: Motion travel distance xs (2px): hover-lift offsets. Default: `var(--ki-space-xxs)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-option-disabled-bg`: color used by the option component for disabled background. Default: `var(--ki-surface-disabled-base-em)`.
- `--ki-option-disabled-fg`: color used by the option component for disabled foreground. Default: onmars `var(--ki-text-low-em)`, material3 `var(--ki-outline-strong)`.
- `--ki-option-font-size`: dimension used by the option component for font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-option-highlight-bg`: color used by the option component for keyboard-highlight background (MarsUI active row = same Black/3 wash plus Elevation/e1; the accent is reserved for the selected tint). Default: onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-surface-primary-base-em)`.
- `--ki-option-highlight-fg`: color used by the option component for highlight foreground. Default: `var(--ki-text-high-em)`.
- `--ki-option-hover-bg`: color used by the option component for hover background (MarsUI hover-overlay-inverse Black/3 wash over the panel — not a solid surface step). Default: onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-surface-s3)`.
- `--ki-option-hover-fg`: color used by the option component for hover foreground. Default: `var(--ki-text-high-em)`.
- `--ki-option-min-target`: dimension used by the option component for min target (MarsUI Dropmenu row height Space/11xl 36px; comfortably above the 24px a11y floor). Default: onmars `var(--ki-space-11xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-option-padding-inline`: dimension used by the option component for padding inline. Default: `var(--ki-space-md)`.
- `--ki-option-radius`: dimension used by the option component for radius (MarsUI Radius/component/radius_lg 12px bound on Dropmenu rows). Default: onmars `var(--ki-radius-component-lg)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-option-rest-bg`: color used by the option component for rest background (MarsUI Dropmenu rows are transparent over the panel; only hover/selected paint). Default: onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-s2)`.
- `--ki-option-rest-fg`: color used by the option component for rest foreground. Default: `var(--ki-text-high-em)`.
- `--ki-option-selected-bg`: color used by the option component for selected background. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-option-selected-fg`: color used by the option component for selected foreground. Default: `var(--ki-text-high-em)`.
- `--ki-select-border-block-end-width`: dimension used by the select component for border block end width. Default: `var(--ki-select-border-width)`.
- `--ki-select-border-block-start-width`: dimension used by the select component for border block start width. Default: onmars `var(--ki-select-border-width)`, material3 `var(--ki-space-zero)`.
- `--ki-select-border-inline-end-width`: dimension used by the select component for border inline end width. Default: onmars `var(--ki-select-border-width)`, material3 `var(--ki-space-zero)`.
- `--ki-select-border-inline-start-width`: dimension used by the select component for border inline start width. Default: onmars `var(--ki-select-border-width)`, material3 `var(--ki-space-zero)`.
- `--ki-select-border-width`: dimension used by the select component for border width (MarsUI Input_cell strokeWeight 1px; the color stays ki.outline.control per the declared a11y deviation — only the 2px width was undocumented). Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-xxs)`.
- `--ki-select-font-size`: dimension used by the select component for font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-select-font-weight`: font weight used by the select component for the trigger value (MarsUI UI/Body 1/medium: weight 600). Default: onmars `var(--ki-typography-weight-body-medium)`, material3 `var(--ki-typography-weight-body-normal)`.
- `--ki-select-gap`: dimension used by the select component for gap. Default: `var(--ki-space-xs)`.
- `--ki-select-height`: dimension used by the select component for height. Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-14xl)`.
- `--ki-select-indicator-glyph-size`: dimension used by the select component for the chevron glyph box inside the 18px indicator slot (MarsUI Dropdown chevron 8px border-box square drawn by [part=indicator]::before). Default: `var(--ki-space-md)`.
- `--ki-select-indicator-size`: dimension used by the select component for indicator size. Default: `var(--ki-space-4xl)`.
- `--ki-select-label-font-size`: dimension used by the select component for label font size (MarsUI UI/Para/medium: body_1 13px). Default: onmars `var(--ki-typography-size-body-1)`, material3 `var(--ki-typography-size-caption-1)`.
- `--ki-select-label-font-weight`: font weight used by the select component for label font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-select-label-gap`: dimension used by the select component for label gap. Default: `var(--ki-space-xs)`.
- `--ki-select-label-hint-fg`: color used by the select component for the label hint after the label text (spec 047: the supporting-text role, a declared a11y deviation from the MarsUI Input_label support text Text/low_em, which reads 2.8-3.13:1 on the onmars light surfaces; under more contrast it strengthens with every other supporting text). Default: `var(--ki-text-supporting)`.
- `--ki-select-label-hint-gap`: dimension used by the select component for the gap between the label text and the label hint (MarsUI Input_label: Space/xs 4px). Default: `var(--ki-space-xs)`.
- `--ki-select-label-line-height`: dimension used by the select component for label line height (MarsUI line_height/para 20px). Default: onmars `var(--ki-typography-line-height-para)`, material3 `var(--ki-typography-line-height-caption-1)`.
- `--ki-select-label-padding-inline`: dimension used by the select component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius; matches ki-input/ki-textarea). Default: `var(--ki-space-xxs)`.
- `--ki-select-lg-font-size`: dimension used by the select component for lg font size: body-2 (Input-cell 8016:286 lg, composed by Dropdown 12041:1595). Default: `var(--ki-typography-size-body-2)`.
- `--ki-select-lg-height`: dimension used by the select component for lg height (Input-cell 8016:286 lg, composed by Dropdown 12041:1595: 48px). Default: `var(--ki-space-14xl)`.
- `--ki-select-lg-indicator-size`: dimension used by the select component for the lg indicator box (Input-cell 8016:286 lg, composed by Dropdown 12041:1595: icon 20px). Default: `var(--ki-space-5xl)`.
- `--ki-select-lg-label-font-size`: dimension used by the select component for the lg label font size: the Input-label 12021:6068 lg step, body-2 (spec 050 D4). Default: `var(--ki-typography-size-body-2)`.
- `--ki-select-lg-label-line-height`: dimension used by the select component for the lg label line height (body-2, Input-label lg; spec 050 D4). Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-select-lg-line-height`: dimension used by the select component for lg line height (body-2, Input-cell 8016:286 lg, composed by Dropdown 12041:1595). Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-select-lg-padding-inline`: dimension used by the select component for lg padding inline (Input-cell 8016:286 lg, composed by Dropdown 12041:1595: Space/xl, 12px). Default: `var(--ki-space-xl)`.
- `--ki-select-lg-radius`: dimension used by the select component for lg radius (Input-cell 8016:286 lg, composed by Dropdown 12041:1595: Radius/small-component/lg). Default: onmars `var(--ki-radius-component-lg)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-select-line-height`: dimension used by the select component for the trigger value line height (MarsUI body_1 24px). Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-select-listbox-backdrop-filter`: Complete backdrop filter behind the select listbox. Default: `var(--ki-effect-component-listbox-backdrop-filter)`.
- `--ki-select-listbox-bg`: color used by the select component for listbox background (MarsUI Dropmenu panel Surface/Special/blur_base_light, opaque in onmars v2; pair with --ki-select-listbox-backdrop-filter). Default: onmars `var(--ki-surface-special-blur-base-light)`, material3 `var(--ki-surface-s2)`.
- `--ki-select-listbox-bg-image`: Optional CSS background image layered over the listbox fill. Use none for a solid fill. Default: `var(--ki-surface-image-listbox)`.
- `--ki-select-listbox-max-block-size`: dimension used by the select component for listbox max block size (surface size scale; the former ki.space.25xl reference misused the spacing scale). Default: `var(--ki-size-surface-xs)`.
- `--ki-select-listbox-offset`: dimension used by the select component for listbox offset. Default: `var(--ki-space-xs)`.
- `--ki-select-listbox-padding`: dimension used by the select component for listbox padding (Dropmenu master Body: Space/md 8px on every side). Default: onmars `var(--ki-space-md)`, material3 `var(--ki-space-xs)`.
- `--ki-select-listbox-radius`: dimension used by the select component for listbox radius (Dropmenu master 12127:30113: Radius/big-component/xs 16px). Default: onmars `var(--ki-radius-big-component-xs)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-select-listbox-shadow`: shadow used by the select component for the listbox: MarsUI elevation ramp e3 (brief §5), the medium floating-surface level, replacing the former hand-composed offset/color shadow. Declared level: e3 (M3 analog: menu/dialog band; material3 overrides to e2 = md.sys.elevation.level2 for menus). Default: onmars `var(--ki-elevation-e3)`, material3 `var(--ki-elevation-e2)`.
- `--ki-select-min-target`: dimension used by the select component for min target. Default: `var(--ki-space-7xl)`.
- `--ki-select-padding-inline`: dimension used by the select component for padding inline. Default: `var(--ki-space-lg)`.
- `--ki-select-placeholder-fg`: color used by the select component for placeholder foreground. Default: `var(--ki-text-supporting)`.
- `--ki-select-radius`: dimension used by the select component for radius (MarsUI Radius/component/radius_md 10px; component ramp so personality modes reach it). Default: onmars `var(--ki-radius-component-md)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-select-sm-font-size`: dimension used by the select component for sm font size: caption-2 (Input-cell 8016:286 sm, composed by Dropdown 12041:1595). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-select-sm-height`: dimension used by the select component for sm height (Input-cell 8016:286 sm, composed by Dropdown 12041:1595: 32px). Default: `var(--ki-space-10xl)`.
- `--ki-select-sm-indicator-size`: dimension used by the select component for the sm indicator box (Input-cell 8016:286 sm, composed by Dropdown 12041:1595: icon 16px). Default: `var(--ki-space-3xl)`.
- `--ki-select-sm-label-font-size`: dimension used by the select component for the sm label font size: the Input-label 12021:6068 sm step, caption-2 (spec 050 D4). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-select-sm-label-line-height`: dimension used by the select component for the sm label line height (caption-2, Input-label sm; spec 050 D4). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-select-sm-line-height`: dimension used by the select component for sm line height (caption-2, Input-cell 8016:286 sm, composed by Dropdown 12041:1595). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-select-sm-padding-inline`: dimension used by the select component for sm padding inline (Input-cell 8016:286 sm, composed by Dropdown 12041:1595: Space/md, 8px). Default: `var(--ki-space-md)`.
- `--ki-select-sm-radius`: dimension used by the select component for sm radius (Input-cell 8016:286 sm, composed by Dropdown 12041:1595: Radius/small-component/sm). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-select-xl-font-size`: dimension used by the select component for xl font size: title-2 (Input-cell 8016:286 xl, composed by Dropdown 12041:1595). Default: `var(--ki-typography-size-title-2)`.
- `--ki-select-xl-height`: dimension used by the select component for xl height (Input-cell 8016:286 xl, composed by Dropdown 12041:1595: 56px). Default: `var(--ki-space-16xl)`.
- `--ki-select-xl-indicator-size`: dimension used by the select component for the xl indicator box (Input-cell 8016:286 xl, composed by Dropdown 12041:1595: icon 24px). Default: `var(--ki-space-7xl)`.
- `--ki-select-xl-label-font-size`: dimension used by the select component for the xl label font size: the Input-label 12021:6068 lg step, body-2 (spec 050 D4). Default: `var(--ki-typography-size-body-2)`.
- `--ki-select-xl-label-line-height`: dimension used by the select component for the xl label line height (body-2, Input-label lg; spec 050 D4). Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-select-xl-line-height`: dimension used by the select component for xl line height (title-2, Input-cell 8016:286 xl, composed by Dropdown 12041:1595). Default: `var(--ki-typography-line-height-title-2)`.
- `--ki-select-xl-padding-inline`: dimension used by the select component for xl padding inline (Input-cell 8016:286 xl, composed by Dropdown 12041:1595: Space/2xl, 14px). Default: `var(--ki-space-2xl)`.
- `--ki-select-xl-radius`: dimension used by the select component for xl radius (Input-cell 8016:286 xl, composed by Dropdown 12041:1595: Radius/small-component/xl). Default: onmars `var(--ki-radius-component-xl)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-select-xs-font-size`: dimension used by the select component for xs font size: caption-2 (Input-cell 8016:286 xs, composed by Dropdown 12041:1595). Figma draws caption_1, 10px; caption_2, 12px, is the smallest text the library ships (spec 050 D7). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-select-xs-height`: dimension used by the select component for xs height (Input-cell 8016:286 xs, composed by Dropdown 12041:1595: 24px). Default: `var(--ki-space-7xl)`.
- `--ki-select-xs-indicator-size`: dimension used by the select component for the xs indicator box (Input-cell 8016:286 xs, composed by Dropdown 12041:1595: icon 14px). Default: `var(--ki-space-2xl)`.
- `--ki-select-xs-label-font-size`: dimension used by the select component for the xs label font size: the Input-label 12021:6068 sm step, caption-2 (spec 050 D4). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-select-xs-label-line-height`: dimension used by the select component for the xs label line height (caption-2, Input-label sm; spec 050 D4). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-select-xs-line-height`: dimension used by the select component for xs line height (caption-2, Input-cell 8016:286 xs, composed by Dropdown 12041:1595). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-select-xs-padding-inline`: dimension used by the select component for xs padding inline (Input-cell 8016:286 xs, composed by Dropdown 12041:1595: Space/sm, 6px). Default: `var(--ki-space-sm)`.
- `--ki-select-xs-radius`: dimension used by the select component for xs radius (Input-cell 8016:286 xs, composed by Dropdown 12041:1595: Radius/small-component/xs). Default: `var(--ki-radius-component-xs)`.
- `--ki-surface-hover-overlay-inverse`: semantic color for surface hover overlay inverse. Default: onmars `light-dark(var(--ki-color-black-3),var(--ki-color-white-3))`, material3 `light-dark(var(--ki-color-white-8),var(--ki-color-black-8))`.
- `--ki-text-danger-high-em`: semantic color for text danger high em. Default: onmars `light-dark(#c21a45,var(--ki-color-danger-300))`, material3 `light-dark(#8c1d18,#f2b8b5)`.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted). Default: `var(--ki-text-med-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2. Default: `var(--ki-font-line-height-body-2)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para. Default: `var(--ki-font-line-height-para)`.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2. Default: `var(--ki-font-size-body-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal. Default: `var(--ki-font-weight-body-normal)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | rest | `--ki-select-rest-bg` | onmars `var(--ki-surface-special-light-s0-dark-s1)`, material3 `var(--ki-surface-s2)` | color used by the select component for rest background (MarsUI Dropdown rest fill Surface/Special/light-s0_dark-s2: white light, Dark/800 dark). |
| — | — | rest | `--ki-select-rest-border` | `var(--ki-outline-control)` | color used by the select component for rest border. |
| — | — | rest | `--ki-select-rest-fg` | `var(--ki-text-high-em)` | color used by the select component for rest foreground. |
| — | — | rest | `--ki-select-rest-label-fg` | `var(--ki-text-supporting)` | color used by the select component for rest label foreground. |
| — | — | disabled | `--ki-select-disabled-bg` | `var(--ki-surface-disabled-base-em)` | color used by the select component for disabled background. |
| — | — | disabled | `--ki-select-disabled-border` | onmars `var(--ki-outline-base-em)`, material3 `var(--ki-outline-low-em)` | color used by the select component for disabled border (MarsUI Outline/base_em Black/3). |
| — | — | disabled | `--ki-select-disabled-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-outline-strong)` | color used by the select component for disabled foreground (MarsUI disabled text Text/base_em Gray/400; disabled cells are exempt from the contrast sweep). |
| — | — | disabled | `--ki-select-disabled-label-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-outline-strong)` | color used by the select component for disabled label foreground. |
| — | — | focus | `--ki-select-focus-bg` | onmars `var(--ki-surface-special-light-s0-dark-s4)`, material3 `var(--ki-surface-s2)` | color used by the select component for focus background (MarsUI Dropdown focus fill Surface/Special/light-s0_dark-s4). |
| — | — | focus | `--ki-select-focus-border` | onmars `var(--ki-select-rest-border)`, material3 `var(--ki-outline-primary-high-em)` | color used by the select component for focus border (MarsUI active is glow-only: the border stays the rest hairline while Focus/primary carries the emphasis — repointed from ki.outline.primary-high-em per the fidelity audit; material3 keeps the opaque primary border via its override). |
| — | — | focus | `--ki-select-focus-fg` | `var(--ki-text-high-em)` | color used by the select component for focus foreground. |
| — | — | focus | `--ki-select-focus-label-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-med-em)` | color used by the select component for focus label foreground. |
| — | — | focus | `--ki-select-focus-ring-color` | `var(--ki-focus-ring-color)` | color used by the select component for focus ring color. |
| — | — | focus | `--ki-select-focus-ring-offset` | `var(--ki-focus-ring-offset)` | dimension used by the select component for focus ring offset. |
| — | — | focus | `--ki-select-focus-ring-shadow` | `var(--ki-focus-primary)` | shadow used by the select component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator). |
| — | — | focus | `--ki-select-focus-ring-width` | `var(--ki-focus-ring-width)` | dimension used by the select component for focus ring width. |
| — | — | hover | `--ki-select-hover-border` | `var(--ki-outline-control-hover)` | color used by the select component for hover border. Brief §1: hover moves along the neutral outline em ramp (Black/12), matching ki-input/ki-textarea; the primary accent outline is the focus language (Focus/primary), not hover. |
| — | — | hover | `--ki-select-hover-fg` | `var(--ki-text-high-em)` | color used by the select component for hover foreground. |
| — | — | hover | `--ki-select-hover-label-fg` | `var(--ki-text-high-em)` | color used by the select component for hover label foreground. |
