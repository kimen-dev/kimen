# ki-list-item

> A non-interactive item inside `ki-list`, composed from leading media, primary text, optional secondary text and trailing media or meta.

## When to use

only as a child of `ki-list`, for one read-only entry in a
similar vertical collection.

## When not to use

outside `ki-list`, as a menu item, selectable option,
tabular row, navigation link or whole-item clickable control.

## Examples

Valid only as a child of `ki-list`; the default slot is the primary text line:

```html
<ki-list>
  <ki-list-item>Release 1.4 shipped</ki-list-item>
</ki-list>
```

`secondary` adds a supporting line below the primary text; its presence selects the multi-line min-height token:

```html
<ki-list>
  <ki-list-item>
    Backups
    <span slot="secondary">Last run 2 hours ago</span>
  </ki-list-item>
</ki-list>
```

`start` leads with media and `end` trails with meta or a slotted control; media beside the visible primary text is decorative (unlabeled avatar, empty `alt`), while a slotted control needs its own accessible name:

```html
<ki-list>
  <ki-list-item>
    <ki-avatar slot="start" initials="GH" size="sm"></ki-avatar>
    Grace Hopper
    <span slot="secondary">Compilers and COBOL</span>
    <ki-icon-button slot="end" size="sm" label="Edit Grace Hopper">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" fill="currentColor" /></svg>
    </ki-icon-button>
  </ki-list-item>
</ki-list>
```

## Attributes

None.

## Slots

- (default): Primary text line.
- `end`: Trailing media, meta text or a slotted control.
- `secondary`: Supporting text below the primary line. Its presence selects the multi-line min-height token.
- `start`: Leading media such as an icon, avatar or image.

## Parts

- `content`: Text column containing primary and secondary lines.
- `end`: Trailing region wrapper.
- `item`: Item row surface and layout container.
- `start`: Leading region wrapper.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce (WCAG 2.5.8 AA, 24 x 24 CSS px). Every scaled control floors its size at it: max(target-min, size + control-offset).
- `--ki-inverse-white-alpha-3`: semantic color for inverse white alpha 3.
- `--ki-inverse-white-alpha-6`: semantic color for inverse white alpha 6.
- `--ki-list-item-gap`: dimension used by the list component for item gap (MarsUI md/lg rows: Space/xl 12px between start/content/end regions).
- `--ki-list-item-min-height`: dimension used by the list component for item min height (MarsUI md text-only row is ~40px content-sized: 20px line + 2x10 padding).
- `--ki-list-item-min-height-multiline`: dimension used by the list component for multiline item min height (MarsUI md two-line row measures 56px).
- `--ki-list-item-padding-block`: dimension used by the list component for item padding block (MarsUI md rows: Space/lg 10px).
- `--ki-list-item-padding-inline`: dimension used by the list component for item padding inline.
- `--ki-list-item-primary-fg`: color used by the list component for item primary foreground.
- `--ki-list-item-primary-font-size`: dimension used by the list component for item primary font size.
- `--ki-list-item-primary-font-weight`: font weight used by the list component for item primary font weight.
- `--ki-list-item-primary-line-height`: dimension used by the list component for primary line height (MarsUI primary is UI/Para/medium 13/20, not UI/Body 1 13/24).
- `--ki-list-item-radius`: dimension used by the list component for item radius.
- `--ki-list-item-secondary-fg`: color used by the list component for item secondary foreground.
- `--ki-list-item-secondary-font-size`: dimension used by the list component for secondary font size (MarsUI description line is UI/Caption 2: 12px).
- `--ki-list-item-secondary-font-weight`: font weight used by the list component for item secondary font weight.
- `--ki-list-item-secondary-line-height`: dimension used by the list component for secondary line height (MarsUI caption_2 16px; same value as before with the correct provenance).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-typography-family-body`: semantic font family for typography family body.
