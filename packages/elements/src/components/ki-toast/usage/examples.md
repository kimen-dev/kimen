Put a toast in a `ki-toaster` when something happens; it announces itself as it appears and leaves on its own after 5 seconds. `tone` picks the icon and its ink and the live-region urgency: `danger` exposes `role="alert"`, every other value `role="status"`:

```html
<ki-toaster>
  <ki-toast tone="success" heading="Changes saved">Workspace settings are up to date.</ki-toast>
</ki-toaster>
```

`duration` (milliseconds) changes the time; `0` keeps the toast until it is dismissed. A toast in the `danger` tone, or holding an action, never leaves on its own, whatever its `duration`. The time stops while the pointer rests on the toaster, while focus is inside it, or while the page is hidden:

```html
<ki-toast duration="8000">The export is ready in your downloads.</ki-toast>
<ki-toast tone="danger" heading="Upload failed">The file is larger than 20 MB.</ki-toast>
```

The `action` slot takes one ghost `ki-button size="sm"`. Its own click handler runs, then the toast leaves:

```html
<ki-toast heading="Message archived">
  The conversation moved to your archive.
  <ki-button slot="action" variant="ghost" size="sm">Undo</ki-button>
</ki-toast>
```

`ki-dismiss` says why the toast left: `detail.reason` is `"timeout"`, `"button"`, `"escape"` or `"action"`. `dismissible="false"` drops the dismiss button (Escape still works on a focused toast); `dismiss-label` is the component's only built-in word, so localize it whenever the document language is not English:

```html
<ki-toast lang="es" dismiss-label="Descartar">Borrador guardado.</ki-toast>
```
