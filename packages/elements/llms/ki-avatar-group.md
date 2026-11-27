# ki-avatar-group

> A token-styled companion container that stacks `ki-avatar` children as one overlapping row with a configurable visible cap and a static "+N" overflow counter.

## When to use

a compact "who is involved" stack — the members of a shared
document, project card or event row — where space deserves only the first
few identities and an exact "+N" counter accounts for the rest.

## When not to use

as a member picker or expandable overflow (future interactive
grouping — the counter is static text, never a button), for a single
identity (use `ki-avatar` alone), or with children other than `ki-avatar`
(foreign markup is unsupported and not repaired, 016 precedent).

## Examples

`max` caps the visible stack; members beyond the cap are neither rendered nor exposed to assistive technology, and a static "+N" counter accounts exactly for the hidden rest:

```html
<ki-avatar-group max="3">
  <ki-avatar label="Ana García" initials="AG"></ki-avatar>
  <ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
  <ki-avatar label="Iris Toma" initials="IT"></ki-avatar>
  <ki-avatar label="Leo Duarte" initials="LD"></ki-avatar>
  <ki-avatar label="Mia Chen" initials="MC"></ki-avatar>
</ki-avatar-group>
<!-- renders Ana, Sam and Iris, then "+2" -->
```

Without `max` — or with a cap that is not a positive whole number — every member renders and no counter appears (never "+0"):

```html
<ki-avatar-group>
  <ki-avatar label="Ana García" initials="AG"></ki-avatar>
  <ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
</ki-avatar-group>
```

The group's `size` governs every visible member and the counter, overriding member-declared sizes so the stack stays uniform:

```html
<ki-avatar-group size="sm" max="2">
  <ki-avatar label="Ana García" initials="AG" size="xl"></ki-avatar>
  <ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
  <ki-avatar label="Iris Toma" initials="IT"></ki-avatar>
</ki-avatar-group>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-avatar-group`: the default, only the tokens ki-avatar-group needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `max` (number | undefined): Visible cap for the member stack. When the member count exceeds it, the first `max` members render followed by a "+N" counter accounting exactly for the hidden rest. Without it — or when it is not a positive whole number — every member renders and no counter appears; malformed agent-generated markup never breaks the page (FR-009, S14, S15).
- `size` ("lg" | "md" | "sm" | "xl" | "xs" | "xxs", default 'md'): Size step governing the metrics of every visible member and the counter (avatar vocabulary, FR-010). Member-declared sizes are overridden inside a group so the stack stays uniform (S6). An unrecognized value matches no style selector, so the group keeps the default medium metrics (FR-007).

## Slots

- (default): `ki-avatar` members, stacked in source order. Members beyond the visible cap are neither rendered nor exposed to assistive technology.

## Parts

- `counter`: The static "+N" overflow text trailing the stack.
- `group`: The stack row containing the members and the counter.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-avatar-font-family`: font family used by the avatar component for initials: the body family (Instrument Sans in onmars v2). Default: `var(--ki-typography-family-body)`.
- `--ki-avatar-font-weight`: font weight used by the avatar component for initials (MarsUI Typeface/weight/body/medium: 600). Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-avatar-group-counter-bg`: color used by the avatar group component for the +N counter surface: Surface/special/secondary_alpha_base, the exact variable on the secondary-button-styled counter of every capped Avatar_group frame. Default: `var(--ki-surface-special-secondary-alpha-base)`.
- `--ki-avatar-group-counter-border-color`: color used by the avatar group component for the counter border: Outline/secondary_button_top, the exact variable on the counter pill (a hairline in onmars v2). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-avatar-group-counter-border-width`: dimension used by the avatar group component for the counter border (MarsUI 1px hairline on the counter pill). Default: `var(--ki-size-border-hairline)`.
- `--ki-avatar-group-counter-fg`: color used by the avatar group component for the +N counter text: Text/high_em, the exact variable on the counter label. Default: `var(--ki-text-high-em)`.
- `--ki-avatar-group-counter-radius`: dimension used by the avatar group component for the counter shape: Radius/component/radius_* resolves to 1000 in the MarsUI Round mode — the pill is a radius token, never an attribute. Default: `var(--ki-radius-round)`.
- `--ki-avatar-group-counter-shadow`: shadow used by the avatar group component for the counter effects: the exact Component_effect/secondary_default pair (drop 0/2/1.5/-0.5 Elevation/shadow + inner White/3 0/2/3), flat in onmars v2; no backdrop blur (021 decision 3). Default: onmars `var(--ki-effect-component-secondary-default-shadow)`, material3 `0 0 0 0 var(--ki-color-transparent-black)`.
- `--ki-avatar-group-lg-counter-font-size`: dimension used by the avatar group component for the lg counter text (body_2 15px on the 48px frame). Default: `var(--ki-typography-size-body-2)`.
- `--ki-avatar-group-lg-counter-padding-inline`: dimension used by the avatar group component for the lg counter inline padding (Space/xl 12px on the 48px frame). Default: `var(--ki-space-xl)`.
- `--ki-avatar-group-lg-overlap`: dimension used by the avatar group component for the lg member overlap (the exact -12px on the 48px Avatar_group frame 10090:2873). Default: `var(--ki-space-xl)`.
- `--ki-avatar-group-md-counter-font-size`: dimension used by the avatar group component for the md counter text (body_1 13px on the 40px frame). Default: `var(--ki-typography-size-body-1)`.
- `--ki-avatar-group-md-counter-padding-inline`: dimension used by the avatar group component for the md counter inline padding (Space/lg 10px on the 40px frame). Default: `var(--ki-space-lg)`.
- `--ki-avatar-group-md-overlap`: dimension used by the avatar group component for the md member overlap (the exact -12px on the 40px Avatar_group frame 10087:2701). Default: `var(--ki-space-xl)`.
- `--ki-avatar-group-ring-color`: color used by the avatar group component for the separating ring: transparent while the onmars ring width is zero (FR-008; a future theme may resolve both). Default: `var(--ki-outline-none)`.
- `--ki-avatar-group-ring-width`: dimension used by the avatar group component for the separating ring around stacked members: NO Avatar_group frame draws a ring (verified across all five sizes), so onmars resolves the capability to zero — the ring stays a theme decision, never an attribute (FR-008). Default: `var(--ki-space-zero)`.
- `--ki-avatar-group-sm-counter-font-size`: dimension used by the avatar group component for the sm counter text (body_1 13px on the 32px frame — one step above the sm initials, verified). Default: `var(--ki-typography-size-body-1)`.
- `--ki-avatar-group-sm-counter-padding-inline`: dimension used by the avatar group component for the sm counter inline padding (Space/md 8px on the 32px frame). Default: `var(--ki-space-md)`.
- `--ki-avatar-group-sm-overlap`: dimension used by the avatar group component for the sm member overlap (the exact -8px on the 32px Avatar_group frame 10087:2601). Default: `var(--ki-space-md)`.
- `--ki-avatar-group-xl-counter-font-size`: dimension used by the avatar group component for the xl counter text (title_2 18px on the 56px frame). Default: `var(--ki-typography-size-title-2)`.
- `--ki-avatar-group-xl-counter-padding-inline`: dimension used by the avatar group component for the xl counter inline padding (Space/2xl 14px on the 56px frame). Default: `var(--ki-space-2xl)`.
- `--ki-avatar-group-xl-overlap`: dimension used by the avatar group component for the xl member overlap (the exact -12px on the 56px Avatar_group frame 10090:2973). Default: `var(--ki-space-xl)`.
- `--ki-avatar-group-xs-counter-font-size`: dimension used by the avatar group component for the xs counter text (synthesized 24px step following the avatar xs initials size, declared for founder review). Default: `var(--ki-typography-size-caption-1)`.
- `--ki-avatar-group-xs-counter-padding-inline`: dimension used by the avatar group component for the xs counter inline padding (synthesized 24px step extending the verified 8/10/12/14 ramp, declared for founder review). Default: `var(--ki-space-sm)`.
- `--ki-avatar-group-xs-overlap`: dimension used by the avatar group component for the xs member overlap: the 24px group step exists in no Figma frame (five-step set), so it inherits the -8px overlap of the neighboring 20/32px frames (synthesized step, spec 019 Assumptions). Default: `var(--ki-space-md)`.
- `--ki-avatar-group-xxs-counter-font-size`: dimension used by the avatar group component for the xxs counter text: no counter exists on the 20px frame, so the value follows the avatar xxs initials step (synthesized, declared for founder review). Default: `var(--ki-typography-size-caption-1)`.
- `--ki-avatar-group-xxs-counter-padding-inline`: dimension used by the avatar group component for xxs counter padding inline (raised to clear the 8px member tuck so the + glyph is never occluded; the 20px Figma frame ships no counter — synthesized step, founder review pending). Default: `var(--ki-space-md)`.
- `--ki-avatar-group-xxs-overlap`: dimension used by the avatar group component for the xxs member overlap (the -8px stack step on the 20px Avatar_group frame — named xs in Figma, the vocabulary skew recorded in spec 019 Assumptions). Default: `var(--ki-space-md)`.
- `--ki-avatar-lg-font-size`: dimension used by the avatar component for lg initials (MarsUI UI/Body 2: 15px). Default: `var(--ki-typography-size-body-2)`.
- `--ki-avatar-lg-icon-size`: dimension used by the avatar component for the lg generic-figure glyph (MarsUI Icon/User 24px, Space/7xl). Default: `var(--ki-space-7xl)`.
- `--ki-avatar-lg-size`: dimension used by the avatar component for the lg box (48px circle, Figma Space/14xl). Default: `var(--ki-space-14xl)`.
- `--ki-avatar-md-font-size`: dimension used by the avatar component for md initials (MarsUI UI/Para: body_1 13px). Default: `var(--ki-typography-size-body-1)`.
- `--ki-avatar-md-icon-size`: dimension used by the avatar component for the md generic-figure glyph (MarsUI Icon/User 20px, Space/5xl). Default: `var(--ki-space-5xl)`.
- `--ki-avatar-md-size`: dimension used by the avatar component for the md box (40px circle, Figma Space/12xl, node 10011:947). Default: `var(--ki-space-12xl)`.
- `--ki-avatar-radius`: dimension used by the avatar component for the shape: Radius/radius_round bound to every avatar variant — the circle is a radius token, never an attribute (002 shape precedent, FR-005). Default: `var(--ki-radius-round)`.
- `--ki-avatar-sm-font-size`: dimension used by the avatar component for sm initials (MarsUI UI/Caption 2: 12px). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-avatar-sm-icon-size`: dimension used by the avatar component for the sm generic-figure glyph (MarsUI Icon/User 18px, Space/4xl). Default: `var(--ki-space-4xl)`.
- `--ki-avatar-sm-size`: dimension used by the avatar component for the sm box (32px circle, Figma Space/10xl). Default: `var(--ki-space-10xl)`.
- `--ki-avatar-xl-font-size`: dimension used by the avatar component for xl initials (MarsUI UI/Title 2: 18px). Default: `var(--ki-typography-size-title-2)`.
- `--ki-avatar-xl-icon-size`: dimension used by the avatar component for the xl generic-figure glyph (MarsUI Icon/User 28px, Space/9xl). Default: `var(--ki-space-9xl)`.
- `--ki-avatar-xl-size`: dimension used by the avatar component for the xl box (56px circle, Figma Space/16xl). Default: `var(--ki-space-16xl)`.
- `--ki-avatar-xs-font-size`: dimension used by the avatar component for xs initials (MarsUI UI/Caption 1: 10px, same step as xxs — verified on Type=text Size=xs 10108:6226). Default: `var(--ki-typography-size-caption-1)`.
- `--ki-avatar-xs-icon-size`: dimension used by the avatar component for the xs generic-figure glyph (MarsUI Icon/User 14px, same step as xxs — NOT the icon-button 16px ramp; verified on 10108:6230). Default: `var(--ki-space-2xl)`.
- `--ki-avatar-xs-size`: dimension used by the avatar component for the xs box (24px circle, Figma Space/7xl). Default: `var(--ki-space-7xl)`.
- `--ki-avatar-xxs-font-size`: dimension used by the avatar component for xxs initials (MarsUI UI/Caption 1: 10px). Default: `var(--ki-typography-size-caption-1)`.
- `--ki-avatar-xxs-icon-size`: dimension used by the avatar component for the xxs generic-figure glyph (MarsUI Icon/User 14px, Space/2xl). Default: `var(--ki-space-2xl)`.
- `--ki-avatar-xxs-size`: dimension used by the avatar component for the xxs box (20px circle, Figma Space/5xl; specs/019-ki-avatar/design-extraction.md). Default: `var(--ki-space-5xl)`.
- `--ki-effect-component-secondary-hover-shadow`: MarsUI Component_effect/secondary_hover: drops as primary_hover plus inner White/8 0/2/3. Pair with --ki-effect-component-backdrop-filter. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 2px 6px 2px rgba(0,0,0,0.15)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base). Default: onmars `var(--ki-duration-moderate)`, material3 `250ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
