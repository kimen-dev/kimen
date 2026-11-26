# ki-fab-menu-item

> A labeled command or native link within a floating action menu.

## When to use

as a direct child of ki-fab-menu, with a short, visible action label.

## When not to use

for a standalone action, a form control, or a container of interactive content.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-fab-menu-item`: the default, only the tokens ki-fab-menu-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `href` (string | undefined, URL): A nonempty destination renders a native link and preserves relative URL resolution.
- `icon-name` (string | undefined): Registered Lucide glyph. Import the desired icon before rendering.
- `value` (string | undefined): Stable selection identifier. When omitted, the menu reports the trimmed visible label.

## Slots

- (default): The visible action label.

## Parts

- `control`: The native action button or link.
- `icon`: The decorative glyph next to the label.

## Events

- `ki-select` (CustomEvent<KiFabMenuSelectDetail>): Local command selection for a direct action binding. Links use native navigation.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-fab-forced-colors-border-width`: Boundary width for the FAB in forced colors.
- `--ki-fab-menu-item-backdrop-filter`: Complete optional filter behind the action.
- `--ki-fab-menu-item-bg`: Surface of a floating action: a tonal fill, or in onmars v2 the raised surface with a hairline, so the accent stays on selection.
- `--ki-fab-menu-item-bg-image`: Optional image painted above the action fill.
- `--ki-fab-menu-item-border-color`: Color of the action edge, drawn at border-width.
- `--ki-fab-menu-item-border-width`: Width of the action edge. A tonal action draws none; onmars v2 edges its surface actions with a hairline.
- `--ki-fab-menu-item-content-gap`: Space between the action glyph and label.
- `--ki-fab-menu-item-fg`: Label and icon ink on the action surface.
- `--ki-fab-menu-item-font-family`: Typeface for action labels.
- `--ki-fab-menu-item-font-size`: Text size for action labels.
- `--ki-fab-menu-item-font-weight`: Text weight of an action label.
- `--ki-fab-menu-item-height`: Minimum block size and inline target of an action.
- `--ki-fab-menu-item-hover-shadow`: Elevation of a hovered action.
- `--ki-fab-menu-item-icon-size`: Size of the glyph preceding an action label.
- `--ki-fab-menu-item-line-height`: Line height of an action label.
- `--ki-fab-menu-item-padding-block`: Block padding for a wrapping action label.
- `--ki-fab-menu-item-padding-end`: Inline-end padding of an action.
- `--ki-fab-menu-item-padding-start`: Inline-start padding of an action.
- `--ki-fab-menu-item-radius`: Pill radius of an action.
- `--ki-fab-menu-item-shadow`: Elevation of a resting action.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
