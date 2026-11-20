# ki-carousel

> An ordered, swipeable sequence with previous and next controls and position feedback.

## When to use

show a short set of related highlights, onboarding steps or media panels.
Give the carousel a meaningful label and supply one ki-carousel-item per slide.

## When not to use

hide essential content behind rotation, replace ordinary page navigation,
or present slides that readers need to compare side by side at the same time.

## Examples

# Carousel examples

```html
<ki-carousel label="Product tour" slides-per-view="2" slides-per-move="2">
  <ki-carousel-item>Discover the tools</ki-carousel-item>
  <ki-carousel-item>Pick a theme</ki-carousel-item>
  <ki-carousel-item>Set up your workspace</ki-carousel-item>
  <ki-carousel-item>Share your first surface</ki-carousel-item>
</ki-carousel>
```

```js
const carousel = document.querySelector('ki-carousel');
carousel.addEventListener('ki-slide-change', ({ detail }) => {
  console.log(detail.index);
});
await carousel.goTo(3);
```

With per-tag imports, define both `ki-carousel` and `ki-carousel-item`.

## Attributes

- `autoplay` (number | undefined, minimum 1, maximum 2147483647): Rotation interval in milliseconds. Omitting it leaves rotation off.
- `carousel-role-description` (string, default 'carousel'): Accessible role description of the region.
- `current` (number, default 1, minimum 1): One-based leading slide. Setting it moves the carousel and clamps the index to the available leading positions.
- `label` (string, required): Required accessible name of the carousel region.
- `layout` ("full-screen" | "hero" | "multi-browse" | "single" | "uncontained", default 'single'): Item arrangement. Full-screen uses a vertical, full-viewport slide.
- `loop` (boolean, default false): Whether navigating past one endpoint wraps to the other.
- `navigation` (boolean, default true): Whether to show the Previous and Next buttons. The viewport stays keyboard-operable.
- `next-label` (string, default 'Next slide'): Accessible label of the Next button.
- `pagination` (boolean, default true): Whether to show the noninteractive slide position indicator.
- `pause-label` (string, default 'Pause'): Visible and accessible label of the Pause button.
- `play-label` (string, default 'Play'): Visible and accessible label of the Play button.
- `position-label` (string, default 'Slide position'): Accessible label of the position indicator.
- `previous-label` (string, default 'Previous slide'): Accessible label of the Previous button.
- `slide-label` (string, default '{index} of {count}'): Spoken slide name and announcement. Use {index} and {count} as placeholders.
- `slide-role-description` (string, default 'slide'): Accessible role description of each slide group.
- `slides-per-move` (number, default 1, minimum 1): Number of positions advanced by Previous, Next and automatic rotation.
- `slides-per-view` (number, default 1, minimum 1): Number of slides visible together in the single layout. Material 3 layouts determine their own item widths.

## Slots

- (default): Direct ki-carousel-item children in reading order.

## Parts

- `announcement`: Visually hidden live region for manual changes.
- `controls`: Row containing slide position and navigation.
- `next`: Next slide button.
- `position`: Position indicator and optional numeric position.
- `previous`: Previous slide button.
- `rotation`: Play or Pause button when automatic rotation is configured.
- `viewport`: Scroll-snap viewport and its keyboard focus outline.

## Events

- `ki-slide-change` (CustomEvent<CarouselSlideChangeDetail>): Reports the one-based index when the leading slide changes.

## Methods

- `goTo(index)` (Promise<void>): Moves to the requested one-based leading position within the available range.
- `next()` (Promise<void>): Advances by slidesPerMove.
- `previous()` (Promise<void>): Moves back by slidesPerMove.

## CSS custom properties

- `--ki-carousel-control-backdrop-filter`: Complete optional backdrop filter for the carousel controls.
- `--ki-carousel-control-bg`: Surface of the carousel navigation and rotation controls.
- `--ki-carousel-control-bg-image`: Optional image layered over the carousel control background color.
- `--ki-carousel-control-border`: Visible control boundary against the surrounding surface.
- `--ki-carousel-control-fg`: Text and glyph ink against the carousel control surface.
- `--ki-carousel-control-gap`: Spacing between carousel controls.
- `--ki-carousel-control-icon-size`: Glyph size in the carousel navigation controls.
- `--ki-carousel-control-radius`: Corner radius of the carousel controls.
- `--ki-carousel-control-shadow`: Resting elevation of the carousel controls.
- `--ki-carousel-control-size`: Resting carousel control size before applying the density target floor.
- `--ki-carousel-full-screen-block-size`: Block size of the vertical carousel viewport.
- `--ki-carousel-gap`: Gap between carousel slides and between the viewport and the controls.
- `--ki-carousel-preview-min-inline-size`: Minimum inline size of a decorative carousel preview when space permits.
- `--ki-carousel-radius`: Corner radius shared by the carousel viewport and slide surfaces.
- `--ki-control-border-width`: Stroke width of the boundary of a compact control.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-typography-family-body`: semantic font family for typography family body.
