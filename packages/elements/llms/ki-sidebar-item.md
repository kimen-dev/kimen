# ki-sidebar-item

> One destination in a sidebar.

## When to use

link to a named destination in ki-sidebar or ki-sidebar-group.
Register ki-tooltip once when using direct component imports for a rail.

## When not to use

for commands, nested controls, or standalone links outside the sidebar.

## Examples

# Sidebar item example

Load `@kimen/elements/icons/inbox` to use the named icon.

```html
<ki-sidebar label="Main" collapsed>
  <ki-sidebar-item href="/inbox" icon-name="inbox" count="12" current>Inbox</ki-sidebar-item>
</ki-sidebar>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-sidebar-item`: the default, only the tokens ki-sidebar-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `count` (number | undefined): Positive unread count. Fractional values round down.
- `count-label` (string, default '{label}, {count} new'): Accessible count template, using the {label} and {count} placeholders.
- `current` (boolean, default false): Mark this destination as the current page.
- `href` (string | undefined, URL): Destination resolved by a native link. Omit for a static row.
- `icon-name` (string | undefined): Name of a registered Lucide glyph. Import its per-icon entry point first.

## Slots

- (default): The destination name as text or static inline content.
- `start`: One decorative icon that overrides icon-name.

## Parts

- `count`: Expanded pill or rail dot.
- `item`: Navigation link or static row.
- `label`: Destination text.
- `start`: Leading icon holder.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-sidebar-border-width`: Width of the panel outline.
- `--ki-sidebar-font-family`: Typeface of sidebar controls and copy.
- `--ki-sidebar-font-size`: Font size of navigation labels.
- `--ki-sidebar-gap`: Space between panel regions and between row contents.
- `--ki-sidebar-icon-size`: Leading and toggle icon edge.
- `--ki-sidebar-item-backdrop-filter`: Complete backdrop filter for the row or toggle.
- `--ki-sidebar-item-bg`: Resting row background.
- `--ki-sidebar-item-bg-image`: Optional image over navigation row and toggle backgrounds.
- `--ki-sidebar-item-count-backdrop-filter`: Complete backdrop filter behind the count.
- `--ki-sidebar-item-count-bg`: Expanded count pill background.
- `--ki-sidebar-item-count-bg-image`: Optional image over the count background.
- `--ki-sidebar-item-count-fg`: Expanded count digits.
- `--ki-sidebar-item-current-bg`: Current destination background.
- `--ki-sidebar-item-current-fg`: Current destination ink.
- `--ki-sidebar-item-dot-bg`: Unread dot fill in rail mode.
- `--ki-sidebar-item-dot-offset`: Inset of the dot from the row block-start and inline-end edges.
- `--ki-sidebar-item-dot-ring`: Outer ring that separates the rail dot from the row.
- `--ki-sidebar-item-fg`: Resting row ink, with contrast-more support.
- `--ki-sidebar-item-height`: Base row and toggle height before density adjustment.
- `--ki-sidebar-item-hover-bg`: Hovered navigation row background.
- `--ki-sidebar-item-hover-fg`: Hovered navigation row ink.
- `--ki-sidebar-item-padding`: Inline inset of an expanded row.
- `--ki-sidebar-item-radius`: Corner of a row or toggle.
- `--ki-sidebar-item-weight`: Weight of the navigation label.
- `--ki-sidebar-line-height`: Line height of navigation labels.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
