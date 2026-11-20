# MobileNav public contract

| Element | Property | Default | Purpose |
| --- | --- | --- | --- |
| `ki-mobile-nav` | `label` | `Main` | Accessible name of the navigation landmark |
| `ki-mobile-nav` | `variant` | `fixed` | Full-width `fixed` or inset `floating` bar |
| `ki-mobile-nav-item` | `href` | Required | Native link destination |
| `ki-mobile-nav-item` | `icon-name` | Required | Registered icon name |
| `ki-mobile-nav-item` | `current` | `false` | Marks the current page |
| `ki-mobile-nav-item` | `count` | Omitted | Optional unread count |
| `ki-mobile-nav-item` | `count-label` | `{count} new` | Localizable unread-count suffix |

The bar's default slot accepts three to five direct `ki-mobile-nav-item` children. Each item's default slot supplies its visible link label. The bar exposes `bar`. The item exposes `link`, `indicator` and `label`.

Place the bar after content in normal app-shell flow. Use the app's breakpoint to switch between mobile and desktop navigation. Links navigate natively. The item declares no component-specific action events.
