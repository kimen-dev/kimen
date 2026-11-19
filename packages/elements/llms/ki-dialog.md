# ki-dialog

> A modal dialog for one interrupting decision or short focused task.

## When to use

destructive confirmations, blocking choices, and brief
critical input that must be resolved before returning to the page. Always
provide a `heading`, place actions in the `footer` slot, wire each footer
action to `close()`, and in destructive confirmations put `autofocus` on
the least destructive action.

## When not to use

non-blocking feedback (`ki-alert`, future `ki-toast`),
supplementary hints (`ki-tooltip`), long forms or multi-step flows
(navigate or use a future full-screen variant), menus, or pickers.

## Examples

A modal confirmation; `heading` names the dialog for assistive technology and actions go in the `footer` slot:

```html
<ki-dialog heading="Delete draft?" id="confirm-dialog">
  <p>This permanently removes the draft.</p>
  <ki-button slot="footer" type="button">Cancel</ki-button>
  <ki-button slot="footer" tone="danger" variant="primary">Delete</ki-button>
</ki-dialog>
```

Open it with the `show()` method (and close with `close()`); the `ki-close` event reports why it closed in `detail.reason` (`method`, `escape`, or `backdrop`):

```html
<ki-button type="button" onclick="document.getElementById('confirm-dialog').show()">
  Delete draft
</ki-button>
```

## Attributes

- `close-on-backdrop` (boolean, default false): Opts into backdrop light-dismiss. Omit this attribute for critical confirmations; `close-on-backdrop="false"` still enables it. When to use: low-risk dialogs where an outside click may safely dismiss. When NOT to use: destructive confirmations or decisions that should not be lost to a stray click; omit the attribute entirely rather than setting it to `"false"`.
- `heading` (string, required): Visible dialog title and accessible-name source. Always provide a heading; an empty value intentionally leaves the native dialog unnamed. When to use: name the interrupting decision, for example "Delete account?". When NOT to use: do not omit it for production dialogs; APG modal dialogs require an accessible name.
- `open` (boolean, default false): Reflected live modal state. Add it or call `show()` to open; remove it or call `close()` to close. When open, the native dialog enters the top layer and the page behind is inert. When to use: bind application state to the dialog's modal lifecycle. When NOT to use: do not set the internal native `<dialog open>` attribute; the host attribute is the only public source of truth.

## Slots

- (default): Dialog body content.
- `footer`: Dialog actions; applications wire every action to `close()`.

## Parts

- `body`: Scrollable body region.
- `dialog`: Internal native dialog surface.
- `footer`: Action row, collapsed when empty.
- `heading`: Visible h2 title, rendered only when `heading` is non-empty.

## Events

- `ki-close` (CustomEvent<KiDialogCloseDetail>): Post-close notification for every close path. Footer actions report `method` when they call `close()`, Escape reports `escape`, and opt-in backdrop dismissal reports `backdrop`. When to use: update application state after the dialog is already closed and focus has returned through the native mechanism. When NOT to use: do not expect this event to veto closing; it is not cancelable in v1.

## Methods

- `close()` (Promise<void>): Closes the dialog and reports `method`. No-op when already closed. Equivalent to removing the host `open` attribute. Footer actions never close automatically; wire them to this method. When to use: resolve footer actions, programmatic dismissals, and application-controlled cancellation. When NOT to use: do not use for Escape or backdrop bookkeeping; those paths set their own close reasons.
- `show()` (Promise<void>): Opens the dialog modally. No-op when already open. Equivalent to adding the host `open` attribute. When to use: call from the invoker that should receive focus again after close. When NOT to use: do not call repeatedly to refresh content; update slotted content directly while open.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-dialog-backdrop-bg`: color used by the dialog component for backdrop background.
- `--ki-dialog-backdrop-blur`: backdrop blur used by the dialog component glass surface (MarsUI BACKGROUND_BLUR Blur/24 = CSS 12px; material3 resolves to blur none via the semantic override; perf-measure before enabling per DNA section 5).
- `--ki-dialog-bg`: color used by the dialog component for background (flat fallback of the MarsUI glass gradient: Surface/Special/light-s0_dark-s2; components paint the gradient from ki.dialog.bg-start to ki.dialog.bg-end).
- `--ki-dialog-bg-end`: color used by the dialog component for the glass gradient end (MarsUI Surface/Special/light-s0_dark-s2: white light / Dark/800 dark).
- `--ki-dialog-bg-start`: color used by the dialog component for the glass gradient start (MarsUI Surface/Special/blur_base_light White/80; dark resolves rgba(36,36,36,0.8)). Paint background: linear-gradient(180deg, var(--ki-dialog-bg-start), var(--ki-dialog-bg-end)).
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
- `--ki-focus-primary`: MarsUI Focus/primary: 3px spread focus ring of Outline/primary_base_em_alpha, read from the Figma master as #845abe33 = brand 500 at 20% (Kimen name: outline.primary-base-em-alpha / brand.500-alpha-2). The previous 40% (outline.primary-low-em-alpha / brand.500-alpha-4) came from specs/002-ki-button/design-extraction.md §2.5, which read the alpha off the Dark canvas mode and recorded it as the Light value; the ring shipped 2x too strong in light and 2.8x in dark across twelve components.
- `--ki-motion-distance-md`: Motion travel distance md (8px): entrance slide offsets (e.g. dialog rise).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard-accelerate`: Utility exit curve. M3 md.sys.motion.easing.standard-accelerate. onmars: the MarsUI accelerate curve (ki.easing.in).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
