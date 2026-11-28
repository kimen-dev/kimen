# ki-checkbox

> A form-associated checkbox for selecting independent options. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously on a defined custom element.

## When to use

selecting one or more independent options that a form submits
later, including a "select all" parent that presents partial selection with
`indeterminate`. Always provide a visible label in the default slot.

## When not to use

a single mutually exclusive choice, an immediate on/off
effect, triggering an action, or unlabeled/icon-only usage.

## Examples

The default slot is the visible label — the accessible name and a native activation surface; when checked, `name` and `value` pair into the submitted form data:

```html
<form>
  <ki-checkbox name="channels" value="email" checked>Email</ki-checkbox>
  <ki-checkbox name="channels" value="sms">SMS</ki-checkbox>
  <ki-button variant="primary">Save preferences</ki-button>
</form>
```

Without `value` a checked box submits `on`. Unchecked boxes contribute no form entry.

```html
<ki-checkbox name="newsletter" checked>Send me the weekly digest</ki-checkbox>
```

`required` blocks submission while unchecked (the invalid appearance appears only after a blocked attempt or an invalidating toggle, never on initial render), and `disabled` removes the checkbox from keyboard reach and form data:

```html
<form>
  <ki-checkbox name="terms" required>I accept the terms of service</ki-checkbox>
  <ki-checkbox name="fax" disabled>Notify me by fax</ki-checkbox>
  <ki-button variant="primary">Create account</ki-button>
</form>
```

`indeterminate` presents the mixed state of a "select all" parent — presentation-only, exposed to assistive technology as mixed, cleared by any user toggle, and never submitted (model data stays binary through `checked`):

```html
<ki-checkbox indeterminate>Select all rows</ki-checkbox>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
answer. The checkbox is invalid, blocks its form and is announced as invalid
at once. Toggling it withdraws the error. Remove the attribute when a new
attempt starts: setting the same text again while it is still set shows
nothing. Inside a `ki-checkbox-group`, set it on the group.

```html
<ki-checkbox name="newsletter" checked custom-error="Confirm your email address before subscribing.">Send me the newsletter</ki-checkbox>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-checkbox`: the default, only the tokens ki-checkbox needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `checked` (boolean, default false): Live binary selection state. User activation by pointer, slotted label or Space toggles it with native checkbox parity and emits composed `input` before composed `change`. Programmatic assignment is silent. When NOT to use: do not treat this reflected attribute as a native `defaultChecked`; reset uses the baseline captured at form association.
- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted answer ("This plan needs a signed contract"). While it holds text the checkbox is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting when the person toggles the checkbox, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for a `required` checkbox left unchecked; `error-text` words that. Inside a `ki-checkbox-group`, set it on the group. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Prevents activation, removes the checkbox from keyboard reach, exposes the unavailable state, and excludes it from form data. When NOT to use: do not use disabled for validation errors or pending state.
- `error-text` (string | undefined): Message shown in place of the help text once a `required` checkbox is left unchecked, and its `validationMessage`. Say what checking it means ("Accept the terms to continue"). Without it the browser's own message shows, in the browser's language. An error set with `custom-error` or `setCustomValidity` outranks it. When NOT to use: do not use it for server-side or cross-field errors; set `custom-error` or call `setCustomValidity` for those.
- `help-text` (string | undefined): One line of help under the checkbox, read with it as its description: what checking it means or commits to. When NOT to use: do not repeat the label, and do not use it for error messages; use `error-text`.
- `indeterminate` (boolean, default false): Presentation-only mixed state. It renders the dash mark, is forwarded to the internal native input for mixed assistive-technology exposure, and never changes the submitted value. Any user toggle clears it and removes the reflected attribute. When NOT to use: do not submit or persist `indeterminate` as a third value; model data remains binary through `checked`.
- `label-hint` (string | undefined): Short text shown after the slotted label and read with it as part of the checkbox name, so people know before submitting whether they must check it: "(required)" on a consent the form cannot do without, "(optional)" on one it can, in the page's own language. It changes no validation; set `required` for that, and keep the two consistent. When NOT to use: do not put what checking it commits to in it (use `help-text`), errors (use `error-text`), or a repeat of the label.
- `name` (string | undefined): Form-data key contributed when the checkbox is checked. When NOT to use: omit when the checkbox should not submit a value.
- `required` (boolean, default false): Requires the checkbox to be checked before form submission can proceed. The invalid appearance appears after a blocked submission attempt or an invalidating user toggle, never on initial render. When NOT to use: do not use required to express group-level rules; compose those at the form/application layer.
- `size` ("lg" | "md" | "sm", default 'md'): Token-backed size: the box is 18, 20 or 24px in onmars. `sm` also takes the smaller label (13/20, 8px away); `md` and `lg` keep the 15px label. The pointer target never drops under 24px. An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the text and controls around it. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string | undefined): Form-data value paired with `name` when checked. If omitted, the submitted value is `on`, matching native checkbox behavior. When NOT to use: do not encode the unchecked state here; unchecked checkboxes contribute no form entry.

## Slots

- (default): Visible label content. This is the accessible name source and a native activation surface.

## Parts

- `control`: Visual checkbox box, border, focus ring and currentColor marks.
- `error`: Error line shown in place of the help text while the checkbox is invalid after the person toggled it or submitted; a polite live region, starting with a decorative error symbol.
- `help`: Help line under the checkbox, read as its description.
- `label`: Label wrapper around the default slot.
- `label-hint`: The `label-hint` text after the slotted label, inside the label wrapper and part of the accessible name; rendered only while a hint is set.

## Events

- `change` (Event): Fired once after a user toggle (pointer, slotted label or Space) commits, composed across the shadow boundary; `checked` is already current when listeners run. `click()` from a script, or a page `<label>` for the checkbox, toggles it like a native checkbox: one `input`, then one `change`. When to use: react to the committed selection. When NOT to use: do not expect it for programmatic `checked` writes, which are silent.

## Methods

None.

## Other CSS custom properties

- `--ki-checkbox-border-width`: dimension used by the checkbox component for border width. Default: `var(--ki-space-xxs)`.
- `--ki-checkbox-control-size`: dimension used by the checkbox component for control size. Default: `var(--ki-space-5xl)`.
- `--ki-checkbox-gap`: dimension used by the checkbox component for gap (MarsUI md label pairing: Space/xl 12px for the 20px box). Default: `var(--ki-space-xl)`.
- `--ki-checkbox-label-font-size`: dimension used by the checkbox component for label font size (MarsUI md pairing: body_2 15px for the 20px box). Default: `var(--ki-typography-size-body-2)`.
- `--ki-checkbox-label-font-weight`: font weight used by the checkbox component for label font weight. Default: `var(--ki-typography-weight-body-normal)`.
- `--ki-checkbox-label-hint-fg`: color used by the checkbox component for the label hint after the label text (spec 047: the supporting-text role, a declared a11y deviation from the MarsUI Input_label support text Text/low_em, which reads 2.8-3.13:1 on the onmars light surfaces; under more contrast it strengthens with every other supporting text). Default: `var(--ki-text-supporting)`.
- `--ki-checkbox-label-hint-gap`: dimension used by the checkbox component for the gap between the label text and the label hint (MarsUI Input_label: Space/xs 4px). Default: `var(--ki-space-xs)`.
- `--ki-checkbox-label-line-height`: dimension used by the checkbox component for label line height (MarsUI body_2 24px). Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-checkbox-lg-control-size`: dimension used by the checkbox component for the lg box (Checkbox 10030:982 lg: 24px in a 28px cell). Default: `var(--ki-space-7xl)`.
- `--ki-checkbox-lg-min-target`: dimension used by the checkbox component for the lg min target (Checkbox 10030:982 lg cell: 28px). Default: `var(--ki-space-9xl)`.
- `--ki-checkbox-min-target`: dimension used by the checkbox component for min target. Default: `var(--ki-space-7xl)`.
- `--ki-checkbox-radius`: dimension used by the checkbox component for radius (MarsUI Radius/radius_sm 6px bound on the box; Figma corner smoothing is an accepted rasterization gap). Default: onmars `var(--ki-radius-sm)`, material3 `var(--ki-radius-component-xxs)`.
- `--ki-checkbox-sm-control-size`: dimension used by the checkbox component for the sm box (Checkbox 10030:982 sm: 18px in a 20px cell). Default: `var(--ki-space-4xl)`.
- `--ki-checkbox-sm-gap`: dimension used by the checkbox component for the sm gap between control and label (Checkbox-label 10095:3846 sm binds Space/md, 8px; spec 050 D4). Default: `var(--ki-space-md)`.
- `--ki-checkbox-sm-label-font-size`: dimension used by the checkbox component for the sm label font size (Checkbox-label 10095:3846 sm: UI/para 13/20; spec 050 D4). Default: `var(--ki-typography-size-body-1)`.
- `--ki-checkbox-sm-label-line-height`: dimension used by the checkbox component for the sm label line height (Checkbox-label 10095:3846 sm: UI/para 13/20). Default: `var(--ki-typography-line-height-para)`.
- `--ki-checkbox-sm-min-target`: dimension used by the checkbox component for the sm min target: 24px, the WCAG 2.5.8 minimum, above the master's 20px cell. Default: `var(--ki-space-7xl)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-effect-component-primary-default-shadow`: MarsUI Component_effect/primary_default: drop 0/1/1/-0.5 plus inner White/12 0/3/3. Pair with --ki-effect-component-backdrop-filter — CSS cannot mix backdrop blur into box-shadow. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-emphasized-out`: Expressive exit curve for selected controls. Onmars eases out without overshoot. Default: `var(--ki-easing-spring)`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-surface-special-dark-s0-light-s2`: semantic color for surface special dark s0 light s2. Default: `light-dark(var(--ki-surface-s2),var(--ki-surface-s0))`.
- `--ki-surface-special-light-s0-dark-s4`: semantic color for surface special light s0 dark s4. Default: `light-dark(var(--ki-surface-s0),var(--ki-surface-s4))`.
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
| — | — | checked-active | `--ki-checkbox-checked-active-bg` | `var(--ki-surface-primary-med-em)` | color used by the checkbox component for checked active background. |
| — | — | checked-active | `--ki-checkbox-checked-active-border` | `var(--ki-outline-none)` | color used by the checkbox component for checked active border. |
| — | — | checked-active | `--ki-checkbox-checked-active-fg` | `var(--ki-text-primary-on-primary)` | color used by the checkbox component for checked active foreground. |
| — | — | checked-disabled | `--ki-checkbox-checked-disabled-bg` | onmars `var(--ki-surface-disabled-med-em)`, material3 `var(--ki-surface-disabled-low-em)` | color used by the checkbox component for checked disabled background (MarsUI Surface/disabled_med_em Gray/300 light / White-18 dark). |
| — | — | checked-disabled | `--ki-checkbox-checked-disabled-border` | `var(--ki-outline-none)` | color used by the checkbox component for checked disabled border. |
| — | — | checked-disabled | `--ki-checkbox-checked-disabled-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-text-muted)` | color used by the checkbox component for checked disabled mark (MarsUI Text/base_em Gray/400 light / White-32 dark; retires the deprecated ki.text.muted alias). |
| — | — | checked-hover | `--ki-checkbox-checked-hover-bg` | `var(--ki-surface-primary-med-em-hover)` | color used by the checkbox component for checked hover background. |
| — | — | checked-hover | `--ki-checkbox-checked-hover-border` | `var(--ki-outline-none)` | color used by the checkbox component for checked hover border. |
| — | — | checked-hover | `--ki-checkbox-checked-hover-fg` | `var(--ki-text-primary-on-primary)` | color used by the checkbox component for checked hover foreground. |
| — | — | checked-rest | `--ki-checkbox-checked-rest-bg` | `var(--ki-surface-primary-med-em)` | color used by the checkbox component for checked rest background. |
| — | — | checked-rest | `--ki-checkbox-checked-rest-border` | `var(--ki-outline-none)` | color used by the checkbox component for checked rest border. |
| — | — | checked-rest | `--ki-checkbox-checked-rest-fg` | `var(--ki-text-primary-on-primary)` | color used by the checkbox component for checked rest foreground. |
| — | — | focus | `--ki-checkbox-focus-ring-color` | `var(--ki-focus-ring-color)` | color used by the checkbox component for focus ring color. |
| — | — | focus | `--ki-checkbox-focus-ring-offset` | `var(--ki-focus-ring-offset)` | dimension used by the checkbox component for focus ring offset. |
| — | — | focus | `--ki-checkbox-focus-ring-shadow` | `var(--ki-focus-primary)` | shadow used by the checkbox component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator). |
| — | — | focus | `--ki-checkbox-focus-ring-width` | `var(--ki-focus-ring-width)` | dimension used by the checkbox component for focus ring width. |
| — | — | indeterminate-active | `--ki-checkbox-indeterminate-active-bg` | onmars `var(--ki-surface-primary-tint)`, material3 `var(--ki-surface-primary-med-em)` | color used by the checkbox component for indeterminate active background (MarsUI Surface/primary_low_em_alpha: brand-500 at 20% light / 56% dark; the master defines no indeterminate hover, so every state keeps the tint). |
| — | — | indeterminate-active | `--ki-checkbox-indeterminate-active-border` | onmars `var(--ki-outline-primary-high-em)`, material3 `var(--ki-outline-none)` | color used by the checkbox component for indeterminate active border (Figma draws no border on the 20% tint, but the tint alone measures ~1.3:1 against light pages; the opaque brand ring keeps the WCAG 1.4.11 3:1 control boundary — gate-driven declared deviation, same law that pinned ki.outline.control). |
| — | — | indeterminate-active | `--ki-checkbox-indeterminate-active-fg` | onmars `var(--ki-text-primary-high-em)`, material3 `var(--ki-text-primary-on-primary)` | color used by the checkbox component for indeterminate active dash (Figma binds Text/primary_med_em brand-500, which measures 2.7:1 against the 56% tint in dark; one em step up keeps the 3:1 non-text law in both schemes — gate-driven compliant alternative). |
| — | — | indeterminate-disabled | `--ki-checkbox-indeterminate-disabled-bg` | onmars `var(--ki-surface-disabled-med-em)`, material3 `var(--ki-surface-disabled-low-em)` | color used by the checkbox component for indeterminate disabled background (MarsUI Surface/disabled_med_em Gray/300 light / White-18 dark). |
| — | — | indeterminate-disabled | `--ki-checkbox-indeterminate-disabled-border` | `var(--ki-outline-none)` | color used by the checkbox component for indeterminate disabled border. |
| — | — | indeterminate-disabled | `--ki-checkbox-indeterminate-disabled-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-text-muted)` | color used by the checkbox component for indeterminate disabled mark (MarsUI Text/base_em Gray/400 light / White-32 dark; retires the deprecated ki.text.muted alias). |
| — | — | indeterminate-hover | `--ki-checkbox-indeterminate-hover-bg` | onmars `var(--ki-surface-primary-tint)`, material3 `var(--ki-surface-primary-med-em-hover)` | color used by the checkbox component for indeterminate hover background (MarsUI Surface/primary_low_em_alpha: brand-500 at 20% light / 56% dark; the master defines no indeterminate hover, so every state keeps the tint). |
| — | — | indeterminate-hover | `--ki-checkbox-indeterminate-hover-border` | onmars `var(--ki-outline-primary-high-em)`, material3 `var(--ki-outline-none)` | color used by the checkbox component for indeterminate hover border (Figma draws no border on the 20% tint, but the tint alone measures ~1.3:1 against light pages; the opaque brand ring keeps the WCAG 1.4.11 3:1 control boundary — gate-driven declared deviation, same law that pinned ki.outline.control). |
| — | — | indeterminate-hover | `--ki-checkbox-indeterminate-hover-fg` | onmars `var(--ki-text-primary-high-em)`, material3 `var(--ki-text-primary-on-primary)` | color used by the checkbox component for indeterminate hover dash (Figma binds Text/primary_med_em brand-500, which measures 2.7:1 against the 56% tint in dark; one em step up keeps the 3:1 non-text law in both schemes — gate-driven compliant alternative). |
| — | — | indeterminate-rest | `--ki-checkbox-indeterminate-rest-bg` | onmars `var(--ki-surface-primary-tint)`, material3 `var(--ki-surface-primary-med-em)` | color used by the checkbox component for indeterminate rest background (MarsUI Surface/primary_low_em_alpha: brand-500 at 20% light / 56% dark; the master defines no indeterminate hover, so every state keeps the tint). |
| — | — | indeterminate-rest | `--ki-checkbox-indeterminate-rest-border` | onmars `var(--ki-outline-primary-high-em)`, material3 `var(--ki-outline-none)` | color used by the checkbox component for indeterminate rest border (Figma draws no border on the 20% tint, but the tint alone measures ~1.3:1 against light pages; the opaque brand ring keeps the WCAG 1.4.11 3:1 control boundary — gate-driven declared deviation, same law that pinned ki.outline.control). |
| — | — | indeterminate-rest | `--ki-checkbox-indeterminate-rest-fg` | onmars `var(--ki-text-primary-high-em)`, material3 `var(--ki-text-primary-on-primary)` | color used by the checkbox component for indeterminate rest dash (Figma binds Text/primary_med_em brand-500, which measures 2.7:1 against the 56% tint in dark; one em step up keeps the 3:1 non-text law in both schemes — gate-driven compliant alternative). |
| — | — | invalid | `--ki-checkbox-invalid-bg` | `var(--ki-surface-danger-low-em)` | color used by the checkbox component for invalid background. |
| — | — | invalid | `--ki-checkbox-invalid-border` | `var(--ki-outline-danger-high-em)` | color used by the checkbox component for invalid border. |
| — | — | invalid | `--ki-checkbox-invalid-fg` | `var(--ki-text-danger-high-em)` | color used by the checkbox component for invalid foreground. |
| — | — | unchecked-active | `--ki-checkbox-unchecked-active-bg` | `var(--ki-surface-s2)` | color used by the checkbox component for unchecked active background. |
| — | — | unchecked-active | `--ki-checkbox-unchecked-active-border` | `var(--ki-outline-primary-high-em)` | color used by the checkbox component for unchecked active border. |
| — | — | unchecked-active | `--ki-checkbox-unchecked-active-fg` | `var(--ki-text-high-em)` | color used by the checkbox component for unchecked active foreground. |
| — | — | unchecked-disabled | `--ki-checkbox-unchecked-disabled-bg` | onmars `var(--ki-surface-disabled-med-em)`, material3 `var(--ki-surface-disabled-low-em)` | color used by the checkbox component for unchecked disabled background (MarsUI Surface/disabled_med_em Gray/300 light / White-18 dark). |
| — | — | unchecked-disabled | `--ki-checkbox-unchecked-disabled-border` | `var(--ki-outline-med-em)` | color used by the checkbox component for unchecked disabled border. |
| — | — | unchecked-disabled | `--ki-checkbox-unchecked-disabled-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-text-muted)` | color used by the checkbox component for unchecked disabled mark (MarsUI Text/base_em Gray/400 light / White-32 dark; retires the deprecated ki.text.muted alias). |
| — | — | unchecked-hover | `--ki-checkbox-unchecked-hover-bg` | `var(--ki-surface-s1)` | color used by the checkbox component for unchecked hover background. |
| — | — | unchecked-hover | `--ki-checkbox-unchecked-hover-border` | `var(--ki-outline-primary-high-em)` | color used by the checkbox component for unchecked hover border. |
| — | — | unchecked-hover | `--ki-checkbox-unchecked-hover-fg` | `var(--ki-text-high-em)` | color used by the checkbox component for unchecked hover foreground. |
| — | — | unchecked-rest | `--ki-checkbox-unchecked-rest-bg` | `var(--ki-surface-s0)` | color used by the checkbox component for unchecked rest background. |
| — | — | unchecked-rest | `--ki-checkbox-unchecked-rest-border` | `var(--ki-outline-control)` | color used by the checkbox component for unchecked rest border. |
| — | — | unchecked-rest | `--ki-checkbox-unchecked-rest-fg` | `var(--ki-text-high-em)` | color used by the checkbox component for unchecked rest foreground. |
