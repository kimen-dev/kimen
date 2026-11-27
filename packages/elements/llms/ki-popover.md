# ki-popover

> A non-modal popover anchored to a button.

## When to use

Show filters, details, a small form, or an explanation opened by click. Use a rich toggletip for a short explanation with actions.

## When not to use

Use ki-dialog for required decisions and ki-tooltip for hover or focus hints.

## Examples

Use a named dialog popover for interactive filters. The host supplies the trigger in the same document or shadow tree.

```html
<ki-button id="filters" type="button" variant="secondary">Filters</ki-button>
<ki-popover for="filters" label="Incident filters" placement="bottom-start">
  <ki-checkbox checked>Open incidents</ki-checkbox>
</ki-popover>
```

Use a toggletip to announce supplementary text and keep focus on the trigger.

```html
<ki-button id="retention" type="button" variant="ghost">About retention</ki-button>
<ki-popover for="retention" kind="toggletip" arrow="false">
  Logs are kept for 30 days.
</ki-popover>
```

Use a rich toggletip for an explanation with actions. Opening the panel
moves focus inside, and Escape restores it to the trigger.

```html
<ki-button id="contrast-mode" type="button" variant="ghost">Contrast mode</ki-button>
<ki-popover for="contrast-mode" kind="toggletip" appearance="rich" label="About contrast mode" arrow="false">
  <strong>Contrast mode</strong>
  <p>Kimen follows the system setting.</p>
  <ki-button type="button" size="sm" variant="ghost">Learn more</ki-button>
</ki-popover>
```

Use `open` to drive visibility and listen for `ki-open` and `ki-close` to observe it. In guarded catalog markup, bind actions to slotted controls. A trusted host can listen to the popover's two lifecycle events through the DOM.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-popover`: the default, only the tokens ki-popover needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `appearance` ("default" | "rich" | undefined, default 'default'): Rich shares the tooltip's raised surface, body and heading styles. With `kind="toggletip"` it enables actions and moves focus inside on open.
- `arrow` (boolean, default true): Shows the arrow toward the trigger.
- `for` (string | undefined, ID of another element of the same spec): ID of the button in the same document or shadow tree.
- `kind` ("dialog" | "toggletip", default 'dialog'): Use dialog for controls or toggletip for supplemental information. Rich toggletips can contain actions.
- `label` (string | undefined, default 'Popover'): Accessible name of a dialog popover.
- `open` (boolean, default false): Visibility. Reflects activation and native dismissal.
- `placement` ("bottom" | "bottom-end" | "bottom-start" | "end" | "end-end" | "end-start" | "start" | "start-end" | "start-start" | "top" | "top-end" | "top-start", default 'bottom-start'): Preferred side and logical alignment. Flips when room is limited.

## Slots

- (default): Dialog content or toggletip text. A rich toggletip also accepts actions.

## Parts

- `arrow`: The decorative arrow.
- `surface`: The popover panel.

## Events

- `ki-close` (CustomEvent<void>): Emitted when the popover closes, also when `open` is cleared: it can fire without a gesture.
- `ki-open` (CustomEvent<void>): Emitted when the popover opens, also when `open` is set: it can fire without a gesture.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-popover-arrow-size`: Side length of an anchored surface pointer before rotation. Default: `var(--ki-anchored-surface-arrow-size)`.
- `--ki-popover-backdrop-filter`: Complete backdrop filter behind an anchored surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-popover-bg`: Raised popover surface colour. Default: `var(--ki-surface-raised)`.
- `--ki-popover-bg-image`: Optional image layer over an anchored surface colour. Default: `var(--ki-surface-image-none)`.
- `--ki-popover-border`: Popover outline colour. Default: `var(--ki-outline-low-em)`.
- `--ki-popover-border-width`: Outline thickness for a small anchored surface. Default: `var(--ki-anchored-surface-border-width)`.
- `--ki-popover-fg`: Popover content ink. Default: `var(--ki-text-high-em)`.
- `--ki-popover-gap`: Space between a floating surface and its trigger. Default: `var(--ki-anchored-surface-gap)`.
- `--ki-popover-max-width`: Maximum inline size of a small anchored surface. Default: `var(--ki-anchored-surface-max-width)`.
- `--ki-popover-padding`: Interior padding for a small anchored surface. Default: `var(--ki-anchored-surface-padding)`.
- `--ki-popover-radius`: Corner radius for a small anchored surface. Default: `var(--ki-anchored-surface-radius)`.
- `--ki-popover-shadow`: Popover elevation. Default: `var(--ki-elevation-e3)`.
- `--ki-tooltip-rich-backdrop-filter`: Complete backdrop filter of the rich surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-tooltip-rich-bg`: Fill of the rich tooltip or rich popover. Default: `var(--ki-surface-raised)`.
- `--ki-tooltip-rich-bg-image`: Optional image layer over the rich surface fill. Default: `var(--ki-surface-image-none)`.
- `--ki-tooltip-rich-border-color`: Outline ink of the rich surface. Default: `var(--ki-outline-low-em)`.
- `--ki-tooltip-rich-border-width`: Outline thickness of the rich surface. Default: `var(--ki-anchored-surface-border-width)`.
- `--ki-tooltip-rich-fg`: Ink of the rich surface body text. Default: `var(--ki-text-supporting)`.
- `--ki-tooltip-rich-font-size`: Body text size of the rich surface. Default: `var(--ki-typography-size-body-1)`.
- `--ki-tooltip-rich-font-weight`: Body text weight of the rich surface. Default: `var(--ki-typography-weight-body-normal)`.
- `--ki-tooltip-rich-heading-family`: Typeface of the rich surface heading. Default: `var(--ki-typography-family-heading)`.
- `--ki-tooltip-rich-heading-fg`: Ink of the rich surface heading over the shared fill. Default: `var(--ki-text-high-em)`.
- `--ki-tooltip-rich-heading-gap`: Distance between the rich heading and its body. Default: `var(--ki-layout-spacing-xxs)`.
- `--ki-tooltip-rich-heading-size`: Text size of the rich surface heading. Default: `var(--ki-typography-size-title-1)`.
- `--ki-tooltip-rich-heading-weight`: Text weight of the rich surface heading. Default: `var(--ki-typography-weight-body-semibold)`.
- `--ki-tooltip-rich-line-height`: Body text line height of the rich surface. Default: `var(--ki-typography-line-height-para)`.
- `--ki-tooltip-rich-max-width`: Maximum inline size of the rich surface. Default: `var(--ki-anchored-surface-rich-max-width)`.
- `--ki-tooltip-rich-padding-block`: Block-axis inset of the rich surface, before density scaling. Default: `var(--ki-anchored-surface-padding)`.
- `--ki-tooltip-rich-padding-inline`: Inline-axis inset of the rich surface, before density scaling. Default: `var(--ki-layout-spacing-3xl)`.
- `--ki-tooltip-rich-radius`: Corner radius of the rich surface. Default: `var(--ki-anchored-surface-radius)`.
- `--ki-tooltip-rich-shadow`: Raised elevation of the rich surface. Default: `var(--ki-elevation-e2)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para. Default: `var(--ki-font-line-height-para)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
