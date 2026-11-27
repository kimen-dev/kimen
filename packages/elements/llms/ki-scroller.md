# ki-scroller

> A bounded scroll container that clips its content along one declared axis and replaces platform scrollbar chrome with a token-resolved indicator.

## When to use

a bounded region inside a view whose content can outgrow it:
chat or message panes, code and log blocks, tag rows, sidebar navigation,
tall menus inside cards. Give it bounds (its size comes entirely from your
layout) and a `label` (required: the accessible name of the scroll
region). Scrolling stays native — wheel, touch, keyboard and indicator
drag operate the viewport directly.

## When not to use

page-level scrolling (the browser's job), carousels or
paginated media (ki-carousel with ki-indicator), virtualized long
collections, multi-column tabular data, or nesting scrollers (v1
guarantees a single scroll axis per region). Cross-axis overflow is an
authoring mistake: the scroller scrolls its declared axis only and clips
the other — wrap or size content on the cross axis.

## Examples

A bounded vertical region; the scroller's size comes entirely from your layout and `label` (required) is the accessible name of the scroll region:

```html
<ki-scroller label="Release notes" style="block-size: 12rem">
  <h3>March</h3>
  <p>Indicator fixes and token updates.</p>
  <h3>February</h3>
  <p>Initial scroller release.</p>
</ki-scroller>
```

`orientation="horizontal"` scrolls the inline axis instead; one axis per instance — the cross axis clips, so wrap or size content on it:

```html
<ki-scroller label="Weekly timeline" orientation="horizontal">
  <div style="display: flex; inline-size: max-content; gap: 1rem">
    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
  </div>
</ki-scroller>
```

Scrolling stays native (wheel, touch, arrows, Page Up/Down, Home/End); the viewport joins the Tab order only while content actually overflows, and slotted content keeps its own semantics:

```html
<ki-scroller label="Chat messages" style="block-size: 16rem">
  <ul>
    <li>Morning! Build is green.</li>
    <li>Shipping the docs today.</li>
  </ul>
</ki-scroller>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-scroller`: the default, only the tokens ki-scroller needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `label` (string, required): Accessible name of the scroll region ("Release notes", "Chat messages"). Assistive technology receives a `region` with this name whose slotted content keeps its own semantics (FR-006). Documented as required: a scroller without a label renders but exposes no accessible name and fails the accessibility audit (015-ki-progress precedent). The label is never rendered visually.
- `orientation` ("horizontal" | "vertical", default 'vertical'): Declared scroll axis, mapping the design source's `Type` axis: `vertical` (default) scrolls the block axis, `horizontal` the inline axis. One axis per instance; the cross axis clips. A structural axis, never appearance — thickness, shape and colors of the indicator are per-theme `--ki-scroller-*` tokens. An unrecognized value matches no style selector and no `horizontal` code path, so the scroller keeps the default vertical behavior (fallback by CSS construction plus a single strict comparison — no validation code, FR-002/FR-009).

## Slots

- (default): The scrollable content: it keeps its own semantics and sizes the scroll extent along the declared axis.

## Parts

- `viewport`: The scroll viewport: surface, focus ring and, as native scrollbar chrome styled from `--ki-scroller-*` tokens, the indicator.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-scroller-focus-ring-color`: color used by the scroller component for the viewport focus ring: the keyboard-focusable scroll region (FR-005) adopts the ki-dialog focus-ring pair verbatim.
- `--ki-scroller-focus-ring-offset`: dimension used by the scroller component for the viewport focus ring offset (ki-dialog precedent).
- `--ki-scroller-focus-ring-shadow`: shadow used by the scroller component for the viewport focus ring glow (MarsUI Focus/primary 3px 20%-alpha halo, the ki-button double mechanism; completes the theming hook ki-scroller.css already consumes).
- `--ki-scroller-focus-ring-width`: dimension used by the scroller component for the viewport focus ring width (ki-dialog precedent).
- `--ki-scroller-gutter`: dimension used by the scroller component for the clearance on each side of the thumb: the 2px padding-inline of the 8px Scroller rail (rail thickness = thumb-thickness + 2×gutter).
- `--ki-scroller-surface`: color used by the scroller component for the viewport surface: transparent in onmars — the scroller shows the consumer's own surface; a theme may resolve a proper surface here (FR-007).
- `--ki-scroller-thumb-color`: color used by the scroller component for the indicator thumb: Inverse_white/alpha_48 (Black/48 light, White/48 dark) — a declared a11y deviation from the MarsUI binding Inverse_white/alpha_6 (Black/5 light, White/5 dark), which reads 1.12:1 and 1.09:1 against the content surface. The thumb is the only mark that shows the scroll position, so it takes the first step of the same ramp that clears WCAG 1.4.11's 3:1. The scheme flip rides the semantic layer (specs/023-ki-scroller/design-extraction.md).
- `--ki-scroller-thumb-min-length`: dimension used by the scroller component for the minimum thumb length along the scroll axis: the 16px min-height on the Figma scroll pill; the actual length stays the native visible-fraction proportion (FR-003).
- `--ki-scroller-thumb-radius`: dimension used by the scroller component for the thumb shape: Radius/radius_round bound in Figma — the pill is a radius token, never an attribute (002 shape precedent).
- `--ki-scroller-thumb-thickness`: dimension used by the scroller component for the thumb cross size: the 4px pill measured inside the 8px MarsUI rail (rail = thumb + 2×gutter, verified 2026-07-17).
- `--ki-scroller-track-color`: color used by the scroller component for the track: the MarsUI pill floats directly on the content surface with no visible track — transparent in onmars; a theme opts into a visible track through this token, never an attribute.
- `--ki-scroller-track-inset`: dimension used by the scroller component for the rail end insets: Space/xs bound as the 4px padding along the scroll axis of both Scroller variants (design-extraction §Decisiones 5).
- `--ki-typography-family-body`: semantic font family for typography family body.
