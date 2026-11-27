# ki-accordion

> A set of native disclosure panels with a shared frame.

## When to use

group related FAQ answers, settings or expandable sections.
Enable exclusive when readers benefit from one open section at a time.

## When not to use

switch between views or make the panels advance a workflow.

## Examples

### Workspace FAQ

Group direct disclosure children. Set `exclusive` when readers should see
one answer at a time.

```html
<ki-accordion exclusive>
  <ki-details open summary="Who can see my workspace?">
    Only people you invite can see it.
  </ki-details>
  <ki-details summary="Can I export my data?">
    Open Settings, then select Data and Export.
  </ki-details>
</ki-accordion>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-accordion`: the default, only the tokens ki-accordion needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `exclusive` (boolean, default false): Whether the accordion allows at most one direct member to be open.

## Slots

- (default): Direct ki-details members in reading order.

## Parts

- `group`: The frame around the disclosure rows.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-accordion-divider-width`: Width of the separator between accordion rows.
- `--ki-details-border`: Color of the disclosure frame and accordion separators.
- `--ki-details-border-width`: Width of the disclosure or accordion frame.
- `--ki-details-radius`: Corners of a standalone disclosure or the accordion frame.
- `--ki-typography-family-body`: semantic font family for typography family body.
