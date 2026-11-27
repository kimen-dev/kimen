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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-carousel`: the default, only the tokens ki-carousel needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `autoplay` (number | undefined, minimum 1, maximum 2147483647): Rotation interval in milliseconds. Omitting it leaves rotation off. Values below 5000 rotate every 5000 ms.
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

- `ki-slide-change` (CustomEvent<CarouselSlideChangeDetail>): Reports the one-based index when the leading slide changes, also on autoplay or a new `current`: it can fire without a gesture.

## Methods

- `goTo(index)` (Promise<void>): Moves to the requested one-based leading position within the available range.
- `next()` (Promise<void>): Advances by slidesPerMove.
- `previous()` (Promise<void>): Moves back by slidesPerMove.

## CSS custom properties

- `--ki-carousel-control-backdrop-filter`: Complete optional backdrop filter for the carousel controls. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-carousel-control-bg`: Surface of the carousel navigation and rotation controls. Default: `var(--ki-surface-s1)`.
- `--ki-carousel-control-bg-image`: Optional image layered over the carousel control background color. Default: `var(--ki-surface-image-none)`.
- `--ki-carousel-control-border`: Visible control boundary against the surrounding surface. Default: `var(--ki-outline-control)`.
- `--ki-carousel-control-fg`: Text and glyph ink against the carousel control surface. Default: `var(--ki-text-high-em)`.
- `--ki-carousel-control-gap`: Spacing between carousel controls. Default: `var(--ki-space-xs)`.
- `--ki-carousel-control-icon-size`: Glyph size in the carousel navigation controls. Default: `var(--ki-space-5xl)`.
- `--ki-carousel-control-radius`: Corner radius of the carousel controls. Default: `var(--ki-radius-round)`.
- `--ki-carousel-control-shadow`: Resting elevation of the carousel controls. Default: `var(--ki-elevation-e2)`.
- `--ki-carousel-control-size`: Resting carousel control size before applying the density target floor. Default: `var(--ki-control-size-sm)`.
- `--ki-carousel-full-screen-block-size`: Block size of the vertical carousel viewport. Default: `var(--ki-size-surface-xs)`.
- `--ki-carousel-gap`: Gap between carousel slides and between the viewport and the controls. Default: `var(--ki-space-xl)`.
- `--ki-carousel-preview-min-inline-size`: Minimum inline size of a decorative carousel preview when space permits. Default: `var(--ki-control-size-sm)`.
- `--ki-carousel-radius`: Corner radius shared by the carousel viewport and slide surfaces. Default: `var(--ki-radius-big-component-xs)`.
- `--ki-control-border-width`: Stroke width of the boundary of a compact control. Default: `var(--ki-size-border-hairline)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
