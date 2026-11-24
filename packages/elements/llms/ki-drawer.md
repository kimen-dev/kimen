# ki-drawer

> An edge-aligned sheet for a focused task that keeps the current page in context.

## When to use

Edit an item beside its list or offer a short set of actions in a
bottom sheet. Supply a heading and wire slotted actions in the application.
Use non-modal mode if people need to interact with the page while editing.

## When not to use

Menus, hover hints, permanent navigation, or work that needs a
full page. For a short interrupting decision in the center, use ki-dialog.

## Examples

## Edit details beside a list

Use `heading` to name the sheet. Open it from a focused trigger so focus can
return there. The app wires its own footer actions.

```html
<ki-button id="edit-incident" type="button">Edit incident</ki-button>
<ki-drawer id="incident-editor" heading="Edit incident" placement="end">
  <ki-input label="Title" value="Search index rebuild"></ki-input>
  <ki-button slot="footer" id="save-incident" type="button" variant="primary">
    Save
  </ki-button>
</ki-drawer>

<script type="module">
  const editor = document.querySelector('#incident-editor');
  document.querySelector('#edit-incident').addEventListener('click', () => editor.show());
  document.querySelector('#save-incident').addEventListener('click', () => {
    // Save the app's changes first.
    editor.close();
  });
  editor.addEventListener('ki-close', (event) => {
    if (editor.hasAttribute('data-unsaved')) event.preventDefault();
  });
</script>
```

## Offer a short list of actions

A bottom sheet has a swipe handle and a keyboard-accessible Close button.
Use `close-label` to translate the button for your audience.

```html
<ki-drawer heading="Share incident" placement="bottom" size="20rem" open>
  <p>Choose how to share the incident.</p>
  <ki-button slot="footer" variant="secondary">Email</ki-button>
  <ki-button slot="footer" variant="primary">Copy link</ki-button>
</ki-drawer>
```

Use `modal="false"` when the page behind the drawer should stay interactive.
`placement="start"` and `placement="end"` follow the inherited direction.

## Attributes

- `close-label` (string | undefined, default 'Close'): Accessible name for the built-in Close button. Translate this for localized interfaces.
- `heading` (string, required): Title and accessible name. Provide a heading whenever the drawer opens.
- `modal` (boolean, default true): Makes the page behind the sheet inert. Set modal="false" for continued page interaction.
- `open` (boolean, default false): Reflected live state. Setting it to false requests dismissal and may be vetoed.
- `placement` ("bottom" | "end" | "start", default 'end'): Logical edge. Use bottom for an action sheet with a swipe handle. Unknown values use end.
- `size` (string | undefined): Optional CSS length. Overrides the 18rem themed width or bottom height cap.

## Slots

- (default): The drawer's content, such as fields or a short list of actions.
- `footer`: Optional actions such as Save. Wire these in the application.
- `header-actions`: Optional actions between the heading and Close button.

## Parts

- `body`: The scrollable content region.
- `close`: The built-in Close button.
- `dialog`: The native sheet surface.
- `footer`: The action row, collapsed when empty.
- `handle`: The decorative bottom-sheet swipe handle.
- `header`: The heading and action layout.
- `heading`: The visible title that names the sheet.

## Events

- `ki-close` (CustomEvent<KiDrawerCloseDetail>): Requests dismissal before the drawer closes, also on `close()` or a cleared `open`: it can fire without a gesture. Call preventDefault() to keep it open, for example when edits are unsaved. The event carries the reason in detail.reason.

## Methods

- `close()` (Promise<void>): Requests dismissal. An application can veto it by canceling ki-close.
- `show()` (Promise<void>): Opens the sheet. A focused invoker receives focus again after modal dismissal.

## CSS custom properties

- `--ki-corner-control`: Deprecated alias kept for pre-Fase-1 consumers; use ki.radius.md.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-dialog-backdrop-bg`: color used by the dialog component for backdrop background.
- `--ki-dialog-divider-width`: dimension used by the dialog component for the dividers under the heading and above the footer (Modal-header and Modal-actions 1px strokes). Zero removes them.
- `--ki-drawer-backdrop-filter`: Complete backdrop filter applied behind the drawer surface.
- `--ki-drawer-bg`: Raised surface color of the drawer.
- `--ki-drawer-bg-image`: Optional image layered over the drawer surface.
- `--ki-drawer-close-size`: Preferred size of the Close button before the density minimum.
- `--ki-drawer-fg`: Foreground color on the drawer surface.
- `--ki-drawer-handle-color`: Color of the bottom-sheet handle.
- `--ki-drawer-handle-size`: Inline extent of the bottom-sheet handle.
- `--ki-drawer-handle-thickness`: Thickness of the bottom-sheet handle.
- `--ki-drawer-heading-font-family`: Typeface of the drawer title.
- `--ki-drawer-radius`: Radius of the corners on the inner edge of the drawer.
- `--ki-drawer-shadow`: Resting elevation of the drawer.
- `--ki-drawer-size`: Default inline size of a side sheet and block-size cap of a bottom sheet.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-2xl`: The 2xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-outline-low-em`: semantic color for outline low em.
- `--ki-surface-hover-overlay-inverse`: semantic color for surface hover overlay inverse.
- `--ki-surface-transparent`: Transparent surface backing for a background image that carries its own opacity.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-title-2`: semantic dimension for typography line height title 2.
- `--ki-typography-size-title-2`: semantic dimension for typography size title 2.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
