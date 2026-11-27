# ki-avatar

> A static identity visual that shows a person or entity at a glance through a fallback chain: portrait, then initials, then a built-in generic figure.

## When to use

a compact identity visual for a person or entity — a comment
author, a contact list item, a project member. Set `label` whenever the
avatar is the only carrier of the identity (no adjacent visible name);
compose several into `ki-avatar-group` for a compact "who is involved"
stack with overflow.

## When not to use

as a clickable control (compose the avatar inside an
interactive host such as ki-button), for logos or arbitrary illustrations
(plain `img`), or unlabeled when no adjacent text names the identity.
Use the counter slot for a decorative count or presence dot.

## Examples

The fallback chain is content, never a mode switch: a portrait that loads wins, `initials` render verbatim otherwise, and a built-in generic figure covers the rest; `label` exposes the avatar as a named non-interactive image:

```html
<ki-avatar label="Ana García" src="/avatars/ana.png" initials="AG"></ki-avatar>
<ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
<ki-avatar label="Guest"></ki-avatar>
```

Beside a visible name the avatar is decorative — omit `label` so assistive technology hears the name exactly once:

```html
<p><ki-avatar initials="AG" size="sm"></ki-avatar> Ana García</p>
```

`size` steps over the shared scale (`xxs` to `xl`, default `md`); an unrecognized value keeps the medium metrics:

```html
<ki-avatar label="Ana García" initials="AG" size="xs"></ki-avatar>
<ki-avatar label="Ana García" initials="AG"></ki-avatar>
<ki-avatar label="Ana García" initials="AG" size="xl"></ki-avatar>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-avatar`: the default, only the tokens ki-avatar needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `initials` (string | undefined): Initials rendered verbatim as the second fallback step — never derived from the label, never truncated (FR-003). Catalog guidance: one to two characters. With a label present the initials are presentational; assistive technology receives the label alone.
- `label` (string | undefined): Accessible name for the identity ("Ana García"). With a label the avatar is exposed as a named non-interactive image (role `img`) in every content mode — the portrait never carries a second alternative text of its own. Without a label the avatar is decorative and contributes nothing to the accessibility tree; the identity must then live in adjacent visible text (FR-002).
- `size` ("lg" | "md" | "sm" | "xl" | "xs" | "xxs", default 'md'): Size step over the shared scale; per-size metrics (box, initials font, figure glyph) are per-theme component tokens, never hardcoded (FR-004). An unrecognized value matches no style selector, so the avatar keeps the default medium metrics (fallback by CSS construction, FR-007).
- `src` (string | undefined, URL): Portrait URL, the first step of the fallback chain. When it fails to load — initially or at runtime — the avatar silently falls back to the initials (or the generic figure) with no error, no layout change and no event (FR-001). Loading policy follows the platform image defaults.

## Slots

- `counter`: Decorative ki-counter. Counts sit at block-start inline-end and dots at block-end inline-end. Include its meaning in the avatar label.

## Parts

- `avatar`: The avatar box: size, shape, surface, border and typography.
- `icon`: The built-in generic person figure of the last fallback step.
- `image`: The portrait image when `src` is set and loads.
- `initials`: The verbatim initials text of the second fallback step.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-avatar-bg`: color used by the avatar component for the initials/figure surface: Surface/primary_med_em, the exact variable behind the Type=text gradient start and the Type=icon solid fill. The Figma text gradient (primary_med_em -> primary_low_em_alpha 20%) is deliberately flattened to its solid start color — the token pipeline models no gradients and the spec defines one family-level bg (declared deviation, specs/019-ki-avatar/design-extraction.md decision 2, pending founder ratification). onmars v2 fills it with the neutral surface.s3, since a list of people is not a list of selected items. Default: onmars `var(--ki-surface-s3)`, material3 `var(--ki-surface-primary-med-em)`.
- `--ki-avatar-border-color`: color used by the avatar component for the surface border: Outline/base_em (Black/3 light, White/3 dark), the exact variable on Type=text variants. Default: onmars `var(--ki-outline-base-em)`, material3 `var(--ki-outline-none)`.
- `--ki-avatar-border-width`: dimension used by the avatar component for the surface border (MarsUI 1px hairline on Type=text; applied to the token surface behind initials and figure, dropped under a loaded portrait — design-extraction decision 4). Default: `var(--ki-size-border-hairline)`.
- `--ki-avatar-fg`: color used by the avatar component for the initials text and the generic-figure glyph (via currentColor): Text/primary_on_primary, the exact variable on every Type=text variant. onmars v2 sets the initials in the text.supporting ink (med-em, stronger under more contrast) on its neutral fill. Default: onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-on-primary)`.
- `--ki-avatar-font-family`: font family used by the avatar component for initials: the body family (Instrument Sans in onmars v2). Default: `var(--ki-typography-family-body)`.
- `--ki-avatar-font-weight`: font weight used by the avatar component for initials (MarsUI Typeface/weight/body/medium: 600). Default: `var(--ki-typography-weight-body-medium)`.
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
- `--ki-counter-ring-width`: Thickness of the separating ring. Default: `var(--ki-notification-marker-ring-width)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
