Place one toaster per page (or one inside a modal `ki-dialog`). It paints its stack in the top layer, stacks toasts from the top down in arrival order and shows the newest three; older ones wait their turn:

```html
<ki-toaster></ki-toaster>
<script>
  document.querySelector('ki-toaster').show({
    tone: 'success',
    title: 'Changes saved',
    message: 'Workspace settings are up to date.',
    action: { label: 'Undo', onClick: undo },
  });
</script>
```

`show()` creates the toast, appends it, and removes it once it has left; its action renders as a ghost `ki-button size="sm"`. The toaster does not bundle either element, so define `ki-toast` and `ki-button` too. Toasts can also be written in markup inside the toaster; those stay the page's own and are never removed.

`placement` picks the corner — `top-center`, `top-end`, `bottom-center` or `bottom-end` (the default); `end` follows the writing direction, and a narrow touch screen always uses the bottom center. `max` sets how many toasts show at once:

```html
<ki-toaster placement="top-center" max="2"></ki-toaster>
```

While it shows toasts the toaster is a group named by `label` (`Notifications` by default); F6 moves focus into it, and Escape on a toast returns focus to where it was. Localize the name whenever the document language is not English:

```html
<ki-toaster lang="es" label="Avisos"></ki-toaster>
```

The distance from the viewport edges and the gap between toasts are tokens:

```css
:root {
  --ki-toaster-inset-block: 24px;
  --ki-toaster-inset-inline: 24px;
}
```
