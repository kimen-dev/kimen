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
