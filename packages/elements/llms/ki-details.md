# ki-details

> A native disclosure for supporting information that can stay collapsed.

## When to use

reveal a short explanation, FAQ answer, settings section or tool
output on demand. Use ki-accordion for related disclosures.

## When not to use

hide the primary action or information needed to complete a task.
For script-free HTML, author native details and summary directly.

## Examples

### Workspace permissions

Use one disclosure for an explanation the reader can reveal on demand.
Use the plain `summary` prop for text or a heading in the `summary` slot.
The default slot contains the answer.

```html
<ki-details summary="Who can see my workspace?">
  <p>Only people you invite can see it.</p>
</ki-details>
```

Listen for `ki-toggle` on the disclosure to read `event.detail.open`.
In a catalog surface, bind the action to the individual Details node.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-details`: the default, only the tokens ki-details needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `disabled` (boolean, default false): Disables summary activation. The page can still set open.
- `name` (string | undefined): Nonempty name for exclusive disclosures in the same document or shadow root.
- `open` (boolean, default false): Whether the panel is open. Native changes reflect back to this property.
- `summary` (string | undefined): Plain label for the control. Supply the summary slot for a rich label.

## Slots

- (default): Content shown when the disclosure is open.
- `summary`: Rich summary text or an authored heading, replacing the summary prop.

## Parts

None.

## Events

- `ki-toggle` (CustomEvent<KiDetailsToggleDetail>): Emitted when the native disclosure toggles or an exclusive peer closes it.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-details-backdrop-filter`: Complete filter for the backdrop behind the disclosure surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-details-bg`: Color of the disclosure surface. Default: `var(--ki-surface-s0)`.
- `--ki-details-bg-image`: Optional image painted over the disclosure surface. Default: `var(--ki-surface-image-none)`.
- `--ki-details-body-bg`: Surface color of the disclosure body. Default: `var(--ki-surface-s0)`.
- `--ki-details-body-fg`: Supporting text color of the disclosure body. Default: `var(--ki-text-supporting)`.
- `--ki-details-border`: Color of the disclosure frame and accordion separators. Default: `var(--ki-outline-low-em)`.
- `--ki-details-border-width`: Width of the disclosure or accordion frame. Default: `var(--ki-outline-hairline-width)`.
- `--ki-details-disabled-fg`: Text and icon color of a disabled summary. Default: `var(--ki-text-med-em)`.
- `--ki-details-fg`: Text color on the disclosure surface. Default: `var(--ki-text-high-em)`.
- `--ki-details-motion-duration`: Duration of the chevron rotation. Default: `var(--ki-motion-duration-fast)`.
- `--ki-details-motion-easing`: Easing of the chevron rotation. Default: `var(--ki-motion-easing-standard)`.
- `--ki-details-padding`: Inline inset of the summary and inset of the panel body. Default: `var(--ki-spacing-standard-inset)`.
- `--ki-details-radius`: Corners of a standalone disclosure or the accordion frame. Default: `var(--ki-corner-panel)`.
- `--ki-details-summary-hover-bg`: Surface color of a hovered summary. Default: `var(--ki-surface-s1)`.
- `--ki-details-summary-hover-fg`: Text and icon color of a hovered summary. Default: `var(--ki-text-high-em)`.
- `--ki-details-summary-padding-block`: Block inset of the summary. Default: `var(--ki-spacing-compact-inset)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1. Default: `var(--ki-font-line-height-body-1)`.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para. Default: `var(--ki-font-line-height-para)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
