# ki-button-group

> Arranges related actions as a spaced group, attached group, or keyboard toolbar.

## When to use

place two to five related actions together, present a primary
action with a menu of alternatives, or give formatting tools one Tab stop.

## When not to use

for a single-choice setting, unrelated actions, or navigation.
Use a segmented control for a single-choice setting and links for navigation.

## Examples

# Using ki-button-group

## Spaced and attached groups

Use a label that describes what the actions do together. In attached mode the
first button provides the common variant and size. An explicit group size
applies in both modes.

```html
<ki-button-group label="History">
  <ki-button type="button">Undo</ki-button>
  <ki-button type="button">Redo</ki-button>
</ki-button-group>

<ki-button-group label="Clipboard" attached size="sm">
  <ki-button type="button">Copy</ki-button>
  <ki-button type="button">Paste</ki-button>
</ki-button-group>
```

## Formatting toolbar

Import the glyphs used by your page. Give each icon button a tooltip using the
same label. The application sets `pressed` as the formatting state changes. The native button exposes it as `aria-pressed`.

```js
import '@kimen/elements/icons/bold';
import '@kimen/elements/icons/list';
```

```html
<ki-button-group label="Formatting" toolbar size="sm">
  <ki-tooltip label="Bold">
    <ki-icon-button label="Bold" variant="ghost" pressed="true">
      <ki-icon name="bold"></ki-icon>
    </ki-icon-button>
  </ki-tooltip>
  <span role="separator" aria-orientation="vertical"></span>
  <ki-tooltip label="Bulleted list">
    <ki-icon-button label="Bulleted list" variant="ghost">
      <ki-icon name="list"></ki-icon>
    </ki-icon-button>
  </ki-tooltip>
</ki-button-group>
```

## Split button

With a build that includes `ki-menu`, anchor the menu to the chevron action.
Import `@kimen/elements/icons/chevron-down` before mounting the group. Handle the
main button's click and menu selection as separate actions.

```html
<ki-button-group label="Save actions" attached>
  <ki-button type="button" variant="primary">Save</ki-button>
  <ki-tooltip label="More save options">
    <ki-icon-button id="save-options" label="More save options" aria-haspopup="menu" expanded="false">
      <ki-icon name="chevron-down"></ki-icon>
    </ki-icon-button>
  </ki-tooltip>
</ki-button-group>

<ki-menu anchor="save-options">
  <ki-menu-item value="draft">Save as draft</ki-menu-item>
  <ki-menu-item value="copy">Save a copy</ki-menu-item>
</ki-menu>
```

Keep the icon button's `expanded` property in sync with the menu's `open`
state. Its native button exposes that state as `aria-expanded`.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-button-group`: the default, only the tokens ki-button-group needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `attached` (boolean, default false): Joins neighboring actions at their inner edges. Buttons share the first button's variant and use its size when the group has no explicit size. Use for a closely related set of actions or for a split button.
- `label` (string, required): Required accessible name for the group or toolbar (for example, "Text formatting"). Provide a localized name that describes the actions' shared purpose.
- `size` ("lg" | "md" | "sm" | "xl" | "xs" | undefined): Applies one token-backed size to each button while it belongs to the group. Omit it to keep individual sizes in spaced mode.
- `toolbar` (boolean, default false): Gives the group toolbar semantics, a framed surface and one Tab stop. Horizontal arrows, Home and End move between the toolbar's actions.

## Slots

- (default): Related ki-button and ki-icon-button controls, in reading order. Wrap labeled icon actions in ki-tooltip with the same label to show the label on focus and hover. A toolbar can also include vertical separators.

## Parts

- `group`: The named group or toolbar surface.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-button-group-attached-gap`: Gap between joined actions. Default: `var(--ki-spacing-action-joined-gap)`.
- `--ki-button-group-attached-radius`: Radius of the logical corners along a shared button edge. Default: `var(--ki-corner-action-seam)`.
- `--ki-button-group-backdrop-filter`: Complete optional backdrop filter for the toolbar surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-button-group-bg`: Toolbar surface colour. Default: `var(--ki-surface-raised)`.
- `--ki-button-group-bg-image`: Optional decorative image over the toolbar surface. Default: `var(--ki-surface-image-none)`.
- `--ki-button-group-border-color`: Thin toolbar frame colour. Default: `var(--ki-outline-low-em)`.
- `--ki-button-group-border-width`: Thickness of the toolbar frame and divider. Default: `var(--ki-spacing-action-hairline)`.
- `--ki-button-group-divider`: Decorative toolbar separator ink. Default: `var(--ki-outline-low-em)`.
- `--ki-button-group-divider-size`: Block size of a vertical toolbar separator. Default: `var(--ki-glyph-size-md)`.
- `--ki-button-group-fg`: Default toolbar foreground on its raised surface. Default: `var(--ki-text-high-em)`.
- `--ki-button-group-gap`: Gap between actions in a spaced group. Default: `var(--ki-spacing-action-gap)`.
- `--ki-button-group-padding`: Toolbar frame inset and divider margin. Default: `var(--ki-spacing-action-inset)`.
- `--ki-button-group-radius`: Logical outside radius of the toolbar frame. Default: `var(--ki-corner-action-frame)`.
- `--ki-button-group-seam-overlap`: Shared-edge overlap between adjacent attached actions. Default: `var(--ki-spacing-action-hairline)`.
- `--ki-button-group-toolbar-gap`: Gap between toolbar actions. Default: `var(--ki-spacing-action-compact-gap)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
