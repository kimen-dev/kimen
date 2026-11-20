# Anchored overlay

Use one `AnchoredOverlay` instance per floating surface and pass the surface
and trigger elements to `show(popup, trigger, options)`. The component owns
its open state, ARIA, keyboard commands, and initial focus.

- For a component that owns dismissal, render the surface with
  `popover="manual"`. For native light dismissal, render it with
  `popover="auto"`, pass the native invoker as `source`, and synchronize
  component state on `toggle`. Omit the manual dismissal options on this
  path. A native close stops placement updates until the next open.

- Menu and Popover can resolve `anchor` or `for` using
  `resolveOverlayAnchor(this.host, id)`. The ID is looked up in the host's
  document or containing shadow root. Combobox and DatePicker can pass refs to
  the input or calendar button directly.
- Use `position: anchoredOverlayPosition({ placement: 'bottom-start', offset })`
  from `anchored-overlay-layout` for managed positioning.
  Give the popup `position: fixed`, `inset: auto`, `margin: 0` and a stable
  width. Use a resolved token length in CSS pixels for `offset`.
- `bottom-start`, `bottom-end`, `top-start`, and `top-end` align to the
  trigger's logical inline edges. `top`, `bottom`, `start`, and `end` center
  the surface along the facing edge. A side can also take `-start` or `-end`
  for block-start or block-end alignment. A flip keeps the alignment and
  picks the opposite side when the preferred side lacks room and the other
  has more. The utility then clamps the box to the layout viewport. Give tall
  or wide surfaces token-backed maximum sizes and scrolling as needed.
- Where the trigger's CSS `anchor-name` is visible to the popup, pass that
  name as `anchorName` to `anchoredOverlayPosition`. Keep names unambiguous in the relevant CSS
  scope. The utility applies CSS anchor offsets against the measured anchor
  box and uses fixed coordinates if the name cannot be resolved, including
  across scopes where CSS cannot see the anchor.
  An auto popover can pass its invoker as `source` to use the implicit CSS
  anchor with the same measured fallback.
- Managed positioning updates on viewport resize, ancestor scroll, trigger or
  popup resize, and connected reparenting. Call `reposition()` after other
  layout changes. Call `hide()` on close and from `disconnectedCallback`.
  The utility also closes and reports `disconnect` if it detects that a
  managed trigger or popup has left the document.
- Enable `outsidePointer: true` and `escape: 'bubble'` as the contract needs.
  An element passed as `outsidePointer` adds an inside boundary, such as a
  host containing the trigger label. Handle `onDismiss` by updating the
  component's state and calling `hide()`. Use `hide(true)` on Escape to focus
  the trigger, or `hide(field)` to return focus to a separate field. Use plain
  `hide()` for outside pointer dismissal or Tab. A combobox can handle Escape
  at the input to distinguish closing the list from clearing its text. Handle
  Escape in the component when the pattern has nested overlays. For pointer
  paths retargeted by a closed shadow root, pass its exposed host as the
  inside boundary.

The Playwright Chromium, Firefox, and WebKit builds used for #430 support
manual popovers, `anchor()`, `anchor-size()`, and `position-try-fallbacks`.
Firefox can resolve a named CSS anchor without an ancestor's transform. The
utility measures the CSS-resolved box and the visual box to account for that
difference.

Select keeps its authored CSS placement, width, and room-based height. It uses
`setOverlayOpen` and `isOutsideOverlay` directly so its entry point
only bundles the base functions it needs. Tooltip uses the shared placement calculation and CSS
anchor probe, then applies the cross-axis shift and transformed-anchor
correction through its existing styles. It keeps the current positioning
timing and capture-phase Escape.
