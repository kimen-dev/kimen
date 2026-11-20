# ki-popover

> A non-modal popover anchored to a button.

## When to use

Show filters, details, a small form, or a text toggletip.

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

Use `open` to drive visibility and listen for `ki-open` and `ki-close` to observe it. In guarded catalog markup, bind actions to slotted controls. A trusted host can listen to the popover's two lifecycle events through the DOM.

## Attributes

- `arrow` (boolean, default true): Shows the arrow toward the trigger.
- `for` (string | undefined): ID of the button in the same document or shadow tree.
- `kind` ("dialog" | "toggletip", default 'dialog'): Use dialog for controls or toggletip for supplemental text.
- `label` (string | undefined, default 'Popover'): Accessible name of a dialog popover.
- `open` (boolean, default false): Visibility. Reflects activation and native dismissal.
- `placement` ("bottom" | "bottom-end" | "bottom-start" | "end" | "end-end" | "end-start" | "start" | "start-end" | "start-start" | "top" | "top-end" | "top-start", default 'bottom-start'): Preferred side and logical alignment. Flips when room is limited.

## Slots

- (default): Dialog content or toggletip text.

## Parts

- `arrow`: The decorative arrow.
- `surface`: The popover panel.

## Events

- `ki-close` (CustomEvent<void>): Emitted when the popover closes.
- `ki-open` (CustomEvent<void>): Emitted when the popover opens.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-popover-arrow-size`: Side length of an anchored surface pointer before rotation.
- `--ki-popover-backdrop-filter`: Complete backdrop filter behind an anchored surface.
- `--ki-popover-bg`: Raised popover surface colour.
- `--ki-popover-bg-image`: Optional image layer over an anchored surface colour.
- `--ki-popover-border`: Popover outline colour.
- `--ki-popover-border-width`: Outline thickness for a small anchored surface.
- `--ki-popover-fg`: Popover content ink.
- `--ki-popover-gap`: Space between a floating surface and its trigger.
- `--ki-popover-max-width`: Maximum inline size of a small anchored surface.
- `--ki-popover-padding`: Interior padding for a small anchored surface.
- `--ki-popover-radius`: Corner radius for a small anchored surface.
- `--ki-popover-shadow`: Popover elevation.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
