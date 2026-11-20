# Using ki-fab

Use one FAB for the primary action of a screen. Give it a localized `label`
in every layout. Import each Lucide glyph before mounting a FAB that names it.
Use the native `click` event to call your application's action handler.

```js
import '@kimen/elements/icons/pencil';
import { defineCustomElement } from '@kimen/elements/ki-fab';

defineCustomElement();

document.querySelector('#compose')?.addEventListener('click', openComposer);
```

```html
<ki-fab id="compose" label="Compose" icon-name="pencil"></ki-fab>
```

Use `href` when activation takes the user to a destination. To supply a custom
glyph, use the `icon` slot with decorative, noninteractive content.

```html
<ki-fab label="New project" href="/projects/new" variant="primary" extended>
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <path d="M5 12h14M12 5v14"></path>
  </svg>
</ki-fab>
```

Place a fixed FAB after the main content so its tab stop follows the page's
controls. Reserve bottom space so the last item can scroll above it. Set
`--ki-fab-mobile-nav-block-size` to the height of the fixed navigation when
present, excluding the safe area.

```html
<main class="compose-page">
  <!-- Page content -->
</main>
<ki-fab label="Compose" icon-name="pencil" position="fixed" extended collapse-on-scroll></ki-fab>
```

```css
:root {
  --ki-fab-mobile-nav-block-size: var(--app-mobile-nav-height, 0px);
  --compose-clearance: calc(
    var(--ki-fab-size) + 2 * var(--ki-fab-offset) +
      var(--ki-fab-mobile-nav-block-size) + env(safe-area-inset-bottom, 0px)
  );
  scroll-padding-block-end: var(--compose-clearance);
}

.compose-page {
  padding-block-end: var(--compose-clearance);
}
```

The clearance above uses the default `md` size. Adjust it for a larger FAB
and use the actual expanded height if the label wraps. The label hides as the
user scrolls down the document and reappears on upward scroll. The native
control retains its accessible name and focus.
