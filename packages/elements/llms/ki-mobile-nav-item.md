# ki-mobile-nav-item

> An icon and visible label for one mobile navigation destination.

## When to use

Place directly in ki-mobile-nav. Register a decorative icon and supply a short visible text label. Leave the catalog click action unset for native navigation.

## When not to use

For a command on the current page, use a button. For inline navigation outside a bottom bar, use ki-link.

## Examples

# Using ki-mobile-nav-item

Use a short label, a registered icon and a destination URL for each native
link inside `ki-mobile-nav`.

```html
<ki-mobile-nav-item href="/" icon-name="house" current>Home</ki-mobile-nav-item>
<ki-mobile-nav-item href="/inbox" icon-name="inbox" count="125" count-label="{count} unread">
  Inbox
</ki-mobile-nav-item>
```

Mark the active destination with `current`. The second link shows `99+` in the
badge and is announced as “Inbox, 125 unread”. A zero count hides the badge.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-mobile-nav-item`: the default, only the tokens ki-mobile-nav-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `count` (number | undefined): Optional count of new items. Only finite counts of at least one are shown. The painted count is abbreviated above 99.
- `count-label` (string, default '{count} new'): Localized suffix for the link name. Use {count} for the full rounded count.
- `current` (boolean, default false): Marks this link as the current page.
- `href` (string, required, URL): Destination URL. Relative paths and fragments use native anchor resolution.
- `icon-name` (string, required): Registered icon name. The visible destination text supplies the link name.

## Slots

- (default): Visible destination text. Use plain text or noninteractive phrasing content.

## Parts

- `indicator`: The icon well painted on the current destination.
- `label`: The always-visible destination label.
- `link`: The native anchor and focus target.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-mobile-nav-border-width`: Bar border width. Default: `var(--ki-spacing-action-hairline)`.
- `--ki-mobile-nav-font-family`: Typeface for the bar and its destination labels. Default: `var(--ki-typography-family-body)`.
- `--ki-mobile-nav-indicator-bg`: Fill behind the current destination icon. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-mobile-nav-indicator-block-size`: Current icon pill height. Default: `var(--ki-navigation-bar-indicator-block-size)`.
- `--ki-mobile-nav-indicator-fg`: Icon ink on the current destination fill. Default: `var(--ki-text-primary-high-em)`.
- `--ki-mobile-nav-indicator-inline-size`: Current icon pill width. Default: `var(--ki-navigation-bar-indicator-inline-size)`.
- `--ki-mobile-nav-indicator-radius`: Current icon pill corner radius. Default: `var(--ki-radius-round)`.
- `--ki-mobile-nav-item-current-fg`: Label ink of the current destination on the fixed or floating bar. Default: `var(--ki-text-primary-high-em)`.
- `--ki-mobile-nav-item-fg`: Foreground ink of an inactive destination on the fixed or floating bar. Default: `var(--ki-text-supporting)`.
- `--ki-mobile-nav-item-focus-radius`: Corner radius of the keyboard focus indication. Default: `var(--ki-corner-control)`.
- `--ki-mobile-nav-item-font-size`: Destination label font size. Default: `var(--ki-typography-size-caption-1)`.
- `--ki-mobile-nav-item-font-weight`: Destination label font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-mobile-nav-item-gap`: Gap between the glyph and its label. Default: `var(--ki-navigation-bar-destination-gap)`.
- `--ki-mobile-nav-item-icon-size`: Destination glyph size. Default: `var(--ki-glyph-size-md)`.
- `--ki-mobile-nav-item-line-height`: Destination label line height. Default: `var(--ki-typography-line-height-caption-1)`.
- `--ki-mobile-nav-item-target-min`: Minimum block and inline link target size. Default: `var(--ki-navigation-bar-destination-target)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
