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
