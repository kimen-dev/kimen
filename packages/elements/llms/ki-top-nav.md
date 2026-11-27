# ki-top-nav

> Application navigation with responsive primary links, or a per-screen app bar with a real heading, optional search, and overflow actions.

## When to use

group a brand, up to five primary sections and global controls,
or set a screen title, leading control and screen actions in app-bar mode.

## When not to use

more than five sections or a deep navigation tree (use a
sidebar), or switches between in-page views (use ki-tabs).

## Examples

# Using TopNav

## Application header

Use direct anchors for primary sections and keep the page's skip link before
the header. Import `@kimen/elements/icons/bell` for the notification glyph.

```html
<a href="#content" class="skip-link">Skip to content</a>
<ki-top-nav label="Primary" collapse-at="48rem" sticky>
  <a slot="brand" href="/">Kimen</a>
  <a href="/overview" aria-current="page">Overview</a>
  <a href="/projects">Projects</a>
  <ki-icon-button slot="actions" variant="ghost" label="Notifications, 3 unread">
    <ki-icon name="bell"></ki-icon>
    <ki-counter slot="counter" value="3"></ki-counter>
  </ki-icon-button>
</ki-top-nav>
<main id="content" tabindex="-1">Workspace</main>
```

## Links that wrap instead of collapsing

Use `collapse-at="none"` to keep every link in the bar at every width. When
space runs out, the brand and actions keep the first row, and the links
wrap across the full width below. Tab reaches the actions after the links.
Use `--ki-top-nav-links-gap` for the column gap and
`--ki-top-nav-links-justify: flex-end` to align the links with the trailing
edge of their available space.

```html
<ki-top-nav label="Documentation" collapse-at="none"
  style="--ki-top-nav-links-gap: var(--ki-layout-spacing-xs); --ki-top-nav-links-justify: flex-end">
  <a slot="brand" href="/">Kimen Design System</a>
  <a href="/guide" aria-current="page">Guide</a>
  <a href="/components">Components</a>
  <a href="/tokens">Tokens</a>
  <ki-icon-button slot="actions" label="Search" variant="ghost">
    <ki-icon name="search"></ki-icon>
  </ki-icon-button>
</ki-top-nav>
```

## Per-screen bar with search

Use the native `title` attribute in HTML and `screenTitle` for the framework
prop. The leading button and search control keep their names and behavior.
The screen heading remains accessible when search occupies its visual space.

```html
<ki-top-nav variant="app-bar" title="Projects" heading-level="2">
  <button type="button" slot="leading">Back</button>
  <input slot="search" type="search" aria-label="Search projects">
  <button type="button" slot="actions">Filters</button>
</ki-top-nav>
```

When an app bar has more than three actions, slot the named controls directly.
Attach handlers to those controls. TopNav uses their existing activation
handlers in the overflow menu. Keep application-specific account menus and
navigation destinations in the consuming app.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-top-nav`: the default, only the tokens ki-top-nav needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `collapse-at` (string, default '48rem'): CSS length below which navigation collapses and single-row app bars can center their title. `none` keeps links visible. If they do not fit beside the brand and actions, they wrap across the full width below them.
- `heading-level` (number, default 1): Native heading level for the screen title. Use 1 through 6 to fit the page outline.
- `label` (string, default 'Main'): Accessible name of the header's primary navigation landmark. Override for localization.
- `navigation-label` (string, default 'Open navigation'): Accessible name for the compact navigation button and menu. Override for localization.
- `overflow-label` (string, default 'More actions'): Accessible name for the app-bar overflow button and menu. Override for localization.
- `title` (string, default ''): Screen heading, set with the HTML title attribute or the screenTitle property.
- `scroll-behavior` ("collapse" | "elevate" | "none", default 'elevate'): Tint on scroll with elevate, also shrink tall bars with collapse, or opt out with none.
- `size` ("lg" | "md" | "sm" | "xl", default 'md'): Bar size. Only app-bar mode has large and extra-large two-row sizes.
- `sticky` (boolean, default false): Keep the bar at the block start of the scroll container and draw a bottom border.
- `subtitle` (string, default ''): Supporting text displayed under the screen heading.
- `title-align` ("center" | "start", default 'start'): Center a compact single-row title when the app bar has at most one action.
- `variant` ("app-bar" | "header", default 'header'): Header for primary navigation, or app-bar for the current screen. Defaults to header.

## Slots

- (default): Header mode: up to five direct native anchors; mark the current one with aria-current="page". They stay the page's own anchors, so the page's link rules reach them and outrank the bar's link styles (CSS Scoping gives the page's styles precedence over a component's `::slotted()` rules, whatever their specificity). `a { color: inherit }` is safe: the links then take the bar's item ink. A rule that sets `color`, `text-decoration`, `font-*` or `padding` on every `a` restyles them too: scope it away from the bar, for example `:where(main, footer) a` or `a:not(ki-top-nav > a)`, and restyle the bar's links with the `--ki-top-nav-item-*` tokens.
- `actions`: Header: global actions. App bar: up to three inline; additional direct named buttons or links go into overflow.
- `brand`: Header mode: the brand link or wordmark. Page link rules reach it as they reach the primary links.
- `leading`: App bar: a named Back or Open navigation control.
- `search`: App bar: an accessible search control that can shrink inside its row.

## Parts

- `actions`: Wrapper for the trailing actions.
- `bar`: Painted header or app-bar surface.
- `brand`: Wrapper for the header brand.
- `heading`: The native screen heading.
- `leading`: Wrapper for the app-bar leading control.
- `links`: Wrapper for the primary links, including when displayed as a menu.
- `menu`: Anchored navigation or overflow menu surface.
- `menu-item`: Generated screen action in the overflow menu.
- `menu-trigger`: Native button opening collapsed navigation or overflow.
- `navigation`: The named primary navigation landmark.
- `search`: Wrapper for the app-bar search control.
- `subtitle`: Supporting text below the screen heading.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-app-bar-backdrop-filter`: Filter applied to the entire app-bar backdrop. Default: `var(--ki-effect-no-backdrop-filter)`.
- `--ki-app-bar-bg`: Resting app-bar fill. Default: `var(--ki-surface-s0)`.
- `--ki-app-bar-bg-image`: Optional image above the app-bar fill. Default: `var(--ki-surface-image-none)`.
- `--ki-app-bar-fg`: Resting app-bar title and control ink. Default: `var(--ki-text-high-em)`.
- `--ki-app-bar-height`: Height of a normal or collapsed app bar. Default: `var(--ki-layout-spacing-18xl)`.
- `--ki-app-bar-lg-height`: Expanded height of a large app bar. Default: `var(--ki-layout-app-bar-lg-height)`.
- `--ki-app-bar-lg-title-size`: Expanded two-row app-bar title size. Default: `var(--ki-typography-size-heading-2)`.
- `--ki-app-bar-scrolled-bg`: App-bar fill when its container scrolls. Default: `var(--ki-surface-s2)`.
- `--ki-app-bar-scrolled-fg`: App-bar title and control ink when its container scrolls. Default: `var(--ki-text-high-em)`.
- `--ki-app-bar-scrolled-subtitle-bg`: Scrolled surface behind the app-bar subtitle. Default: `var(--ki-surface-s2)`.
- `--ki-app-bar-scrolled-subtitle-fg`: App-bar subtitle ink when its container scrolls. Default: `var(--ki-text-supporting)`.
- `--ki-app-bar-subtitle-bg`: Resting surface behind the app-bar subtitle. Default: `var(--ki-surface-s0)`.
- `--ki-app-bar-subtitle-fg`: Resting app-bar subtitle ink. Default: `var(--ki-text-supporting)`.
- `--ki-app-bar-title-font-family`: Screen heading typeface. Default: `var(--ki-typography-family-heading)`.
- `--ki-app-bar-title-size`: One-row app-bar title size. Default: `var(--ki-typography-size-title-2)`.
- `--ki-app-bar-xl-height`: Expanded height of an extra-large app bar. Default: `var(--ki-layout-app-bar-xl-height)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-elevation-e3`: MarsUI Elevation/e3 (cumulative: e2 layers plus 0/20/20/-12). Default: onmars `0 2px 6px 0 light-dark(rgba(24,22,19,0.05),rgba(0,0,0,0.4)),0 12px 28px 0 light-dark(rgba(24,22,19,0.09),transparent),0 10px 24px 0 light-dark(transparent,rgba(0,0,0,0.45))`, material3 `0px 1px 3px 0px rgba(0,0,0,0.3),0px 4px 8px 3px rgba(0,0,0,0.15)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-layout-border-width`: Hairline edge on a structural surface. Default: `var(--ki-size-border-hairline)`.
- `--ki-layout-indicator-width`: Thickness of the line identifying a selected navigation destination. Default: `var(--ki-size-border-thin)`.
- `--ki-layout-spacing-12xl`: The 12xl spacing step for a stack or grid gap. Default: `var(--ki-space-12xl)`.
- `--ki-layout-spacing-7xl`: The 7xl spacing step for a stack or grid gap. Default: `var(--ki-space-7xl)`.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap. Default: `var(--ki-space-xl)`.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap. Default: `var(--ki-space-xs)`.
- `--ki-layout-touch-target`: Minimum target dimension for navigation controls on a coarse pointer. Default: `var(--ki-size-target-touch)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base). Default: onmars `var(--ki-duration-moderate)`, material3 `250ms`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-text-low-em`: semantic color for text low em. Not an ink for body text: under 4.5:1 on the light surfaces (s0-s2). Use it for large text (24px, or 18.66px bold), icons and decoration; body text takes the high-em ink of the tone. Default: onmars `light-dark(#6b665f,#9e9b96)`, material3 `light-dark(#6e6973,#938f99)`.
- `--ki-top-nav-backdrop-filter`: Filter applied to the entire header backdrop. Default: `var(--ki-effect-no-backdrop-filter)`.
- `--ki-top-nav-bg`: Application header fill. Default: `var(--ki-surface-s0)`.
- `--ki-top-nav-bg-image`: Optional image above the header fill. Default: `var(--ki-surface-image-none)`.
- `--ki-top-nav-border`: Edge color for sticky bars and menus. Default: `var(--ki-outline-low-em)`.
- `--ki-top-nav-fg`: Application header brand and control ink. Default: `var(--ki-text-high-em)`.
- `--ki-top-nav-height`: Height of a normal application header. Default: `var(--ki-layout-spacing-18xl)`.
- `--ki-top-nav-height-compact`: Height of a small application header. Default: `var(--ki-layout-spacing-16xl)`.
- `--ki-top-nav-indicator`: Bar marking the current primary destination. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-top-nav-item-bg`: Primary navigation item resting surface. Default: `var(--ki-surface-s0)`.
- `--ki-top-nav-item-current-bg`: Current navigation destination surface. Default: `var(--ki-surface-s0)`.
- `--ki-top-nav-item-current-fg`: Current navigation destination ink. Default: `var(--ki-text-high-em)`.
- `--ki-top-nav-item-fg`: Primary navigation item resting ink. Default: `var(--ki-text-supporting)`.
- `--ki-top-nav-item-hover-bg`: Hovered control or highlighted menu item surface. Default: `var(--ki-surface-s2)`.
- `--ki-top-nav-item-hover-fg`: Hovered control or highlighted menu item ink. Default: `var(--ki-text-high-em)`.
- `--ki-top-nav-links-gap`: Column gap between inline primary links. Default: `var(--ki-layout-spacing-zero)`.
- `--ki-top-nav-links-justify`: Inline link alignment. Use flex-end for trailing links. Default: `flex-start`.
- `--ki-top-nav-menu-radius`: Menu and trigger corner radius. Default: onmars `var(--ki-layout-menu-radius)`, material3 `var(--ki-layout-menu-radius-sm)`.
- `--ki-top-nav-padding-inline`: Padding at the inline edges of both bars. Default: `var(--ki-layout-spacing-3xl)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1. Default: `var(--ki-font-line-height-body-1)`.
- `--ki-typography-line-height-heading-2`: semantic dimension for typography line height heading 2. Default: `var(--ki-font-line-height-heading-2)`.
- `--ki-typography-line-height-title-2`: semantic dimension for typography line height title 2. Default: `var(--ki-font-line-height-title-2)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-title-2`: semantic dimension for typography size title 2. Default: `var(--ki-font-size-title-2)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold. Default: `var(--ki-font-weight-body-semibold)`.
- `--ki-typography-weight-display-semibold`: semantic font weight for typography weight display semibold. Default: onmars `var(--ki-font-weight-body-normal)`, material3 `var(--ki-font-weight-display-semibold)`.
