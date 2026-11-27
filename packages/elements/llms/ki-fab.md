# ki-fab

> The primary action of a screen, as an icon or an extended control with a visible label.

## When to use

give a mobile screen one primary action, such as composing a draft or creating a project. Supply a descriptive label and a registered icon or decorative icon slot. Reserve page clearance for fixed placement, and leave the action binding unset for native link navigation.

## When not to use

for secondary or destructive actions, for multiple actions on the same screen, or on a desktop screen that already has a visible primary ki-button.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-fab`: the default, only the tokens ki-fab needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `collapse-on-scroll` (boolean, default false): Compact an extended FAB on viewport scroll down and restore on scroll up.
- `extended` (boolean, default false): Show the action label next to its icon.
- `href` (string | undefined, URL): A nonempty destination renders an anchor. Relative URLs and fragments retain native resolution.
- `icon-name` (string | undefined): Registered Lucide name. Import the icon module before rendering. The icon slot takes precedence.
- `label` (string, required): Accessible name of the action. Also the visible text in the extended state.
- `position` ("fixed" | "static", default 'static'): Fixed sits at the viewport's block-end inline-end corner. Reserve page clearance there.
- `size` ("lg" | "md" | "xl", default 'md'): Square footprint when icon-only, and minimum size when extended.
- `variant` ("primary" | "secondary" | "surface", default 'secondary'): Surface and ink: strong primary, tinted secondary or raised surface.

## Slots

- `icon`: Decorative, noninteractive icon replacing the named glyph.

## Parts

- `control`: The native button or link, including its surface and focus ring.
- `icon`: Wrapper for the decorative named or slotted glyph.
- `label`: Visible label of an extended FAB.

## Events

- `click` (Event): Native activation click. The page or guarded renderer handles the declared action.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-fab-backdrop-filter`: Complete optional filter behind the FAB.
- `--ki-fab-bg`: Tinted secondary FAB fill.
- `--ki-fab-bg-image`: Optional layer painted over the FAB fill.
- `--ki-fab-collapse-duration`: Duration of the extended FAB footprint change.
- `--ki-fab-collapse-easing`: Easing of the extended FAB footprint change.
- `--ki-fab-fg`: Ink on the tinted secondary FAB.
- `--ki-fab-font-family`: Typeface for FAB labels.
- `--ki-fab-font-size`: Text size for extended FAB labels.
- `--ki-fab-font-weight`: Text weight for extended FAB labels.
- `--ki-fab-forced-colors-border-width`: Boundary width for the FAB in forced colors.
- `--ki-fab-gap`: Space between icon and label in an extended FAB.
- `--ki-fab-hover-shadow`: FAB elevation for a pointer that can hover.
- `--ki-fab-icon-size`: Glyph size of the default FAB.
- `--ki-fab-lg-icon-size`: Glyph size of the medium FAB.
- `--ki-fab-lg-radius`: Corner radius of the medium FAB.
- `--ki-fab-lg-size`: Minimum footprint of the medium FAB.
- `--ki-fab-line-height`: Line height for extended FAB labels.
- `--ki-fab-mobile-nav-block-size`: Height to reserve for mobile navigation, excluding the safe-area inset.
- `--ki-fab-offset`: Fixed FAB gap to the viewport edge or mobile navigation.
- `--ki-fab-padding-inline-end`: Inline end padding of an extended FAB.
- `--ki-fab-padding-inline-start`: Inline start padding of an extended FAB.
- `--ki-fab-primary-bg`: Strong primary FAB fill.
- `--ki-fab-primary-fg`: Ink on the strong primary FAB.
- `--ki-fab-radius`: Corner radius of the default FAB size.
- `--ki-fab-shadow`: Resting FAB elevation.
- `--ki-fab-size`: Minimum FAB footprint in the default size.
- `--ki-fab-surface-bg`: Raised surface FAB fill.
- `--ki-fab-surface-fg`: Ink on the raised surface FAB.
- `--ki-fab-xl-icon-size`: Glyph size of the large FAB.
- `--ki-fab-xl-radius`: Corner radius of the large FAB.
- `--ki-fab-xl-size`: Minimum footprint of the large FAB.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
