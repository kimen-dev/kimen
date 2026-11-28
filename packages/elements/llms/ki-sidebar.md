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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-sidebar`: the default, only the tokens ki-sidebar needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

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

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-sidebar-backdrop-filter`: Complete backdrop filter for the panel. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-sidebar-bg`: Navigation panel background. Default: `var(--ki-surface-s1)`.
- `--ki-sidebar-bg-image`: Optional image over the panel background. Default: `var(--ki-surface-image-none)`.
- `--ki-sidebar-border`: Navigation panel outline. Default: `var(--ki-outline-low-em)`.
- `--ki-sidebar-border-width`: Width of the panel outline. Default: `var(--ki-typography-underline-thickness)`.
- `--ki-sidebar-brand-weight`: Weight of the optional brand label. Default: `var(--ki-typography-weight-display-semibold)`.
- `--ki-sidebar-collapsed-width`: Compact rail inline size. Default: `var(--ki-side-navigation-rail-width)`.
- `--ki-sidebar-fg`: Navigation panel text and brand ink. Default: `var(--ki-text-high-em)`.
- `--ki-sidebar-font-family`: Typeface of sidebar controls and copy. Default: `var(--ki-typography-family-body)`.
- `--ki-sidebar-font-size`: Font size of navigation labels. Default: `var(--ki-typography-size-body-1)`.
- `--ki-sidebar-gap`: Space between panel regions and between row contents. Default: `var(--ki-space-md)`.
- `--ki-sidebar-icon-size`: Leading and toggle icon edge. Default: `var(--ki-glyph-size-md)`.
- `--ki-sidebar-item-backdrop-filter`: Complete backdrop filter for the row or toggle. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-sidebar-item-bg`: Resting row background. Default: `var(--ki-surface-s1)`.
- `--ki-sidebar-item-bg-image`: Optional image over navigation row and toggle backgrounds. Default: `var(--ki-surface-image-none)`.
- `--ki-sidebar-item-fg`: Resting row ink, with contrast-more support. Default: `var(--ki-text-supporting)`.
- `--ki-sidebar-item-gap`: Gap between rows. Default: `var(--ki-space-xxs)`.
- `--ki-sidebar-item-height`: Base row and toggle height before density adjustment. Default: `var(--ki-side-navigation-row-height)`.
- `--ki-sidebar-item-hover-bg`: Hovered navigation row background. Default: `var(--ki-surface-s3)`.
- `--ki-sidebar-item-hover-fg`: Hovered navigation row ink. Default: `var(--ki-text-high-em)`.
- `--ki-sidebar-item-radius`: Corner of a row or toggle. Default: `var(--ki-corner-navigation-row)`.
- `--ki-sidebar-line-height`: Line height of navigation labels. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-sidebar-padding`: Inset between the panel border and its content. Default: `var(--ki-space-md)`.
- `--ki-sidebar-radius`: Navigation panel corner. Default: `var(--ki-corner-navigation-panel)`.
- `--ki-sidebar-width`: Expanded navigation panel inline size. Default: `var(--ki-side-navigation-width)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
