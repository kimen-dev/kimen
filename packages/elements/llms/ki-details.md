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

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-details-backdrop-filter`: Complete filter for the backdrop behind the disclosure surface.
- `--ki-details-bg`: Color of the disclosure surface.
- `--ki-details-bg-image`: Optional image painted over the disclosure surface.
- `--ki-details-body-bg`: Surface color of the disclosure body.
- `--ki-details-body-fg`: Supporting text color of the disclosure body.
- `--ki-details-border`: Color of the disclosure frame and accordion separators.
- `--ki-details-border-width`: Width of the disclosure or accordion frame.
- `--ki-details-disabled-fg`: Text and icon color of a disabled summary.
- `--ki-details-fg`: Text color on the disclosure surface.
- `--ki-details-motion-duration`: Duration of the chevron rotation.
- `--ki-details-motion-easing`: Easing of the chevron rotation.
- `--ki-details-padding`: Inline inset of the summary and inset of the panel body.
- `--ki-details-radius`: Corners of a standalone disclosure or the accordion frame.
- `--ki-details-summary-hover-bg`: Surface color of a hovered summary.
- `--ki-details-summary-hover-fg`: Text and icon color of a hovered summary.
- `--ki-details-summary-padding-block`: Block inset of the summary.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
