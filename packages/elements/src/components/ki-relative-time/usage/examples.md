# Format a relative timestamp

Use `sync` to update the visible wording as time passes. A threshold of
86,400 seconds switches to the formatted timestamp at one day's distance.
Assistive technology and the tooltip expose the absolute timestamp throughout.

```html
<ki-relative-time date="2026-11-19T08:41:00Z" sync threshold="86400"></ki-relative-time>
```
