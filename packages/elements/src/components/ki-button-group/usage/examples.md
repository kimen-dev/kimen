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
