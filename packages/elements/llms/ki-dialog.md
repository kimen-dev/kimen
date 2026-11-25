# ki-dialog

> A modal dialog for an interrupting decision or a focused task.

## When to use

destructive confirmations, blocking choices, and brief
critical input that must be resolved before returning to the page. Always
provide a `heading`, place actions in the `footer` slot, wire each
dismissal to `close()` or a close command, and in destructive confirmations put `autofocus` on
the least destructive action. Use `fullscreen="compact"` for longer tasks
that need the whole window on compact screens.

## When not to use

non-blocking feedback (`ki-alert`, `ki-toast`),
supplementary hints (`ki-tooltip`), multi-step flows that need their own
page, menus, or pickers.

## Examples

A modal confirmation. `heading` names the dialog and actions go in the `footer`
slot. Each invoker uses the dialog's ID within the same document or shadow root.

```html
<ki-button commandfor="confirm-dialog" command="show-modal" tone="danger">Delete draft</ki-button>
<ki-dialog heading="Delete draft?" id="confirm-dialog">
  <p>This permanently removes the draft.</p>
  <ki-button slot="footer" commandfor="confirm-dialog" command="request-close" autofocus>Cancel</ki-button>
  <ki-button slot="footer" commandfor="confirm-dialog" command="close" tone="danger" variant="primary">Delete</ki-button>
</ki-dialog>
```

`close` dismisses the dialog. `request-close` first gives the dialog a chance
to cancel the request. After an accepted close command, the opening button
regains focus and `ki-close` reports `detail.reason: 'command'`. `show()` and
`close()` remain available for programmatic control.


## Edit a longer form

```html
<ki-button commandfor="event-details" command="show-modal">Add event</ki-button>
<ki-dialog id="event-details" heading="New event" fullscreen="compact"
  confirm-label="Save" close-label="Discard and close">
  <ki-input label="Title"></ki-input>
  <ki-input label="Date"></ki-input>
</ki-dialog>
```

Below 600 CSS pixels the modal fills the window and keeps its heading and
actions visible above the scrollable body. At wider widths `Save` moves to
the centered dialog's footer. Handle `ki-confirm` to save the form and call
`close()` after success. In fullscreen, call `preventDefault()` on
`ki-close` to veto Escape or the header close button while editing.

When importing the dialog directly, register `ki-button` to use the themed
confirmation button. A single-element import still provides a native
confirmation button with the same label and event.

## Token stylesheets

- `@kimen/tokens/css`: every token, once per page. The default.
- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-dialog`: the light option, only the tokens ki-dialog needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.

## Attributes

- `close-label` (string, default 'Close'): Accessible name for the fullscreen close button. Localize it or describe the effect of dismissing, for example "Discard and close".
- `close-on-backdrop` (boolean, default false): Opts into backdrop light-dismiss. Omit this attribute for critical confirmations; `close-on-backdrop="false"` still enables it. When to use: low-risk dialogs where an outside click may safely dismiss. When NOT to use: destructive confirmations or decisions that should not be lost to a stray click; omit the attribute entirely rather than setting it to `"false"`.
- `confirm-label` (string | undefined): Label for the optional confirmation button. Use an action verb such as "Save". The button is in the fullscreen header or the centered footer.
- `fullscreen` ("always" | "compact" | "never", default 'never'): Layout for the native modal. Use `compact` to fill windows narrower than 600 CSS pixels, or `always` to fill any window. Use `never` for a centered dialog at every width.
- `heading` (string, required): Visible dialog title and accessible-name source. Always provide a heading; an empty value intentionally leaves the native dialog unnamed. When to use: name the interrupting decision, for example "Delete account?". When NOT to use: do not omit it for production dialogs; APG modal dialogs require an accessible name.
- `open` (boolean, default false): Reflected live modal state. Add it or call `show()` to open; remove it or call `close()` to close. When open, the native dialog enters the top layer and the page behind is inert. When to use: bind application state to the dialog's modal lifecycle. When NOT to use: do not set the internal native `<dialog open>` attribute; the host attribute is the only public source of truth.

## Slots

- (default): Dialog body content.
- `footer`: Dialog actions. Dismiss using an invoker command or `close()`.

## Parts

- `body`: Scrollable body region.
- `dialog`: Internal native dialog surface.
- `footer`: Action row, collapsed when empty.
- `header`: Fullscreen bar with the title and its controls.
- `heading`: Visible h2 title, rendered only when `heading` is non-empty.

## Events

- `ki-close` (CustomEvent<KiDialogCloseDetail>): Requests dismissal on fullscreen Escape or activation of the header close button. Prevent the default on that cancelable event to keep the modal open. The button reports `method` and Escape reports `escape`. Every other dismissal path, `close()` and a cleared `open` included, emits a noncancelable notification after close and focus restoration: it can fire without a gesture. Use `open` to observe the modal's live state.
- `ki-confirm` (CustomEvent<void>): The user activated the confirmation button. Handle validation, submission and dismissal in the application.

## Methods

- `close()` (Promise<void>): Closes the dialog and reports `method`. No-op when already closed. Equivalent to removing the host `open` attribute. Footer actions never close automatically; wire them to this method or an invoker command. When to use: resolve footer actions, programmatic dismissals, and application-controlled cancellation. When NOT to use: do not use for Escape or backdrop bookkeeping; those paths set their own close reasons.
- `show()` (Promise<void>): Opens the dialog modally. No-op when already open. Equivalent to adding the host `open` attribute. When to use: call from the invoker that should receive focus again after close. When NOT to use: do not call repeatedly to refresh content; update slotted content directly while open.

## CSS custom properties

- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500).
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground.
- `--ki-control-radius-item`: Corner radius of an individual control inside a track.
- `--ki-control-size-md`: Medium control track height, 40 CSS px at the default root size.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-dialog-backdrop-bg`: color used by the dialog component for backdrop background.
- `--ki-dialog-backdrop-filter`: Complete backdrop filter behind the dialog surface.
- `--ki-dialog-bg`: Base background color of the dialog. Onmars v1 used a transparent backing beneath its translucent image.
- `--ki-dialog-bg-image`: Optional CSS background image layered over the dialog fill. Use none for a solid fill.
- `--ki-dialog-body-padding-block-end`: dimension used by the dialog component for body section padding block end (Modal compact Body: Space/5xl 20px.)
- `--ki-dialog-body-padding-block-start`: dimension used by the dialog component for body section padding block start (Modal compact Body 16414:19668: Space/5xl 20px.)
- `--ki-dialog-body-padding-inline`: dimension used by the dialog component for body section padding inline (Modal compact Body: Space/5xl 20px.)
- `--ki-dialog-border`: border used by the dialog component for border (MarsUI 1px solid Outline/base_em Black/3 light / White/3 dark; retires the migrated Black/5 foundation reference).
- `--ki-dialog-divider-color`: color used by the dialog component for the dividers under the heading and above the footer (Outline/base-em).
- `--ki-dialog-divider-width`: dimension used by the dialog component for the dividers under the heading and above the footer (Modal-header and Modal-actions 1px strokes). Zero removes them.
- `--ki-dialog-fg`: color used by the dialog component for foreground.
- `--ki-dialog-focus-ring-color`: color used by the dialog component for focus ring color.
- `--ki-dialog-focus-ring-offset`: dimension used by the dialog component for focus ring offset.
- `--ki-dialog-focus-ring-width`: dimension used by the dialog component for focus ring width.
- `--ki-dialog-footer-padding-block-end`: dimension used by the dialog component for footer section padding block end (Modal-actions/CTAs: Space/7xl 24px.)
- `--ki-dialog-footer-padding-block-start`: dimension used by the dialog component for footer section padding block start (Modal-actions/CTAs 14158:28302: Space/7xl 24px, below the divider.)
- `--ki-dialog-footer-padding-inline`: dimension used by the dialog component for footer section padding inline (Modal-actions/CTAs: Space/5xl 20px.)
- `--ki-dialog-fullscreen-backdrop-filter`: Complete backdrop filter for the fullscreen surface.
- `--ki-dialog-fullscreen-bg`: Solid raised surface for the fullscreen dialog.
- `--ki-dialog-fullscreen-bg-image`: Optional image over the fullscreen fill.
- `--ki-dialog-fullscreen-fg`: Foreground for the fullscreen dialog.
- `--ki-dialog-fullscreen-header-border`: Divider beneath the fullscreen header.
- `--ki-dialog-fullscreen-header-height`: Minimum block size of the fullscreen header.
- `--ki-dialog-gap`: dimension used by the dialog component for the gap between its footer actions (Modal-actions/CTAs 14158:28302: Space/xl 12px).
- `--ki-dialog-heading-font-family`: Font family for the dialog heading. Override it to give dialogs their own heading typeface.
- `--ki-dialog-heading-font-size`: dimension used by the dialog component for heading font size.
- `--ki-dialog-heading-font-weight`: font weight used by the dialog component for heading font weight.
- `--ki-dialog-heading-letter-spacing`: Letter spacing for the dialog heading. Override it to tune tracking for the chosen heading typeface.
- `--ki-dialog-heading-line-height`: dimension used by the dialog component for heading line height.
- `--ki-dialog-heading-padding-block-end`: dimension used by the dialog component for heading section padding block end (Modal-header compact: Space/3xl 16px, above the divider.)
- `--ki-dialog-heading-padding-block-start`: dimension used by the dialog component for heading section padding block start (Modal-header compact 14156:25916: Space/3xl 16px.)
- `--ki-dialog-heading-padding-inline`: dimension used by the dialog component for heading section padding inline (Modal-header compact: Space/5xl 20px.)
- `--ki-dialog-max-width`: dimension used by the dialog component for max width (surface size scale; the former ki.space.26xl reference misused the spacing scale).
- `--ki-dialog-min-width`: dimension used by the dialog component for min width (surface size scale; the former ki.space.25xl reference misused the spacing scale).
- `--ki-dialog-motion-duration`: duration used by the dialog component for the enter transition (MarsUI moderate step 240ms; retires the migrated 0ms token that disabled the @starting-style fade).
- `--ki-dialog-motion-easing`: easing used by the dialog component for the enter transition (MarsUI decelerate curve; retires the migrated linear pair).
- `--ki-dialog-padding`: dimension used by the dialog component for the room it keeps from the viewport edges when its width or height is clamped. Each section pads itself (heading, body and footer padding tokens).
- `--ki-dialog-radius`: dimension used by the dialog component for radius (MarsUI compact Modal master 16414:19665: Radius/big_component/radius_sm 20px; the large variant anchors 24px big_component/radius_md).
- `--ki-dialog-shadow`: Dialog elevation: MarsUI elevation ramp level e4 (brief §5, high modal surface; replaces the migrated approximation). material3 keeps its own e3 override (M3 dialog = level3).
- `--ki-elevation-none`: Flat surfaces carry no resting shadow.
- `--ki-focus-primary`: MarsUI Focus/primary: 3px spread focus ring of Outline/primary_base_em_alpha, read from the Figma master as #845abe33 = brand 500 at 20% (Kimen name: outline.primary-base-em-alpha / brand.500-alpha-2). The previous 40% (outline.primary-low-em-alpha / brand.500-alpha-4) came from specs/002-ki-button/design-extraction.md §2.5, which read the alpha off the Dark canvas mode and recorded it as the Light value; the ring shipped 2x too strong in light and 2.8x in dark across twelve components.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-motion-distance-md`: Motion travel distance md (8px): entrance slide offsets (e.g. dialog rise).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard-accelerate`: Utility exit curve. M3 md.sys.motion.easing.standard-accelerate. onmars: the MarsUI accelerate curve (ki.easing.in).
- `--ki-spacing-action-hairline`: Width of the frame and divider in an action surface.
- `--ki-state-layer-hover`: Hover interaction state layer. M3 md.sys.state.hover.state-layer-opacity: 8% of the on-color. onmars: the hover overlay (White/5 light, Black/5 dark).
- `--ki-state-layer-pressed`: Pressed interaction state layer. M3 md.sys.state.pressed.state-layer-opacity: 12% of the on-color (same as focus). onmars: one step above the hover overlay (White/8 light, Black/8 dark).
- `--ki-surface-transparent`: Transparent surface backing for a background image that carries its own opacity.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-family-heading`: Shared font family for component headings. Reassign it on a theme root to style headings independently of body copy.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
