# ki-icon-button

> A token-styled, icon-only action button with native button semantics and a mandatory accessible name.

## When to use

a compact, widely understood action where space precludes a
visible label: toolbars, card and dialog corners (close), media transport,
data-row actions. Always supply `label`; usually pair with ki-tooltip for
sighted discoverability.

## When not to use

whenever a visible label fits (use ki-button), toggling
state (a future toggle icon button), navigation (use a link), or form
submit/reset (ki-icon-button is not form-associated; use ki-button, whose
visible label communicates the consequence).

## Examples

The default slot holds exactly one decorative icon; the mandatory `label` is the accessible name — the slot never contributes to it:

```html
<ki-icon-button label="Close">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
</ki-icon-button>
```

Visual hierarchy comes from `variant` (default `secondary`) and semantic intent from `tone` (default `neutral`) — never use `variant` to signal success or danger:

```html
<ki-icon-button variant="primary" label="Play">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
</ki-icon-button>
<ki-icon-button variant="ghost" tone="danger" label="Delete row">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" stroke="currentColor" stroke-width="2" fill="none" /></svg>
</ki-icon-button>
```

Sizes run `xs` (24px, exactly the WCAG 2.2 pointer-target floor) through `xl`, default `md`; each pairs a square box with its own icon size:

```html
<ki-icon-button size="xs" label="Clear">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
</ki-icon-button>
<ki-icon-button size="xl" variant="primary" label="Record">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor" /></svg>
</ki-icon-button>
```

Pair with `ki-tooltip` for sighted discoverability: the tooltip's `label` becomes the accessible description while the icon button's `label` stays the accessible name:

```html
<ki-tooltip label="Closes the dialog">
  <ki-icon-button label="Close">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
  </ki-icon-button>
</ki-tooltip>
```

## Attributes

- `disabled` (boolean, default false): Prevents activation, removes the icon button from keyboard reach, and exposes the unavailable state through the internal native button. When NOT to use: do not use disabled for pending/loading semantics.
- `label` (string, required): Accessible name of the internal focusable button ("Close", "Play"). Required in the catalog contract: the icon is presentational, so without a label the control exposes no name and fails the accessibility audit. The component never invents a fallback name. When NOT to use: never omit it; never duplicate it as visible text (a visible label means ki-button).
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed square size. Every size keeps at least the 24×24 minimum pointer target (`xs` sits exactly on it); choose the size that matches the density of the surrounding UI. When NOT to use: do not shrink below `xs` through tokens; no theme may go under the WCAG 2.2 pointer-target floor.
- `tone` ("danger" | "neutral" | "success", default 'neutral'): Semantic intent for the action, independent of hierarchy. Use `success` for confirming actions and `danger` for destructive actions. When NOT to use: do not use tone for visual hierarchy; use `variant`.
- `variant` ("ghost" | "primary" | "quaternary" | "secondary" | "tertiary", default 'secondary'): Visual hierarchy for the action. Use `primary` for the single main action in a view and lower-emphasis variants for supporting actions. When NOT to use: do not use variant to signal success or danger; use `tone` for intent.

## Slots

- (default): Exactly one decorative icon. The slot is presentational: its content is hidden from assistive technology and never contributes to the accessible name — that comes from `label` alone.

## Parts

- `button`: Internal native button.
- `icon`: Icon wrapper around the default slot.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-icon-button-backdrop-blur`: dimension used by the icon button component for the glass variants (primary/secondary) backdrop blur, identical to the button glass. material3 resolves to blur none via the semantic override.
- `--ki-icon-button-border-width`: dimension used by the icon button component for border width (MarsUI bevel/outline stroke: 1px, INNER — the square box already contains it).
- `--ki-icon-button-focus-ring-color`: color used by the icon button component for focus ring color (the opaque WCAG 1.4.11 indicator).
- `--ki-icon-button-focus-ring-offset`: dimension used by the icon button component for focus ring offset.
- `--ki-icon-button-focus-ring-shadow`: shadow used by the icon button component for the focus ring glow (MarsUI Focus/primary: 3px spread ring, V.1 double mechanism).
- `--ki-icon-button-focus-ring-width`: dimension used by the icon button component for focus ring width.
- `--ki-icon-button-ghost-danger-hover-bg`: color used by the icon button component for ghost danger hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-ghost-danger-hover-border`: color used by the icon button component for ghost danger hover border.
- `--ki-icon-button-ghost-danger-hover-fg`: color used by the icon button component for ghost danger hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-ghost-danger-rest-bg`: color used by the icon button component for ghost danger rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-ghost-danger-rest-border`: color used by the icon button component for ghost danger rest border.
- `--ki-icon-button-ghost-danger-rest-fg`: color used by the icon button component for ghost danger rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-ghost-disabled-shadow`: value used by the icon button component for ghost disabled shadow (Figma disabled drops every shadow).
- `--ki-icon-button-ghost-hover-shadow`: value used by the icon button component for ghost hover shadow.
- `--ki-icon-button-ghost-neutral-disabled-bg`: color used by the icon button component for ghost disabled background (tone-independent, like the button disabled cells; deliberate 010 D2 deviation from Figma gray.100 for contrast, pending founder ratification).
- `--ki-icon-button-ghost-neutral-disabled-border`: color used by the icon button component for ghost disabled border (Figma disabled drops the bevel).
- `--ki-icon-button-ghost-neutral-disabled-fg`: color used by the icon button component for ghost disabled foreground (tone-independent; 010 D2 deviation from Figma text/base_em, pending founder ratification).
- `--ki-icon-button-ghost-neutral-hover-bg`: color used by the icon button component for ghost neutral hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-ghost-neutral-hover-border`: color used by the icon button component for ghost neutral hover border.
- `--ki-icon-button-ghost-neutral-hover-fg`: color used by the icon button component for ghost neutral hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-ghost-neutral-rest-bg`: color used by the icon button component for ghost neutral rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-ghost-neutral-rest-border`: color used by the icon button component for ghost neutral rest border.
- `--ki-icon-button-ghost-neutral-rest-fg`: color used by the icon button component for ghost neutral rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-ghost-rest-shadow`: value used by the icon button component for ghost rest shadow.
- `--ki-icon-button-ghost-success-hover-bg`: color used by the icon button component for ghost success hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-ghost-success-hover-border`: color used by the icon button component for ghost success hover border.
- `--ki-icon-button-ghost-success-hover-fg`: color used by the icon button component for ghost success hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-ghost-success-rest-bg`: color used by the icon button component for ghost success rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-ghost-success-rest-border`: color used by the icon button component for ghost success rest border.
- `--ki-icon-button-ghost-success-rest-fg`: color used by the icon button component for ghost success rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-lg-icon-size`: dimension used by the icon button component for lg icon size (MarsUI Placeholder_lg 24px).
- `--ki-icon-button-lg-radius`: dimension used by the icon button component for lg radius (12, same ramp as button).
- `--ki-icon-button-lg-size`: dimension used by the icon button component for lg box (48px square).
- `--ki-icon-button-md-icon-size`: dimension used by the icon button component for md icon size (MarsUI Placeholder_md 20px — the button md icon is 18px, 002 §3).
- `--ki-icon-button-md-radius`: dimension used by the icon button component for md radius (10, same ramp as button).
- `--ki-icon-button-md-size`: dimension used by the icon button component for md box (40px square, Figma node 10078:3129).
- `--ki-icon-button-primary-active-overlay`: Pressed state layer for the primary icon button: primary paints on a dark brand fill, so its wash lightens: the next rung above ki.surface.hover-overlay (White/5 -> White/8 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first.
- `--ki-icon-button-primary-danger-hover-bg`: color used by the icon button component for primary danger hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-primary-danger-hover-border`: color used by the icon button component for primary danger hover border (MarsUI bevel top/inline edge).
- `--ki-icon-button-primary-danger-hover-fg`: color used by the icon button component for primary danger hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-primary-danger-rest-bg`: color used by the icon button component for primary danger rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-primary-danger-rest-border`: color used by the icon button component for primary danger rest border (MarsUI bevel top/inline edge).
- `--ki-icon-button-primary-danger-rest-fg`: color used by the icon button component for primary danger rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-primary-disabled-shadow`: value used by the icon button component for primary disabled shadow (Figma disabled drops every shadow).
- `--ki-icon-button-primary-hover-overlay`: color used by the icon button component for the primary hover overlay layer (MarsUI hover_overlay, identical to the button overlay).
- `--ki-icon-button-primary-hover-shadow`: shadow used by the icon button component for primary hover shadow (MarsUI Component_effect/primary_hover).
- `--ki-icon-button-primary-neutral-disabled-bg`: color used by the icon button component for primary disabled background (tone-independent, like the button disabled cells; deliberate 010 D2 deviation from Figma gray.100 for contrast, pending founder ratification).
- `--ki-icon-button-primary-neutral-disabled-border`: color used by the icon button component for primary disabled border (Figma disabled drops the bevel).
- `--ki-icon-button-primary-neutral-disabled-fg`: color used by the icon button component for primary disabled foreground (tone-independent; 010 D2 deviation from Figma text/base_em, pending founder ratification).
- `--ki-icon-button-primary-neutral-hover-bg`: color used by the icon button component for primary neutral hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-primary-neutral-hover-border`: color used by the icon button component for primary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-icon-button-primary-neutral-hover-fg`: color used by the icon button component for primary neutral hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-primary-neutral-rest-bg`: color used by the icon button component for primary neutral rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-primary-neutral-rest-border`: color used by the icon button component for primary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-icon-button-primary-neutral-rest-fg`: color used by the icon button component for primary neutral rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-primary-rest-border-bottom`: color used by the icon button component for the primary bevel bottom edge (MarsUI Outline/primary_button_bottom, identical to the button bevel).
- `--ki-icon-button-primary-rest-shadow`: shadow used by the icon button component for primary rest shadow (MarsUI Component_effect/primary_default).
- `--ki-icon-button-primary-success-hover-bg`: color used by the icon button component for primary success hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-primary-success-hover-border`: color used by the icon button component for primary success hover border (MarsUI bevel top/inline edge).
- `--ki-icon-button-primary-success-hover-fg`: color used by the icon button component for primary success hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-primary-success-rest-bg`: color used by the icon button component for primary success rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-primary-success-rest-border`: color used by the icon button component for primary success rest border (MarsUI bevel top/inline edge).
- `--ki-icon-button-primary-success-rest-fg`: color used by the icon button component for primary success rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-quaternary-danger-hover-bg`: color used by the icon button component for quaternary danger hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-quaternary-danger-hover-border`: color used by the icon button component for quaternary danger hover border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-danger-hover-fg`: color used by the icon button component for quaternary danger hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-quaternary-danger-rest-bg`: color used by the icon button component for quaternary danger rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-quaternary-danger-rest-border`: color used by the icon button component for quaternary danger rest border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-danger-rest-fg`: color used by the icon button component for quaternary danger rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-quaternary-disabled-shadow`: value used by the icon button component for quaternary disabled shadow (Figma disabled drops every shadow).
- `--ki-icon-button-quaternary-hover-shadow`: value used by the icon button component for quaternary hover shadow.
- `--ki-icon-button-quaternary-neutral-disabled-bg`: color used by the icon button component for quaternary disabled background (tone-independent, like the button disabled cells; deliberate 010 D2 deviation from Figma gray.100 for contrast, pending founder ratification).
- `--ki-icon-button-quaternary-neutral-disabled-border`: color used by the icon button component for quaternary neutral disabled border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-neutral-disabled-fg`: color used by the icon button component for quaternary disabled foreground (tone-independent; 010 D2 deviation from Figma text/base_em, pending founder ratification).
- `--ki-icon-button-quaternary-neutral-hover-bg`: color used by the icon button component for quaternary neutral hover background (MarsUI hover mechanism: hover_overlay_inverse Black/3 wash over the transparent rest fill).
- `--ki-icon-button-quaternary-neutral-hover-border`: color used by the icon button component for quaternary neutral hover border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-neutral-hover-fg`: color used by the icon button component for quaternary neutral hover icon color (MarsUI quaternary glyph text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-icon-button-quaternary-neutral-rest-bg`: color used by the icon button component for quaternary neutral rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-quaternary-neutral-rest-border`: color used by the icon button component for quaternary neutral rest border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-neutral-rest-fg`: color used by the icon button component for quaternary neutral rest icon color (MarsUI quaternary glyph text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-icon-button-quaternary-rest-shadow`: value used by the icon button component for quaternary rest shadow.
- `--ki-icon-button-quaternary-success-hover-bg`: color used by the icon button component for quaternary success hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-quaternary-success-hover-border`: color used by the icon button component for quaternary success hover border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-success-hover-fg`: color used by the icon button component for quaternary success hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-quaternary-success-rest-bg`: color used by the icon button component for quaternary success rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-quaternary-success-rest-border`: color used by the icon button component for quaternary success rest border (MarsUI quaternary is borderless in every state).
- `--ki-icon-button-quaternary-success-rest-fg`: color used by the icon button component for quaternary success rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-secondary-active-overlay`: Pressed state layer for the secondary icon button: secondary paints on a light fill, so its wash darkens: the next rung above ki.surface.hover-overlay-inverse (Black/3 -> Black/5 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first.
- `--ki-icon-button-secondary-danger-hover-bg`: color used by the icon button component for secondary danger hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-secondary-danger-hover-border`: color used by the icon button component for secondary danger hover border (MarsUI bevel top/inline edge).
- `--ki-icon-button-secondary-danger-hover-fg`: color used by the icon button component for secondary danger hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-secondary-danger-rest-bg`: color used by the icon button component for secondary danger rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-secondary-danger-rest-border`: color used by the icon button component for secondary danger rest border (MarsUI bevel top/inline edge).
- `--ki-icon-button-secondary-danger-rest-fg`: color used by the icon button component for secondary danger rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-secondary-disabled-shadow`: value used by the icon button component for secondary disabled shadow (Figma disabled drops every shadow).
- `--ki-icon-button-secondary-hover-overlay`: color used by the icon button component for the secondary hover overlay layer (MarsUI hover_overlay_inverse, identical to the button overlay).
- `--ki-icon-button-secondary-hover-shadow`: shadow used by the icon button component for secondary hover shadow (MarsUI Component_effect/secondary_hover).
- `--ki-icon-button-secondary-neutral-disabled-bg`: color used by the icon button component for secondary disabled background (tone-independent, like the button disabled cells; deliberate 010 D2 deviation from Figma gray.100 for contrast, pending founder ratification).
- `--ki-icon-button-secondary-neutral-disabled-border`: color used by the icon button component for secondary disabled border (Figma disabled drops the bevel).
- `--ki-icon-button-secondary-neutral-disabled-fg`: color used by the icon button component for secondary disabled foreground (tone-independent; 010 D2 deviation from Figma text/base_em, pending founder ratification).
- `--ki-icon-button-secondary-neutral-hover-bg`: color used by the icon button component for secondary neutral hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-secondary-neutral-hover-border`: color used by the icon button component for secondary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-icon-button-secondary-neutral-hover-fg`: color used by the icon button component for secondary neutral hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-secondary-neutral-rest-bg`: color used by the icon button component for secondary neutral rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-secondary-neutral-rest-border`: color used by the icon button component for secondary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-icon-button-secondary-neutral-rest-fg`: color used by the icon button component for secondary neutral rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-secondary-rest-border-bottom`: color used by the icon button component for the secondary bevel bottom edge (MarsUI Outline/secondary_button_bottom, identical to the button bevel).
- `--ki-icon-button-secondary-rest-shadow`: shadow used by the icon button component for secondary rest shadow (MarsUI Component_effect/secondary_default).
- `--ki-icon-button-secondary-success-hover-bg`: color used by the icon button component for secondary success hover background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-secondary-success-hover-border`: color used by the icon button component for secondary success hover border (MarsUI bevel top/inline edge).
- `--ki-icon-button-secondary-success-hover-fg`: color used by the icon button component for secondary success hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-secondary-success-rest-bg`: color used by the icon button component for secondary success rest background (same semantic reference as the button matrix, 002).
- `--ki-icon-button-secondary-success-rest-border`: color used by the icon button component for secondary success rest border (MarsUI bevel top/inline edge).
- `--ki-icon-button-secondary-success-rest-fg`: color used by the icon button component for secondary success rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-sm-icon-size`: dimension used by the icon button component for sm icon size (MarsUI Placeholder_sm 18px).
- `--ki-icon-button-sm-radius`: dimension used by the icon button component for sm radius (8, same ramp as button).
- `--ki-icon-button-sm-size`: dimension used by the icon button component for sm box (32px square).
- `--ki-icon-button-tertiary-danger-hover-bg`: color used by the icon button component for tertiary danger hover background (one light step over the rest fill; dark keeps the rest fill — the hover signal is Component_effect/secondary_hover).
- `--ki-icon-button-tertiary-danger-hover-border`: color used by the icon button component for tertiary danger hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-icon-button-tertiary-danger-hover-fg`: color used by the icon button component for tertiary danger hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-tertiary-danger-rest-bg`: color used by the icon button component for tertiary danger rest background (MarsUI tertiary fill Surface/special/light-s0_dark-s2: White light, Dark/800 dark).
- `--ki-icon-button-tertiary-danger-rest-border`: color used by the icon button component for tertiary danger rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-icon-button-tertiary-danger-rest-fg`: color used by the icon button component for tertiary danger rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-tertiary-disabled-shadow`: value used by the icon button component for tertiary disabled shadow (Figma disabled drops every shadow).
- `--ki-icon-button-tertiary-hover-shadow`: shadow used by the icon button component for tertiary hover shadow (MarsUI Component_effect/secondary_hover).
- `--ki-icon-button-tertiary-neutral-disabled-bg`: color used by the icon button component for tertiary disabled background (tone-independent, like the button disabled cells; deliberate 010 D2 deviation from Figma gray.100 for contrast, pending founder ratification).
- `--ki-icon-button-tertiary-neutral-disabled-border`: color used by the icon button component for tertiary disabled border (Figma disabled drops the bevel).
- `--ki-icon-button-tertiary-neutral-disabled-fg`: color used by the icon button component for tertiary disabled foreground (tone-independent; 010 D2 deviation from Figma text/base_em, pending founder ratification).
- `--ki-icon-button-tertiary-neutral-hover-bg`: color used by the icon button component for tertiary neutral hover background (one light step over the rest fill; dark keeps the rest fill — the hover signal is Component_effect/secondary_hover).
- `--ki-icon-button-tertiary-neutral-hover-border`: color used by the icon button component for tertiary neutral hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-icon-button-tertiary-neutral-hover-fg`: color used by the icon button component for tertiary neutral hover icon color (MarsUI tertiary glyph text/med_em gray — Kimen tertiary maps to Figma tertiary; the purple-glyph row is primary_flat, documented alternative).
- `--ki-icon-button-tertiary-neutral-rest-bg`: color used by the icon button component for tertiary neutral rest background (MarsUI tertiary fill Surface/special/light-s0_dark-s2: White light, Dark/800 dark).
- `--ki-icon-button-tertiary-neutral-rest-border`: color used by the icon button component for tertiary neutral rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-icon-button-tertiary-neutral-rest-fg`: color used by the icon button component for tertiary neutral rest icon color (MarsUI tertiary glyph text/med_em gray — Kimen tertiary maps to Figma tertiary; the purple-glyph row is primary_flat, documented alternative).
- `--ki-icon-button-tertiary-rest-border-bottom`: color used by the icon button component for the tertiary bevel bottom edge (MarsUI Outline/secondary_button_bottom — same bevel pair as secondary).
- `--ki-icon-button-tertiary-rest-shadow`: shadow used by the icon button component for tertiary rest shadow (MarsUI Component_effect/secondary_default — replaces the migrated M2-era stack, which the material3 theme keeps via its own override).
- `--ki-icon-button-tertiary-success-hover-bg`: color used by the icon button component for tertiary success hover background (one light step over the rest fill; dark keeps the rest fill — the hover signal is Component_effect/secondary_hover).
- `--ki-icon-button-tertiary-success-hover-border`: color used by the icon button component for tertiary success hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-icon-button-tertiary-success-hover-fg`: color used by the icon button component for tertiary success hover foreground — the icon inherits it via currentColor.
- `--ki-icon-button-tertiary-success-rest-bg`: color used by the icon button component for tertiary success rest background (MarsUI tertiary fill Surface/special/light-s0_dark-s2: White light, Dark/800 dark).
- `--ki-icon-button-tertiary-success-rest-border`: color used by the icon button component for tertiary success rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-icon-button-tertiary-success-rest-fg`: color used by the icon button component for tertiary success rest foreground — the icon inherits it via currentColor.
- `--ki-icon-button-xl-icon-size`: dimension used by the icon button component for xl icon size (MarsUI Placeholder_xl 28px).
- `--ki-icon-button-xl-radius`: dimension used by the icon button component for xl radius (14, same ramp as button).
- `--ki-icon-button-xl-size`: dimension used by the icon button component for xl box (56px square).
- `--ki-icon-button-xs-icon-size`: dimension used by the icon button component for xs icon size (MarsUI Icon/Placeholder_xs 16px — one step above the button xs icon).
- `--ki-icon-button-xs-radius`: dimension used by the icon button component for xs radius (Figma Radius/component/radius_xs 6, same ramp as button).
- `--ki-icon-button-xs-size`: dimension used by the icon button component for xs box (24px square, Figma Space/7xl).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-transparent-inverse`: semantic color for transparent inverse.
- `--ki-typography-family-body`: semantic font family for typography family body.
