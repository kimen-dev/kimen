# ki-mobile-nav

> A fixed or floating navigation bar for the main destinations of a phone layout.

## When to use

Place after the main content of a narrow layout. Supply three to five direct ki-mobile-nav-item children and mark the current page on its item. The host reserves room for the bar in normal flow.

## When not to use

Use buttons for actions. Use TopNav or Sidebar on wide layouts or when there are more than five destinations.

## Examples

# Using ki-mobile-nav

Use one bottom navigation bar for the three to five top-level destinations in
the phone layout. Place it after the content. The host reserves space in the
app shell so the last content can scroll above the links.

```js
import '@kimen/elements/icons/house';
import '@kimen/elements/icons/search';
import '@kimen/elements/icons/inbox';
```

```html
<main>
  <!-- App content -->
</main>
<ki-mobile-nav label="Main" variant="floating">
  <ki-mobile-nav-item href="/" icon-name="house" current>Home</ki-mobile-nav-item>
  <ki-mobile-nav-item href="/search" icon-name="search">Search</ki-mobile-nav-item>
  <ki-mobile-nav-item href="/inbox" icon-name="inbox" count="3">Inbox</ki-mobile-nav-item>
</ki-mobile-nav>
```

Omit `variant` for an edge-to-edge bar. When switching to TopNav or Sidebar,
use one app breakpoint to hide this bar and show the wider navigation.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-mobile-nav`: the default, only the tokens ki-mobile-nav needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `label` (string, default 'Main'): Accessible name of the landmark. Supply a distinct name when the page has more than one navigation landmark.
- `variant` ("fixed" | "floating", default 'fixed'): Place the bar edge to edge or inset it as a raised pill.

## Slots

- (default): Three to five direct ki-mobile-nav-item destinations.

## Parts

- `bar`: The native navigation landmark and painted bar.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-mobile-nav-backdrop-filter`: Complete optional backdrop filter for either bar variant. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-mobile-nav-bg`: Fixed bar surface. Default: `var(--ki-surface-s0)`.
- `--ki-mobile-nav-bg-image`: Optional decorative image for either bar variant. Default: `var(--ki-surface-image-none)`.
- `--ki-mobile-nav-border`: Stroke along the fixed bar or around the floating bar. Default: `var(--ki-outline-low-em)`.
- `--ki-mobile-nav-border-width`: Bar border width. Default: `var(--ki-spacing-action-hairline)`.
- `--ki-mobile-nav-floating-bg`: Floating bar surface. Default: `var(--ki-surface-raised)`.
- `--ki-mobile-nav-floating-inset`: Space beside and below the floating bar. Default: `var(--ki-navigation-bar-bar-inset)`.
- `--ki-mobile-nav-floating-padding`: Inline padding inside the floating bar. Default: `var(--ki-navigation-bar-bar-padding)`.
- `--ki-mobile-nav-floating-radius`: Floating bar pill shape. Default: `var(--ki-radius-round)`.
- `--ki-mobile-nav-floating-shadow`: Elevation of the floating bar. Default: `var(--ki-elevation-e4)`.
- `--ki-mobile-nav-font-family`: Typeface for the bar and its destination labels. Default: `var(--ki-typography-family-body)`.
- `--ki-mobile-nav-height`: Minimum height before the safe area and border are added. Default: `var(--ki-navigation-bar-bar-height)`.
- `--ki-mobile-nav-item-target-min`: Minimum block and inline link target size. Default: `var(--ki-navigation-bar-destination-target)`.
