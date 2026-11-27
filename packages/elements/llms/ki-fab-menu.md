# ki-fab-menu

> An icon FAB that opens two to six related actions above its trigger.

## When to use

group related creation or screen actions behind one floating button.

## When not to use

for a single primary action, long lists, or site navigation.

## Examples

# Floating action menu examples

Register optional Lucide glyphs, then register the menu and its item together.

```ts
import '@kimen/elements/icons/calendar';
import '@kimen/elements/icons/pencil';
import { defineCustomElement as defineItem } from '@kimen/elements/ki-fab-menu-item';
import { defineCustomElement as defineMenu } from '@kimen/elements/ki-fab-menu';

defineItem();
defineMenu();
```

```html
<ki-fab-menu label="Create" icon-name="plus" position="fixed">
  <ki-fab-menu-item icon-name="pencil" value="message">New message</ki-fab-menu-item>
  <ki-fab-menu-item icon-name="calendar" href="/events/new">New event</ki-fab-menu-item>
</ki-fab-menu>
```

Listen to `ki-select` on the menu to handle commands. Use the stable `value`
in the event detail. Leave link navigation to the native anchor. In a catalog
spec, bind separate action IDs to command items and supply a stable `value`
for each item. Keep link items unbound.

Use two to six direct items. Fixed placement shares the FAB's safe-area
and navigation clearance tokens. In static placement, leave space above
the trigger for the stack.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-fab-menu`: the default, only the tokens ki-fab-menu needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `close-label` (string, default 'Close menu'): Localized accessible name of the trigger when it becomes the close control.
- `icon-name` (string, default 'plus'): Registered Lucide glyph for the closed trigger. The plus glyph ships with the component.
- `label` (string, required): Accessible name of the closed trigger and of the menu.
- `open` (boolean, default false): Whether the action stack is open. Reflected when the user opens or dismisses it.
- `position` ("fixed" | "static", default 'static'): Static anchors to the host. Fixed anchors to the viewport's block-end inline-end corner.
- `scrim` (boolean, default true): Dim the viewport and dismiss on a scrim click. Use the boolean property or scrim="false" to opt out.
- `variant` ("primary" | "secondary" | "surface", default 'secondary'): Closed FAB surface. The open trigger always uses primary.

## Slots

- (default): Two to six direct ki-fab-menu-item children, in top-to-bottom order.

## Parts

- `menu`: The named action list above the trigger.
- `scrim`: The optional pointer-dismissible overlay behind the menu.
- `trigger`: The native floating button that opens and closes the menu.

## Events

- `ki-close` (CustomEvent<void>): Emitted when the action stack closes.
- `ki-open` (CustomEvent<void>): Emitted when the action stack opens.
- `ki-select` (CustomEvent<KiFabMenuSelectDetail>): Emits the selected item's value or its trimmed label. Native links retain their destination.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-fab-backdrop-filter`: Complete optional filter behind the FAB. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-fab-bg`: Tinted secondary FAB fill. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-fab-bg-image`: Optional layer painted over the FAB fill. Default: `var(--ki-surface-image-none)`.
- `--ki-fab-fg`: Ink on the tinted secondary FAB. Default: `var(--ki-text-primary-on-primary-light)`.
- `--ki-fab-font-family`: Typeface for FAB labels. Default: `var(--ki-typography-family-body)`.
- `--ki-fab-forced-colors-border-width`: Boundary width for the FAB in forced colors. Default: `var(--ki-typography-visually-hidden-size)`.
- `--ki-fab-hover-shadow`: FAB elevation for a pointer that can hover. Default: `var(--ki-elevation-e4)`.
- `--ki-fab-icon-size`: Glyph size of the default FAB. Default: `var(--ki-glyph-size-lg)`.
- `--ki-fab-menu-gap`: Gap between two stacked actions. Default: `var(--ki-layout-spacing-xs)`.
- `--ki-fab-menu-scrim-backdrop-filter`: Complete optional filter behind the scrim. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-fab-menu-scrim-bg`: Dimming fill behind the open menu and its trigger. Default: `var(--ki-overlay-high-em)`.
- `--ki-fab-menu-scrim-bg-image`: Optional image painted above the scrim fill. Default: `var(--ki-surface-image-none)`.
- `--ki-fab-menu-trigger-bg`: Fill of the closed trigger in the default secondary variant: the secondary FAB's tonal fill, or in onmars v2 the primary FAB ink, so the accent stays on selection, links and focus. Default: onmars `var(--ki-fab-primary-bg)`, material3 `var(--ki-surface-primary-low-em)`.
- `--ki-fab-menu-trigger-fg`: Glyph ink on the closed secondary trigger. Default: onmars `var(--ki-fab-primary-fg)`, material3 `var(--ki-text-primary-on-primary-light)`.
- `--ki-fab-menu-trigger-gap`: Gap between the last action and the FAB. Default: `var(--ki-layout-spacing-md)`.
- `--ki-fab-mobile-nav-block-size`: Height to reserve for mobile navigation, excluding the safe-area inset. Default: `var(--ki-layout-spacing-zero)`.
- `--ki-fab-offset`: Fixed FAB gap to the viewport edge or mobile navigation. Default: `var(--ki-layout-spacing-3xl)`.
- `--ki-fab-primary-bg`: Strong primary FAB fill. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-fab-primary-fg`: Ink on the strong primary FAB. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-fab-radius`: Corner radius of the default FAB size. Default: `var(--ki-radius-component-2xl)`.
- `--ki-fab-shadow`: Resting FAB elevation. Default: `var(--ki-elevation-e3)`.
- `--ki-fab-size`: Minimum FAB footprint in the default size. Default: `var(--ki-layout-floating-action-md)`.
- `--ki-fab-surface-bg`: Raised surface FAB fill. Default: `var(--ki-surface-s1)`.
- `--ki-fab-surface-fg`: Ink on the raised surface FAB. Default: `var(--ki-text-primary-high-em)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
