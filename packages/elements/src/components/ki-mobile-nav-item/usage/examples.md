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
