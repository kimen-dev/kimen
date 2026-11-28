# ki-list-item

> A row inside `ki-list`, composed from leading media, primary text, optional secondary text and trailing content.

## When to use

as a direct child of `ki-list`, for a static entry, link,
selection option, or a settings row with one control.

## When not to use

as a menu item, tabular row, or row with several actions.

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

`start` leads with media and `end` trails with meta or a slotted control; media beside the visible primary text is decorative (unlabeled avatar, empty `alt`), while an unlabeled trailing control receives its name from the row:

```html
<ki-list label="Contacts">
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

```html
<ki-list label="Settings">
  <ki-list-item href="/settings/account">
    Account
    <span slot="secondary">Name, email, password</span>
  </ki-list-item>
</ki-list>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-list-item`: the default, only the tokens ki-list-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `disabled` (boolean, default false): Excludes this option from focus, selection by the user, and form data.
- `href` (string | undefined, URL): Native row link destination. Use outside selection lists, with no slotted interactive content.
- `selected` (boolean, default false): Whether this row is selected in a single- or multiple-selection list.
- `size` ("lg" | "md" | "sm" | "xl", default 'md'): Token-backed row size (`--ki-list-item-{size}-*` tokens): minimum height (48, 56, 64 or 72px with a secondary line in onmars), padding, gap and text. Slotted start and end content keeps the size its author gave it. An unrecognized value matches no style rule and keeps the medium metrics. When to use: give every row of one list the same size. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string | undefined): Submitted option value. The primary row text supplies the default.

## Slots

- (default): Primary text line.
- `end`: Trailing media, meta text or the only control of a settings row.
- `secondary`: Supporting text below the primary line. Its presence selects the multi-line min-height token.
- `start`: Leading media such as an icon, avatar or image.

## Parts

- `content`: Text column containing primary and secondary lines.
- `end`: Trailing region wrapper.
- `indicator`: Decorative navigation or selection indicator.
- `item`: Item row surface and layout container.
- `start`: Leading region wrapper.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-inverse-white-alpha-3`: semantic color for inverse white alpha 3. Default: `light-dark(var(--ki-color-black-3),var(--ki-color-white-3))`.
- `--ki-inverse-white-alpha-6`: semantic color for inverse white alpha 6. Default: `light-dark(var(--ki-color-black-5),var(--ki-color-white-5))`.
- `--ki-list-item-checkbox-radius`: Corner radius of a multiple-selection indicator. Default: `var(--ki-corner-inline)`.
- `--ki-list-item-checkbox-selected-bg`: Fill of the selected multiple-choice indicator. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-list-item-checkbox-selected-fg`: Check mark ink on the selected indicator. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-list-item-gap`: dimension used by the list component for item gap (MarsUI md/lg rows: Space/xl 12px between start/content/end regions). Default: onmars `var(--ki-space-xl)`, material3 `var(--ki-space-3xl)`.
- `--ki-list-item-hover-bg`: Background of an unselected hovered interactive list row. Default: `var(--ki-surface-s2)`.
- `--ki-list-item-hover-fg`: Text and indicator on an unselected hovered interactive list row. Default: `var(--ki-text-high-em)`.
- `--ki-list-item-indicator-border-width`: Stroke around a visual option indicator. Default: `var(--ki-layout-spacing-xxs)`.
- `--ki-list-item-indicator-size`: Edge of the trailing selection or navigation mark. Default: `var(--ki-typography-inline-icon-size)`.
- `--ki-list-item-interactive-backdrop-filter`: Complete backdrop filter for an interactive list row. Default: `var(--ki-effect-no-backdrop-filter)`.
- `--ki-list-item-interactive-bg`: Resting fill of an unselected interactive list row. Default: `var(--ki-surface-transparent)`.
- `--ki-list-item-interactive-bg-image`: Optional image layered over interactive list row fills. Default: `var(--ki-surface-image-none)`.
- `--ki-list-item-interactive-radius`: Corner radius of link and option rows. Default: `var(--ki-radius-component-md)`.
- `--ki-list-item-lg-gap`: dimension used by the list component for lg item gap (List 10063:2066 lg binds Space/xl, 12px). Default: `var(--ki-space-xl)`.
- `--ki-list-item-lg-min-height`: dimension used by the list component for the lg one-line item min height (two List 10063:2066 lg block paddings plus the primary line: 48px). Default: `var(--ki-space-14xl)`.
- `--ki-list-item-lg-min-height-multiline`: dimension used by the list component for the lg two-line item min height (List 10063:2066 lg measures 64px). Default: `var(--ki-space-18xl)`.
- `--ki-list-item-lg-padding-block`: dimension used by the list component for lg item padding block (List 10063:2066 lg binds Space/xl, 12px). Default: `var(--ki-space-xl)`.
- `--ki-list-item-lg-padding-inline`: dimension used by the list component for lg item padding inline (List 10063:2066 lg binds Space/md, 8px). Default: `var(--ki-space-md)`.
- `--ki-list-item-lg-primary-font-size`: dimension used by the list component for lg primary font size (List 10063:2066 lg primary: UI/body-2). Default: `var(--ki-typography-size-body-2)`.
- `--ki-list-item-lg-primary-line-height`: dimension used by the list component for lg primary line height (List 10063:2066 lg). Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-list-item-lg-secondary-font-size`: dimension used by the list component for lg secondary font size (List 10063:2066 lg description: UI/caption-2). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-list-item-lg-secondary-line-height`: dimension used by the list component for lg secondary line height (List 10063:2066 lg). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-list-item-min-height`: dimension used by the list component for item min height (MarsUI md text-only row is ~40px content-sized: 20px line + 2x10 padding). Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-14xl)`.
- `--ki-list-item-min-height-multiline`: dimension used by the list component for multiline item min height (MarsUI md two-line row measures 56px). Default: onmars `var(--ki-space-16xl)`, material3 `var(--ki-space-18xl)`.
- `--ki-list-item-padding-block`: dimension used by the list component for item padding block (MarsUI md rows: Space/lg 10px). Default: onmars `var(--ki-space-lg)`, material3 `var(--ki-space-md)`.
- `--ki-list-item-padding-inline`: dimension used by the list component for item padding inline. Default: onmars `var(--ki-space-md)`, material3 `var(--ki-space-3xl)`.
- `--ki-list-item-primary-fg`: color used by the list component for item primary foreground. Default: `var(--ki-text-high-em)`.
- `--ki-list-item-primary-font-size`: dimension used by the list component for item primary font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-list-item-primary-font-weight`: font weight used by the list component for item primary font weight. Default: onmars `var(--ki-typography-weight-body-medium)`, material3 `var(--ki-typography-weight-body-normal)`.
- `--ki-list-item-primary-line-height`: dimension used by the list component for primary line height (MarsUI primary is UI/Para/medium 13/20, not UI/Body 1 13/24). Default: onmars `var(--ki-typography-line-height-para)`, material3 `var(--ki-typography-line-height-body-1)`.
- `--ki-list-item-radio-radius`: Corner radius of a single-selection indicator. Default: `var(--ki-corner-activity-mark)`.
- `--ki-list-item-radius`: dimension used by the list component for item radius. Default: `var(--ki-radius-0)`.
- `--ki-list-item-secondary-fg`: color used by the list component for item secondary foreground. Default: `var(--ki-text-supporting)`.
- `--ki-list-item-secondary-font-size`: dimension used by the list component for secondary font size (MarsUI description line is UI/Caption 2: 12px). Default: onmars `var(--ki-typography-size-caption-2)`, material3 `var(--ki-typography-size-caption-1)`.
- `--ki-list-item-secondary-font-weight`: font weight used by the list component for item secondary font weight. Default: `var(--ki-typography-weight-body-normal)`.
- `--ki-list-item-secondary-line-height`: dimension used by the list component for secondary line height (MarsUI caption_2 16px; same value as before with the correct provenance). Default: onmars `var(--ki-typography-line-height-caption-2)`, material3 `var(--ki-typography-line-height-caption-1)`.
- `--ki-list-item-selected-bg`: Background of a selected list option. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-list-item-selected-fg`: Text and indicator on a selected list option. Default: `var(--ki-text-primary-on-primary-light)`.
- `--ki-list-item-sm-gap`: dimension used by the list component for sm item gap (List 10063:2066 sm binds Space/lg, 10px). Default: `var(--ki-space-lg)`.
- `--ki-list-item-sm-min-height`: dimension used by the list component for the sm one-line item min height (two List 10063:2066 sm block paddings plus the primary line: 32px). Default: `var(--ki-space-10xl)`.
- `--ki-list-item-sm-min-height-multiline`: dimension used by the list component for the sm two-line item min height (List 10063:2066 sm measures 48px). Default: `var(--ki-space-14xl)`.
- `--ki-list-item-sm-padding-block`: dimension used by the list component for sm item padding block (List 10063:2066 sm binds Space/sm, 6px). Default: `var(--ki-space-sm)`.
- `--ki-list-item-sm-padding-inline`: dimension used by the list component for sm item padding inline (List 10063:2066 sm binds Space/md, 8px). Default: `var(--ki-space-md)`.
- `--ki-list-item-sm-primary-font-size`: dimension used by the list component for sm primary font size (List 10063:2066 sm primary: UI/para). Default: `var(--ki-typography-size-body-1)`.
- `--ki-list-item-sm-primary-line-height`: dimension used by the list component for sm primary line height (List 10063:2066 sm). Default: `var(--ki-typography-line-height-para)`.
- `--ki-list-item-sm-secondary-font-size`: dimension used by the list component for sm secondary font size (List 10063:2066 sm description: UI/caption-2). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-list-item-sm-secondary-line-height`: dimension used by the list component for sm secondary line height (List 10063:2066 sm). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-list-item-xl-gap`: dimension used by the list component for xl item gap (List 10063:2066 xl binds Space/3xl, 16px). Default: `var(--ki-space-3xl)`.
- `--ki-list-item-xl-min-height`: dimension used by the list component for the xl one-line item min height (two List 10063:2066 xl block paddings plus the primary line: 52px). Default: `var(--ki-space-15xl)`.
- `--ki-list-item-xl-min-height-multiline`: dimension used by the list component for the xl two-line item min height (List 10063:2066 xl measures 72px). Default: `var(--ki-space-19xl)`.
- `--ki-list-item-xl-padding-block`: dimension used by the list component for xl item padding block (List 10063:2066 xl binds Space/2xl, 14px). Default: `var(--ki-space-2xl)`.
- `--ki-list-item-xl-padding-inline`: dimension used by the list component for xl item padding inline (List 10063:2066 xl binds Space/xl, 12px). Default: `var(--ki-space-xl)`.
- `--ki-list-item-xl-primary-font-size`: dimension used by the list component for xl primary font size (List 10063:2066 xl primary: UI/title-2). Default: `var(--ki-typography-size-title-2)`.
- `--ki-list-item-xl-primary-line-height`: dimension used by the list component for xl primary line height (List 10063:2066 xl). Default: `var(--ki-typography-line-height-title-2)`.
- `--ki-list-item-xl-secondary-font-size`: dimension used by the list component for xl secondary font size (List 10063:2066 xl description: UI/para). Default: `var(--ki-typography-size-body-1)`.
- `--ki-list-item-xl-secondary-line-height`: dimension used by the list component for xl secondary line height (List 10063:2066 xl). Default: `var(--ki-typography-line-height-para)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
