# Floating action menu item examples

Place commands and links directly inside a menu and supply visible labels.

```html
<ki-fab-menu label="Create">
  <ki-fab-menu-item value="message">New message</ki-fab-menu-item>
  <ki-fab-menu-item href="/events/new">New event</ki-fab-menu-item>
</ki-fab-menu>
```

The command reports `message` through the parent menu's `ki-select` event.
The link reports `New event` and follows its native destination.
