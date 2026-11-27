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

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-dialog`: the default, only the tokens ki-dialog needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

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

- `ki-close` (CustomEvent<KiDialogCloseDetail>): Call `preventDefault()` to veto fullscreen Escape or the header close button, which report `escape` and `method` respectively. On every other path (centered Escape, backdrop, invoker commands, `close()` or clearing `open`) the event reports after close and focus restoration. A veto has no effect there, and the event can fire without a gesture.
- `ki-confirm` (CustomEvent<void>): The user activated the confirmation button. Handle validation, submission and dismissal in the application.

## Methods

- `close()` (Promise<void>): Closes the dialog and reports `method`. No-op when already closed. Equivalent to removing the host `open` attribute. Footer actions never close automatically; wire them to this method or an invoker command. When to use: resolve footer actions, programmatic dismissals, and application-controlled cancellation. When NOT to use: do not use for Escape or backdrop bookkeeping; those paths set their own close reasons.
- `show()` (Promise<void>): Opens the dialog modally. No-op when already open. Equivalent to adding the host `open` attribute. When to use: call from the invoker that should receive focus again after close. When NOT to use: do not call repeatedly to refresh content; update slotted content directly while open.

## CSS custom properties

- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500). Default: `var(--ki-surface-primary-med-em)`.
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-control-radius-item`: Corner radius of an individual control inside a track. Default: `var(--ki-radius-component-sm)`.
- `--ki-control-size-md`: Medium control track height, 40 CSS px at the default root size. Default: `var(--ki-space-12xl)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-dialog-backdrop-bg`: color used by the dialog component for backdrop background. Default: `var(--ki-overlay-high-em)`.
- `--ki-dialog-backdrop-filter`: Complete backdrop filter behind the dialog surface. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-dialog-bg`: Base background color of the dialog. Onmars v1 used a transparent backing beneath its translucent image. Default: onmars `var(--ki-surface-special-light-s0-dark-s2)`, material3 `var(--ki-surface-s3)`.
- `--ki-dialog-bg-image`: Optional CSS background image layered over the dialog fill. Use none for a solid fill. Default: `var(--ki-surface-image-dialog)`.
- `--ki-dialog-body-padding-block-end`: dimension used by the dialog component for body section padding block end (Modal compact Body: Space/5xl 20px.) Default: onmars `var(--ki-space-5xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-dialog-body-padding-block-start`: dimension used by the dialog component for body section padding block start (Modal compact Body 16414:19668: Space/5xl 20px.) Default: `var(--ki-space-5xl)`.
- `--ki-dialog-body-padding-inline`: dimension used by the dialog component for body section padding inline (Modal compact Body: Space/5xl 20px.) Default: onmars `var(--ki-space-5xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-dialog-border`: border used by the dialog component for border (MarsUI 1px solid Outline/base_em Black/3 light / White/3 dark; retires the migrated Black/5 foundation reference). Default: onmars `var(--ki-border-hairline-base-em)`, material3 `none`.
- `--ki-dialog-divider-color`: color used by the dialog component for the dividers under the heading and above the footer (Outline/base-em). Default: `var(--ki-outline-base-em)`.
- `--ki-dialog-divider-width`: dimension used by the dialog component for the dividers under the heading and above the footer (Modal-header and Modal-actions 1px strokes). Zero removes them. Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-zero)`.
- `--ki-dialog-fg`: color used by the dialog component for foreground. Default: `var(--ki-text-high-em)`.
- `--ki-dialog-focus-ring-color`: color used by the dialog component for focus ring color. Default: `var(--ki-focus-ring-color)`.
- `--ki-dialog-focus-ring-offset`: dimension used by the dialog component for focus ring offset. Default: `var(--ki-focus-ring-offset)`.
- `--ki-dialog-focus-ring-width`: dimension used by the dialog component for focus ring width. Default: `var(--ki-focus-ring-width)`.
- `--ki-dialog-footer-padding-block-end`: dimension used by the dialog component for footer section padding block end (Modal-actions/CTAs: Space/7xl 24px.) Default: `var(--ki-space-7xl)`.
- `--ki-dialog-footer-padding-block-start`: dimension used by the dialog component for footer section padding block start (Modal-actions/CTAs 14158:28302: Space/7xl 24px, below the divider.) Default: onmars `var(--ki-space-7xl)`, material3 `var(--ki-space-zero)`.
- `--ki-dialog-footer-padding-inline`: dimension used by the dialog component for footer section padding inline (Modal-actions/CTAs: Space/5xl 20px.) Default: onmars `var(--ki-space-5xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-dialog-fullscreen-backdrop-filter`: Complete backdrop filter for the fullscreen surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-dialog-fullscreen-bg`: Solid raised surface for the fullscreen dialog. Default: `var(--ki-surface-s1)`.
- `--ki-dialog-fullscreen-bg-image`: Optional image over the fullscreen fill. Default: `var(--ki-surface-image-none)`.
- `--ki-dialog-fullscreen-fg`: Foreground for the fullscreen dialog. Default: `var(--ki-text-high-em)`.
- `--ki-dialog-fullscreen-header-border`: Divider beneath the fullscreen header. Default: `var(--ki-outline-low-em)`.
- `--ki-dialog-fullscreen-header-height`: Minimum block size of the fullscreen header. Default: `var(--ki-layout-spacing-16xl)`.
- `--ki-dialog-gap`: dimension used by the dialog component for the gap between its footer actions (Modal-actions/CTAs 14158:28302: Space/xl 12px). Default: onmars `var(--ki-space-xl)`, material3 `var(--ki-space-5xl)`.
- `--ki-dialog-heading-font-family`: Font family for the dialog heading. Override it to give dialogs their own heading typeface. Default: onmars `var(--ki-typography-family-display)`, material3 `var(--ki-typography-family-heading)`.
- `--ki-dialog-heading-font-size`: dimension used by the dialog component for heading font size. Default: `var(--ki-typography-size-title-2)`.
- `--ki-dialog-heading-font-weight`: font weight used by the dialog component for heading font weight. Default: onmars `var(--ki-typography-weight-display-semibold)`, material3 `var(--ki-typography-weight-body-normal)`.
- `--ki-dialog-heading-letter-spacing`: Letter spacing for the dialog heading. Override it to tune tracking for the chosen heading typeface. Default: `var(--ki-typography-letter-spacing-none)`.
- `--ki-dialog-heading-line-height`: dimension used by the dialog component for heading line height. Default: `var(--ki-typography-line-height-title-2)`.
- `--ki-dialog-heading-padding-block-end`: dimension used by the dialog component for heading section padding block end (Modal-header compact: Space/3xl 16px, above the divider.) Default: onmars `var(--ki-space-3xl)`, material3 `var(--ki-space-zero)`.
- `--ki-dialog-heading-padding-block-start`: dimension used by the dialog component for heading section padding block start (Modal-header compact 14156:25916: Space/3xl 16px.) Default: onmars `var(--ki-space-3xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-dialog-heading-padding-inline`: dimension used by the dialog component for heading section padding inline (Modal-header compact: Space/5xl 20px.) Default: onmars `var(--ki-space-5xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-dialog-max-width`: dimension used by the dialog component for max width (surface size scale; the former ki.space.26xl reference misused the spacing scale). Default: `var(--ki-size-surface-md)`.
- `--ki-dialog-min-width`: dimension used by the dialog component for min width (surface size scale; the former ki.space.25xl reference misused the spacing scale). Default: `var(--ki-size-surface-sm)`.
- `--ki-dialog-motion-duration`: duration used by the dialog component for the enter transition (MarsUI moderate step 240ms; retires the migrated 0ms token that disabled the @starting-style fade). Default: onmars `var(--ki-motion-duration-medium-1)`, material3 `var(--ki-motion-duration-medium-2)`.
- `--ki-dialog-motion-easing`: easing used by the dialog component for the enter transition (MarsUI decelerate curve; retires the migrated linear pair). Default: onmars `var(--ki-motion-easing-out)`, material3 `var(--ki-motion-easing-emphasized-decelerate)`.
- `--ki-dialog-padding`: dimension used by the dialog component for the room it keeps from the viewport edges when its width or height is clamped. Each section pads itself (heading, body and footer padding tokens). Default: `var(--ki-space-7xl)`.
- `--ki-dialog-radius`: dimension used by the dialog component for radius (MarsUI compact Modal master 16414:19665: Radius/big_component/radius_sm 20px; the large variant anchors 24px big_component/radius_md). Default: onmars `var(--ki-radius-component-3xl)`, material3 `var(--ki-radius-big-component-lg)`.
- `--ki-dialog-shadow`: Dialog elevation: MarsUI elevation ramp level e4 (brief §5, high modal surface; replaces the migrated approximation). material3 keeps its own e3 override (M3 dialog = level3). Default: onmars `var(--ki-elevation-e4)`, material3 `var(--ki-elevation-e3)`.
- `--ki-elevation-none`: Flat surfaces carry no resting shadow. Default: `0 0 #0000`.
- `--ki-focus-primary`: MarsUI Focus/primary: 3px spread focus ring of Outline/primary_base_em_alpha, read from the Figma master as #845abe33 = brand 500 at 20% (Kimen name: outline.primary-base-em-alpha / brand.500-alpha-2). The previous 40% (outline.primary-low-em-alpha / brand.500-alpha-4) came from specs/002-ki-button/design-extraction.md §2.5, which read the alpha off the Dark canvas mode and recorded it as the Light value; the ring shipped 2x too strong in light and 2.8x in dark across twelve components. Default: `0 0 0 var(--ki-shadow-ring) var(--ki-outline-primary-base-em-alpha)`.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap. Default: `var(--ki-space-md)`.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap. Default: `var(--ki-space-xs)`.
- `--ki-motion-distance-md`: Motion travel distance md (8px): entrance slide offsets (e.g. dialog rise). Default: `var(--ki-space-md)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard-accelerate`: Utility exit curve. M3 md.sys.motion.easing.standard-accelerate. onmars: the MarsUI accelerate curve (ki.easing.in). Default: onmars `var(--ki-easing-in)`, material3 `cubic-bezier(0.3,0,1,1)`.
- `--ki-spacing-action-hairline`: Width of the frame and divider in an action surface. Default: `var(--ki-size-border-hairline)`.
- `--ki-state-layer-hover`: Hover interaction state layer. M3 md.sys.state.hover.state-layer-opacity: 8% of the on-color. onmars: the hover overlay (White/5 light, Black/5 dark). Default: onmars `var(--ki-surface-hover-overlay)`, material3 `light-dark(rgba(29,27,32,0.08),rgba(230,224,233,0.08))`.
- `--ki-state-layer-pressed`: Pressed interaction state layer. M3 md.sys.state.pressed.state-layer-opacity: 12% of the on-color (same as focus). onmars: one step above the hover overlay (White/8 light, Black/8 dark). Default: onmars `light-dark(var(--ki-color-white-8),var(--ki-color-black-8))`, material3 `light-dark(rgba(29,27,32,0.12),rgba(230,224,233,0.12))`.
- `--ki-surface-transparent`: Transparent surface backing for a background image that carries its own opacity. Default: `var(--ki-color-transparent-black)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-family-heading`: Shared font family for component headings. Reassign it on a theme root to style headings independently of body copy. Default: `var(--ki-typography-family-body)`.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para. Default: `var(--ki-font-line-height-para)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal. Default: `var(--ki-font-weight-body-normal)`.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold. Default: `var(--ki-font-weight-body-semibold)`.
