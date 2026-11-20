# ki-sidebar

> Side navigation with an expanded panel and an optional icon rail.

## When to use

navigate more than five top-level destinations or organize
application destinations in named groups.

## When not to use

for a few destinations, use top navigation. For mobile
navigation, use a mobile navigation pattern or a drawer.

## Examples

# Sidebar examples

## Grouped navigation

```js
import { defineCustomElement as defineSidebar } from '@kimen/elements/ki-sidebar';
import { defineCustomElement as defineGroup } from '@kimen/elements/ki-sidebar-group';
import { defineCustomElement as defineItem } from '@kimen/elements/ki-sidebar-item';
import { defineCustomElement as defineTooltip } from '@kimen/elements/ki-tooltip';
import '@kimen/elements/icons/house';
import '@kimen/elements/icons/inbox';
import '@kimen/elements/icons/users';

const sidebar = document.querySelector('#main-sidebar');
sidebar.preference = { storageKey: 'sample-app:profile-42:main-sidebar' };

defineTooltip();
defineSidebar();
defineGroup();
defineItem();
```

```html
<ki-sidebar label="Main" collapsible id="main-sidebar">
  <span slot="brand">Kimen</span>
  <ki-sidebar-item href="/" icon-name="house" current>Home</ki-sidebar-item>
  <ki-sidebar-item href="/inbox" icon-name="inbox" count="12">Inbox</ki-sidebar-item>
  <ki-sidebar-group label="Workspace">
    <ki-sidebar-item href="/members" icon-name="users">Members</ki-sidebar-item>
  </ki-sidebar-group>
  <button slot="footer" type="button" aria-label="Account: Ana Garcia">AG</button>
</ki-sidebar>
```

Set the `preference` property before mounting or upgrading the element to
restore the saved mode.
Wire the footer trigger to your application's account menu. Use an app-owned
opaque profile identifier in the storage key, or omit the key and persist
`event.detail.collapsed` through your own preferences service.

## Localized count

```html
<ki-sidebar label="Principal" collapsible collapse-label="Contraer" expand-label="Expandir">
  <ki-sidebar-item href="/bandeja" count="12" count-label="{label}, {count} sin leer">
    Bandeja
  </ki-sidebar-item>
</ki-sidebar>
```

## Attributes

- `collapse-label` (string, default 'Collapse sidebar'): Accessible toggle name while the sidebar is expanded.
- `collapsed` (boolean, default false): Display the icon rail. May also be assigned by the application.
- `collapsible` (boolean, default false): Show the expand and collapse control.
- `expand-label` (string, default 'Expand sidebar'): Accessible toggle name while the sidebar is collapsed.
- `label` (string, default 'Main'): Accessible name for the navigation landmark.

## Slots

- (default): Navigation routes and groups, in reading order.
- `brand`: Presentational brand content for the expanded panel.
- `footer`: Account trigger or other app-owned content available in both modes.

## Parts

- `brand`: Expanded brand region.
- `footer`: Region at the foot of the sidebar.
- `header`: Brand and toggle layout.
- `list`: List of top-level items and groups.
- `nav`: Navigation landmark and surface.
- `toggle`: Native expand and collapse button.

## Events

- `ki-sidebar-change` (CustomEvent<{ collapsed: boolean }>): Reports the new collapsed state after a user toggle. Programmatic writes are silent.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-sidebar-backdrop-filter`: Complete backdrop filter for the panel.
- `--ki-sidebar-bg`: Navigation panel background.
- `--ki-sidebar-bg-image`: Optional image over the panel background.
- `--ki-sidebar-border`: Navigation panel outline.
- `--ki-sidebar-border-width`: Width of the panel outline.
- `--ki-sidebar-brand-weight`: Weight of the optional brand label.
- `--ki-sidebar-collapsed-width`: Compact rail inline size.
- `--ki-sidebar-fg`: Navigation panel text and brand ink.
- `--ki-sidebar-font-family`: Typeface of sidebar controls and copy.
- `--ki-sidebar-font-size`: Font size of navigation labels.
- `--ki-sidebar-gap`: Space between panel regions and between row contents.
- `--ki-sidebar-icon-size`: Leading and toggle icon edge.
- `--ki-sidebar-item-backdrop-filter`: Complete backdrop filter for the row or toggle.
- `--ki-sidebar-item-bg`: Resting row background.
- `--ki-sidebar-item-bg-image`: Optional image over navigation row and toggle backgrounds.
- `--ki-sidebar-item-fg`: Resting row ink, with contrast-more support.
- `--ki-sidebar-item-gap`: Gap between rows.
- `--ki-sidebar-item-height`: Base row and toggle height before density adjustment.
- `--ki-sidebar-item-hover-bg`: Hovered navigation row background.
- `--ki-sidebar-item-hover-fg`: Hovered navigation row ink.
- `--ki-sidebar-item-radius`: Corner of a row or toggle.
- `--ki-sidebar-line-height`: Line height of navigation labels.
- `--ki-sidebar-padding`: Inset between the panel border and its content.
- `--ki-sidebar-radius`: Navigation panel corner.
- `--ki-sidebar-width`: Expanded navigation panel inline size.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
