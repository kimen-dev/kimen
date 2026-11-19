# ki-toaster

> The one place toasts appear: it paints its `ki-toast` children in the top layer at a corner of the viewport, stacks them in arrival order, shows the newest few and queues the older ones, without covering the page beside them.

## When to use

once per page (or once inside a modal `ki-dialog`), as the place
every `ki-toast` of the application appears in: append toasts to it, or call
`show()`. Choose the corner with `placement`.

## When not to use

do not put anything but `ki-toast` elements in it; do not use
it for persistent content, which belongs in the page or in `ki-alert`.

Assistive technology note: while it shows toasts the toaster is a group
named by `label`, never a landmark; F6 moves focus into it and Escape on a
toast returns focus to where it was. An empty toaster exposes nothing and
covers nothing.

## Examples

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

## Attributes

- `label` (string, default 'Notifications'): Accessible name of the group the toaster exposes while it shows toasts. Override for localization. When to use: provide the name in the document language. When NOT to use: do not put a message here.
- `max` (number, default 3, minimum 1): How many toasts show at once: the newest ones. Older toasts wait, and come back with their full time as shown ones leave. A value below 1 or not a whole number shows 3. When to use: lower it on small screens or busy applications. When NOT to use: do not raise it to show every toast; a tall stack covers the page.
- `placement` ("bottom-center" | "bottom-end" | "top-center" | "top-end" | string & {}, default 'bottom-end'): Corner or edge of the viewport the stack sits against; `end` follows the writing direction. On a coarse pointer and a viewport narrower than 40rem the stack always sits at the bottom center. Unknown values place the stack at the bottom end. When to use: keep toasts away from where the page's own controls live. When NOT to use: do not change it per toast; one toaster keeps one place.

## Slots

- (default): The `ki-toast` elements, in arrival order. Other children are not counted, queued or placed.

## Parts

- `stack`: The stack in the top layer: placement, edge distance, gap between toasts and width.

## Events

None.

## Methods

- `show(options)` (Promise<HTMLElement>): Raises a toast: creates a `ki-toast` from `tone`, `title` (its heading), `message`, `duration`, `dismissible` and `action` (a ghost `ki-button size="sm"` in its `action` slot that calls `onClick`), appends it to the toaster and resolves with it. Once the toast has left it is removed from the page. The toaster does not bundle `ki-toast` or `ki-button`: define them, as for toasts written in markup. When to use: raise a toast from script without writing its markup. When NOT to use: a toast written in markup stays the page's own: append it instead, and it is never removed.

## CSS custom properties

- `--ki-toast-width`: dimension used by the toast component for the widest a toast gets (issue #353: 22.5rem).
- `--ki-toaster-gap`: dimension used by the toaster component for the gap between stacked toasts (spec 049 FR-014).
- `--ki-toaster-inset-block`: dimension used by the toaster component for the distance between the stack and the top or bottom edge of the viewport (spec 049 FR-014).
- `--ki-toaster-inset-inline`: dimension used by the toaster component for the distance between the stack and the end edge of the viewport (spec 049 FR-014).
- `--ki-typography-family-body`: semantic font family for typography family body.
