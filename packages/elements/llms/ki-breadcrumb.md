# ki-breadcrumb

> A path of ancestor links ending at the current page, with optional overflow.

## When to use

show the current page in a deeper hierarchy using direct ki-breadcrumb-item children ordered from root to current.

## When not to use

switch between peer routes, toggle peer panels, or display progress through a form.

## Examples

## Show the path to the current page

```html
<ki-breadcrumb label="Project path">
  <ki-breadcrumb-item href="/workspace">Workspace</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/workspace/projects">Projects</ki-breadcrumb-item>
  <ki-breadcrumb-item current>Settings</ki-breadcrumb-item>
</ki-breadcrumb>
```

## Collapse middle levels

```html
<ki-breadcrumb label="Release path" max-items="4">
  <ki-breadcrumb-item href="/workspace">Workspace</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects">Projects</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects/kimen">Kimen</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects/kimen/packages">Packages</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects/kimen/releases">Releases</ki-breadcrumb-item>
  <ki-breadcrumb-item current>v2.4.0</ki-breadcrumb-item>
</ki-breadcrumb>
```

In this example the overflow has three levels. The trail shows Workspace,
the overflow button, Releases, and v2.4.0.

## Render a guarded breadcrumb

Put breadcrumb items in the default slot and supply plain-text item labels.
The surface's URL policy applies to each destination. Native links have no
custom action binding.

```json
{
  "version": 1,
  "root": {
    "component": "ki-breadcrumb",
    "props": { "label": "Project path" },
    "slots": {
      "": [
        {
          "component": "ki-breadcrumb-item",
          "props": { "href": "/workspace" },
          "slots": { "": ["Workspace"] }
        },
        {
          "component": "ki-breadcrumb-item",
          "props": { "current": true },
          "slots": { "": ["Settings"] }
        }
      ]
    }
  }
}
```

## Attributes

- `label` (string, default 'Breadcrumb'): Accessible name of the navigation landmark.
- `max-items` (number | undefined): Optional overflow threshold. Above it, keep the first and last two levels visible. Positive values are rounded down and clamped to four. Omit this prop, or pass a non-positive or non-finite value, to show the full trail.
- `more-label` (string, default 'Show {n} more levels'): Localizable name of the overflow control. Use {n} for the hidden level count.

## Slots

- (default): Direct ki-breadcrumb-item children in hierarchy order.

## Parts

- `current`: The current page label.
- `label`: The label of an ancestor with no destination.
- `link`: A visible native ancestor link.
- `list`: The ordered list of visible levels.
- `list-item`: A list entry for a level or the overflow control.
- `menu`: The anchored menu of collapsed levels.
- `menu-item`: A destination or unavailable level in the overflow menu.
- `more-button`: The overflow menu button.
- `navigation`: The named navigation landmark.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-breadcrumb-bg`: Transparent backing for ancestor text and the overflow trigger.
- `--ki-breadcrumb-current-bg`: Transparent backing for the current level.
- `--ki-breadcrumb-current-fg`: Emphasized foreground of the current level.
- `--ki-breadcrumb-fg`: Medium-emphasis ink for ancestors and the overflow trigger, strengthened in more-contrast mode.
- `--ki-breadcrumb-gap`: Gap between breadcrumb rows, levels and their chevrons.
- `--ki-breadcrumb-glyph-size`: Size of the ellipsis glyph.
- `--ki-breadcrumb-hover-bg`: Backing for the active overflow trigger and highlighted overflow links.
- `--ki-breadcrumb-hover-fg`: Foreground for the active overflow trigger and highlighted overflow links.
- `--ki-breadcrumb-menu-backdrop-filter`: Complete backdrop filter of the overflow menu, none by default.
- `--ki-breadcrumb-menu-bg`: Surface behind the overflow menu entries.
- `--ki-breadcrumb-menu-bg-image`: Optional image layered over the overflow menu surface.
- `--ki-breadcrumb-menu-fg`: Text of overflow menu entries.
- `--ki-breadcrumb-menu-max-block-size`: Maximum block size of the scrollable overflow menu.
- `--ki-breadcrumb-menu-padding`: Inset around the overflow menu entries.
- `--ki-breadcrumb-menu-radius`: Outer radius of the overflow menu.
- `--ki-breadcrumb-menu-shadow`: Elevation of the overflow menu above the page.
- `--ki-breadcrumb-padding-block`: Block inset of a level label.
- `--ki-breadcrumb-padding-inline`: Inline inset of a level label.
- `--ki-breadcrumb-radius`: Radius of the overflow trigger and level focus outlines.
- `--ki-breadcrumb-separator`: Foreground of the decorative breadcrumb chevron.
- `--ki-breadcrumb-separator-size`: Edge length of the decorative chevron before rotation.
- `--ki-breadcrumb-separator-stroke`: Stroke width of the decorative chevron.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-underline-offset`: Gap between text and its underline.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
