# ki-video

> A themed video surface: a calm poster facade with exactly one accessible play control over a slotted native `<video>` element. From the first activation on, playback, scrubbing, volume, captions and fullscreen belong to the native player — Kimen ships no custom chrome.

## When to use

playable content the person deliberately chooses to watch —
product tours, talks, tutorials, announcements — presented as a poster
with one play control. Slot exactly one native `<video>` carrying its own
`poster`, sources and `<track>` captions, omit `controls` (the component
enables the native chrome the moment the facade yields, FR-002), and give
the control a `label` (required: the accessible name of the play button).

## When not to use

decorative background or ambient loops (plain CSS and
`<video>` are the tool), audio-only recordings (use ki-audio),
embeds from streaming platforms that ship their own player chrome (use
their embed), or static imagery (use an image, not a video). `autoplay`
on the slotted media is unsupported: the facade's contract is that
playback begins only by explicit user activation — never on scroll,
hover or visibility — so preexisting `autoplay` and `controls` on the
slotted media are cleared when it arrives, and any playback already
running is paused (FR-003; the native chrome returns at activation).

## Examples

Slot exactly one native `<video>` carrying its own poster, sources and `<track>` captions; `label` names the play control (required — never rendered visually) and the native chrome returns the moment the facade yields:

```html
<ki-video label="Play the product tour">
  <video muted playsinline width="1280" height="720" poster="tour.jpg">
    <source src="tour.webm" type="video/webm" />
    <track kind="captions" srclang="en" label="English" src="tour.en.vtt" />
  </video>
</ki-video>
```

Everything on the media element passes through untouched — offer format fallbacks through multiple `<source>` children, and the native media events (`play`, `pause`, `ended`) keep firing on the element you own; ki-video emits no events of its own:

```html
<ki-video label="Play the setup walkthrough">
  <video width="1280" height="720" poster="walkthrough.jpg">
    <source src="walkthrough.webm" type="video/webm" />
    <source src="walkthrough.mp4" type="video/mp4" />
    <track kind="captions" srclang="en" label="English" src="walkthrough.en.vtt" />
  </video>
</ki-video>
```

The frame fills its container's inline size and the media keeps the intrinsic aspect ratio declared by `width`/`height` (16:9 is a demonstration, not a constraint); `autoplay` and `controls` on arriving media are cleared — playback begins only from the play control:

```html
<ki-video label="Play the workshop recording">
  <video width="800" height="600" poster="workshop.jpg">
    <source src="workshop.mp4" type="video/mp4" />
    <track kind="captions" srclang="en" label="English" src="workshop.en.vtt" />
  </video>
</ki-video>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-video`: the default, only the tokens ki-video needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `label` (string, required): Accessible name of the play control ("Play the product tour"). The control is a real button exposing role button with exactly this name; the frame contributes no role, name or state of its own (FR-004, FR-005). Documented as required: no default human-language string is baked in, and an unlabeled control renders but fails the accessibility audit (015-ki-progress precedent). The label is never rendered visually.

## Slots

- (default): Exactly one native `<video>` element carrying its own poster, sources and `<track>` captions.

## Parts

- `frame`: The media frame: radius, clipping, the themed surface.
- `play`: The play control: overlay scrim, glass container and glyph.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-effect-component-primary-default-shadow`: MarsUI Component_effect/primary_default: drop 0/1/1/-0.5 plus inner White/12 0/3/3. Pair with --ki-effect-component-backdrop-filter — CSS cannot mix backdrop blur into box-shadow. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-effect-component-primary-hover-shadow`: MarsUI Component_effect/primary_hover: drops 0/20/20/-12 + 0/3/3/-1.5 + 0/1/1/-0.5 plus inner White/18 0/3/3. Pair with --ki-effect-component-backdrop-filter. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 2px 6px 2px rgba(0,0,0,0.15)`.
- `--ki-effect-video-hover-opacity`: Opacity of the added play-container shadow on hover. onmars shows the full primary hover effect over the resting shadow. Default: onmars `var(--ki-scale-unit)`, material3 `0`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base). Default: onmars `var(--ki-duration-moderate)`, material3 `250ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard-accelerate`: Utility exit curve. M3 md.sys.motion.easing.standard-accelerate. onmars: the MarsUI accelerate curve (ki.easing.in). Default: onmars `var(--ki-easing-in)`, material3 `cubic-bezier(0.3,0,1,1)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-video-backdrop-filter`: Complete backdrop filter behind the video play scrim and control. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-video-focus-ring-color`: color used by the video component for the play control focus ring: the keyboard-reachable facade control (FR-004, S6) adopts the ki-dialog/ki-icon-button focus-ring pair verbatim. Default: `var(--ki-focus-ring-color)`.
- `--ki-video-focus-ring-offset`: dimension used by the video component for the play control focus ring offset (ki-dialog precedent). Default: `var(--ki-focus-ring-offset)`.
- `--ki-video-focus-ring-width`: dimension used by the video component for the play control focus ring width (ki-dialog precedent). Default: `var(--ki-focus-ring-width)`.
- `--ki-video-frame-radius`: dimension used by the video component for the frame corners: Radius/big_component/radius_xs, the exact variable bound to the Size=md Video frame (node 12089:6570, specs/025-ki-video/design-extraction.md) — the sm frame's radius_md is the scale demo, not a second API value. Default: onmars `var(--ki-radius-big-component-xs)`, material3 `var(--ki-radius-component-lg)`.
- `--ki-video-motion-duration`: duration used by the video component for the facade dismissal fade: the Figma set documents no motion, so onmars resolves the single transition to the fast semantic duration (FR-013; disabled under reduced motion by construction, 024 precedent). Default: `var(--ki-motion-duration-fast)`.
- `--ki-video-play-bg`: color used by the video component for the play container surface: Surface/inverse_white, the exact variable bound to the Icon_button fill (black over light, white over dark) — the control carries its own surface so glyph contrast never depends on the poster imagery (FR-008). Default: onmars `var(--ki-surface-inverse-white)`, material3 `var(--ki-surface-primary-med-em)`.
- `--ki-video-play-border-color`: color used by the video component for the play container edge: Outline/primary_button_top, the exact variable bound to the Icon_button stroke (as ki-button; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-video-play-border-width`: dimension used by the video component for the play container edge width (MarsUI hairline stroke, ki-icon-button precedent). Default: `var(--ki-size-border-hairline)`.
- `--ki-video-play-fg`: color used by the video component for the play glyph: Text/inverse_black, the counterpart of the inverse container surface (white over light, black over dark) — the glyph inherits it via currentColor; the -bg/-fg pair is swept by the contrast gate (FR-008). Default: onmars `var(--ki-text-inverse-black)`, material3 `var(--ki-text-primary-on-primary)`.
- `--ki-video-play-icon-size`: dimension used by the video component for the play glyph: the 28px Icon/Placeholder_xl slot measured inside the Size=md play container (the ki-icon-button xl icon size). Default: `var(--ki-space-9xl)`.
- `--ki-video-play-radius`: dimension used by the video component for the play container shape: Radius/component/radius_xl, the exact variable bound to the Size=md Icon_button instance (14px, the ki-icon-button xl radius). Default: onmars `var(--ki-radius-component-xl)`, material3 `var(--ki-radius-round)`.
- `--ki-video-play-shadow`: shadow used by the video component for the play control (MarsUI stacks Elevation/e6 on the button_wrap beneath the Component_effect/primary_default inner White/12 highlight — the measured master stack). Default: onmars `0 var(--ki-shadow-distance-1) var(--ki-shadow-distance-1) var(--ki-shadow-spread-1) var(--ki-elevation-shadow),0 var(--ki-shadow-distance-2) var(--ki-shadow-distance-2) var(--ki-shadow-spread-2) var(--ki-elevation-shadow),0 var(--ki-shadow-distance-3) var(--ki-shadow-distance-3) var(--ki-shadow-spread-3) var(--ki-elevation-shadow),0 var(--ki-shadow-distance-4) var(--ki-shadow-distance-4) var(--ki-shadow-spread-4) var(--ki-elevation-shadow),0 var(--ki-shadow-distance-5) var(--ki-shadow-distance-5) var(--ki-shadow-spread-5) var(--ki-elevation-shadow),0 var(--ki-shadow-distance-6) var(--ki-shadow-distance-6) var(--ki-shadow-spread-6) var(--ki-elevation-shadow),var(--ki-shadow-inner-primary-default)`, material3 `0 0 #0000`.
- `--ki-video-play-size`: dimension used by the video component for the play container box: the 56px Icon_button instance of the Size=md Video (the ki-icon-button xl box; the sm variant's 40px box is the scale demo). Default: `var(--ki-space-16xl)`.
- `--ki-video-scrim-color`: color used by the video component for the overlay scrim behind the play control: Inverse_white/alpha_6, the exact variable bound to the Play halo on both Video variants (Black/5 light, White/5 dark) — the scheme flip rides the semantic layer. Default: onmars `var(--ki-inverse-white-alpha-6)`, material3 `var(--ki-transparent-inverse)`.
- `--ki-video-scrim-padding`: dimension used by the video component for the scrim clearance around the play container: Space/3xl, the exact variable bound as the Size=md Play halo padding (16px on every side). Default: onmars `var(--ki-space-3xl)`, material3 `var(--ki-space-zero)`.
- `--ki-video-scrim-radius`: dimension used by the video component for the overlay scrim shape: Radius/component/radius_6xl, the exact variable bound to the Size=md Play halo (28px pill-cornered square). Default: `var(--ki-radius-component-6xl)`.
