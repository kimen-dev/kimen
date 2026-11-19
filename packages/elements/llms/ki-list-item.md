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

- `size` ("lg" | "md" | "sm" | "xl", default 'md'): Token-backed row size (`--ki-list-item-{size}-*` tokens): minimum height (48, 56, 64 or 72px with a secondary line in onmars), padding, gap and text. Slotted start and end content keeps the size its author gave it. An unrecognized value matches no style rule and keeps the medium metrics. When to use: give every row of one list the same size. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.

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
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-inverse-white-alpha-3`: semantic color for inverse white alpha 3.
- `--ki-inverse-white-alpha-6`: semantic color for inverse white alpha 6.
- `--ki-list-item-gap`: dimension used by the list component for item gap (MarsUI md/lg rows: Space/xl 12px between start/content/end regions).
- `--ki-list-item-lg-gap`: dimension used by the list component for lg item gap (List 10063:2066 lg binds Space/xl, 12px).
- `--ki-list-item-lg-min-height`: dimension used by the list component for the lg one-line item min height (two List 10063:2066 lg block paddings plus the primary line: 48px).
- `--ki-list-item-lg-min-height-multiline`: dimension used by the list component for the lg two-line item min height (List 10063:2066 lg measures 64px).
- `--ki-list-item-lg-padding-block`: dimension used by the list component for lg item padding block (List 10063:2066 lg binds Space/xl, 12px).
- `--ki-list-item-lg-padding-inline`: dimension used by the list component for lg item padding inline (List 10063:2066 lg binds Space/md, 8px).
- `--ki-list-item-lg-primary-font-size`: dimension used by the list component for lg primary font size (List 10063:2066 lg primary: UI/body-2).
- `--ki-list-item-lg-primary-line-height`: dimension used by the list component for lg primary line height (List 10063:2066 lg).
- `--ki-list-item-lg-secondary-font-size`: dimension used by the list component for lg secondary font size (List 10063:2066 lg description: UI/caption-2).
- `--ki-list-item-lg-secondary-line-height`: dimension used by the list component for lg secondary line height (List 10063:2066 lg).
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
- `--ki-list-item-sm-gap`: dimension used by the list component for sm item gap (List 10063:2066 sm binds Space/lg, 10px).
- `--ki-list-item-sm-min-height`: dimension used by the list component for the sm one-line item min height (two List 10063:2066 sm block paddings plus the primary line: 32px).
- `--ki-list-item-sm-min-height-multiline`: dimension used by the list component for the sm two-line item min height (List 10063:2066 sm measures 48px).
- `--ki-list-item-sm-padding-block`: dimension used by the list component for sm item padding block (List 10063:2066 sm binds Space/sm, 6px).
- `--ki-list-item-sm-padding-inline`: dimension used by the list component for sm item padding inline (List 10063:2066 sm binds Space/md, 8px).
- `--ki-list-item-sm-primary-font-size`: dimension used by the list component for sm primary font size (List 10063:2066 sm primary: UI/para).
- `--ki-list-item-sm-primary-line-height`: dimension used by the list component for sm primary line height (List 10063:2066 sm).
- `--ki-list-item-sm-secondary-font-size`: dimension used by the list component for sm secondary font size (List 10063:2066 sm description: UI/caption-2).
- `--ki-list-item-sm-secondary-line-height`: dimension used by the list component for sm secondary line height (List 10063:2066 sm).
- `--ki-list-item-xl-gap`: dimension used by the list component for xl item gap (List 10063:2066 xl binds Space/3xl, 16px).
- `--ki-list-item-xl-min-height`: dimension used by the list component for the xl one-line item min height (two List 10063:2066 xl block paddings plus the primary line: 52px).
- `--ki-list-item-xl-min-height-multiline`: dimension used by the list component for the xl two-line item min height (List 10063:2066 xl measures 72px).
- `--ki-list-item-xl-padding-block`: dimension used by the list component for xl item padding block (List 10063:2066 xl binds Space/2xl, 14px).
- `--ki-list-item-xl-padding-inline`: dimension used by the list component for xl item padding inline (List 10063:2066 xl binds Space/xl, 12px).
- `--ki-list-item-xl-primary-font-size`: dimension used by the list component for xl primary font size (List 10063:2066 xl primary: UI/title-2).
- `--ki-list-item-xl-primary-line-height`: dimension used by the list component for xl primary line height (List 10063:2066 xl).
- `--ki-list-item-xl-secondary-font-size`: dimension used by the list component for xl secondary font size (List 10063:2066 xl description: UI/para).
- `--ki-list-item-xl-secondary-line-height`: dimension used by the list component for xl secondary line height (List 10063:2066 xl).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-typography-family-body`: semantic font family for typography family body.
