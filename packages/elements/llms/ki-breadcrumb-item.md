# ki-breadcrumb-item

> One declarative level in a breadcrumb path.

## When to use

declare a direct child of ki-breadcrumb in hierarchy order. Give ancestors an href and use short text labels. The last level is the current page.

## When not to use

render a standalone link or display an interactive control inside the label.

## Examples

Place each item directly inside a breadcrumb. Use the item's text for its
label and add `href` to link to an ancestor page. A level without
`href` provides context as text. Put the current page last.

```html
<ki-breadcrumb label="Settings path">
  <ki-breadcrumb-item href="/workspace">Workspace</ki-breadcrumb-item>
  <ki-breadcrumb-item>Administration</ki-breadcrumb-item>
  <ki-breadcrumb-item current>Settings</ki-breadcrumb-item>
</ki-breadcrumb>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-breadcrumb-item`: the default, only the tokens ki-breadcrumb-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `current` (boolean, default false): Explicitly marks the final level as current. The owning breadcrumb treats its final level as current by position, including when this marker is omitted.
- `href` (string | undefined, URL): Native destination for an ancestor level. Leaves the label as text when omitted. The final level never links away from the current page.

## Slots

- (default): Plain-text label mirrored by the owning breadcrumb.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
