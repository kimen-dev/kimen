# ki-icon-button

> A token-styled, icon-only action button with native button semantics and a mandatory accessible name.

## When to use

a compact, widely understood action where space precludes a
visible label: toolbars, card and dialog corners (close), media transport,
data-row actions. Always supply `label`; usually pair with ki-tooltip for
sighted discoverability. While the action it started is in progress, set
`loading` instead of disabling it.

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

While the action it started is in progress, set `loading` instead of `disabled`: the icon button keeps its size, its focus and its `label`, ignores further activation, draws a spinner in place of the icon and announces `loading-label` (default "Loading") as a polite status message:

```html
<ki-icon-button label="Refresh" loading loading-label="Refreshing">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2" stroke="currentColor" stroke-width="2" fill="none" /></svg>
</ki-icon-button>
```

## Attributes

- `disabled` (boolean, default false): Prevents activation, removes the icon button from keyboard reach, and exposes the unavailable state through the internal native button. Wins over `loading` when both are set. When NOT to use: do not use disabled for pending/loading semantics; use `loading`.
- `label` (string, required): Accessible name of the internal focusable button ("Close", "Play"). Required in the catalog contract: the icon is presentational, so without a label the control exposes no name and fails the accessibility audit. The component never invents a fallback name. When NOT to use: never omit it; never duplicate it as visible text (a visible label means ki-button).
- `loading` (boolean, default false): Pending state of the action this icon button started (refreshing, sending). While set, every activation is blocked (pointer, Enter and Space), but the icon button stays focusable, in the Tab order and at its size: the icon stays laid out, transparent, and a spinner is drawn in its place. The internal native button is exposed with `aria-disabled="true"` and keeps its `label`, and `loadingLabel` is announced as a polite status message. `disabled` wins over it. The application sets it when the action starts and clears it when the action ends. When to use: while the work a click on this icon button started is running, so a second activation cannot repeat it. When NOT to use: for an icon button the person cannot use yet (use `disabled`), or for the progress of a page or region (use ki-progress).
- `loading-label` (string, default 'Loading'): Text of the polite status message announced while `loading` is set. Override for localization; the default English string is the icon button's only built-in user-visible text. When to use: provide a localized message whenever the document language is not English, or a more specific one ("Refreshing"). When NOT to use: do not repeat `label` here; the person already hears it on focus.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed square size. Every size keeps at least the 24×24 minimum pointer target (`xs` sits exactly on it); choose the size that matches the density of the surrounding UI. When NOT to use: do not shrink below `xs` through tokens; no theme may go under the WCAG 2.2 pointer-target floor.
- `tone` ("danger" | "neutral" | "success", default 'neutral'): Semantic intent for the action, independent of hierarchy. Use `success` for confirming actions and `danger` for destructive actions. When NOT to use: do not use tone for visual hierarchy; use `variant`.
- `variant` ("ghost" | "primary" | "quaternary" | "secondary" | "tertiary", default 'secondary'): Visual hierarchy for the action. Use filled `primary` for the single main action, outlined `secondary` for supporting actions, `quaternary` for neutral icon actions, and `ghost` for accent icon actions. When NOT to use: do not use variant to signal success or danger; use `tone` for intent.

## Slots

- (default): Exactly one decorative icon. The slot is presentational: its content is hidden from assistive technology and never contributes to the accessible name — that comes from `label` alone.

## Parts

- `button`: Internal native button.
- `icon`: Icon wrapper around the default slot.
- `spinner`: Loading spinner drawn in place of the icon, in the button's foreground ink, rendered only while `loading` is in effect.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-button-backdrop-blur`: backdrop blur used by the button component glass variants (primary/secondary). material3 resolves to blur none via the semantic override.
- `--ki-button-border-width`: dimension used by the button component for border width (MarsUI bevel/outline stroke: 1px).
- `--ki-button-focus-ring-color`: color used by the button component for focus ring color.
- `--ki-button-focus-ring-offset`: dimension used by the button component for focus ring offset.
- `--ki-button-focus-ring-shadow`: shadow used by the button component for the focus ring glow (MarsUI Focus/primary: 3px spread ring).
- `--ki-button-focus-ring-width`: dimension used by the button component for focus ring width.
- `--ki-button-ghost-danger-hover-bg`: color used by the button component for ghost danger hover background.
- `--ki-button-ghost-danger-hover-border`: color used by the button component for ghost danger hover border.
- `--ki-button-ghost-danger-hover-fg`: color used by the button component for ghost danger hover foreground.
- `--ki-button-ghost-danger-rest-bg`: color used by the button component for ghost danger rest background.
- `--ki-button-ghost-danger-rest-border`: color used by the button component for ghost danger rest border.
- `--ki-button-ghost-danger-rest-fg`: color used by the button component for ghost danger rest foreground.
- `--ki-button-ghost-disabled-shadow`: value used by the button component for ghost disabled shadow.
- `--ki-button-ghost-hover-shadow`: value used by the button component for ghost hover shadow.
- `--ki-button-ghost-neutral-disabled-bg`: color used by the button component for ghost neutral disabled background.
- `--ki-button-ghost-neutral-disabled-border`: color used by the button component for ghost neutral disabled border.
- `--ki-button-ghost-neutral-disabled-fg`: color used by the button component for ghost neutral disabled foreground.
- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background.
- `--ki-button-ghost-neutral-hover-border`: color used by the button component for ghost neutral hover border.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background.
- `--ki-button-ghost-neutral-rest-border`: color used by the button component for ghost neutral rest border.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground.
- `--ki-button-ghost-rest-shadow`: value used by the button component for ghost rest shadow.
- `--ki-button-ghost-success-hover-bg`: color used by the button component for ghost success hover background.
- `--ki-button-ghost-success-hover-border`: color used by the button component for ghost success hover border.
- `--ki-button-ghost-success-hover-fg`: color used by the button component for ghost success hover foreground.
- `--ki-button-ghost-success-rest-bg`: color used by the button component for ghost success rest background.
- `--ki-button-ghost-success-rest-border`: color used by the button component for ghost success rest border.
- `--ki-button-ghost-success-rest-fg`: color used by the button component for ghost success rest foreground.
- `--ki-button-lg-radius`: dimension used by the button component for lg radius (Button master 8003:300 binds Radius/small-component/lg, the scale a radius mode reassigns).
- `--ki-button-md-radius`: dimension used by the button component for md radius (Button master 8003:300 binds Radius/small-component/md, the scale a radius mode reassigns).
- `--ki-button-primary-active-overlay`: Pressed state layer for the primary button: primary paints on a dark brand fill, so its wash lightens: the next rung above ki.surface.hover-overlay (White/5 -> White/8 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first.
- `--ki-button-primary-danger-hover-bg`: color used by the button component for primary danger hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-danger-hover-border`: color used by the button component for primary danger hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-danger-hover-fg`: color used by the button component for primary danger hover foreground.
- `--ki-button-primary-danger-rest-bg`: color used by the button component for primary danger rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/danger_med_em #f05149) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-danger-rest-border`: color used by the button component for primary danger rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-danger-rest-fg`: color used by the button component for primary danger rest foreground.
- `--ki-button-primary-disabled-shadow`: value used by the button component for primary disabled shadow.
- `--ki-button-primary-hover-overlay`: color used by the button component for the primary hover overlay layer (MarsUI hover_overlay, White/5).
- `--ki-button-primary-hover-shadow`: shadow used by the button component for button primary hover shadow (MarsUI Component_effect/primary_hover).
- `--ki-button-primary-neutral-disabled-bg`: color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-disabled-border`: color used by the button component for primary neutral disabled border.
- `--ki-button-primary-neutral-disabled-fg`: color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-hover-bg`: color used by the button component for primary neutral hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-neutral-hover-border`: color used by the button component for primary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-neutral-hover-fg`: color used by the button component for primary neutral hover foreground.
- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500).
- `--ki-button-primary-neutral-rest-border`: color used by the button component for primary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground.
- `--ki-button-primary-rest-border-bottom`: color used by the button component for the primary bevel bottom edge (MarsUI Outline/primary_button_bottom).
- `--ki-button-primary-rest-shadow`: shadow used by the button component for button primary rest shadow (MarsUI Component_effect/primary_default).
- `--ki-button-primary-success-hover-bg`: color used by the button component for primary success hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-success-hover-border`: color used by the button component for primary success hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-success-hover-fg`: color used by the button component for primary success hover foreground.
- `--ki-button-primary-success-rest-bg`: color used by the button component for primary success rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/success_med_em #409b3f) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-success-rest-border`: color used by the button component for primary success rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-success-rest-fg`: color used by the button component for primary success rest foreground.
- `--ki-button-quaternary-danger-hover-bg`: color used by the button component for quaternary danger hover background.
- `--ki-button-quaternary-danger-hover-border`: color used by the button component for quaternary danger hover border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-danger-hover-fg`: color used by the button component for quaternary danger hover foreground.
- `--ki-button-quaternary-danger-rest-bg`: color used by the button component for quaternary danger rest background.
- `--ki-button-quaternary-danger-rest-border`: color used by the button component for quaternary danger rest border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-danger-rest-fg`: color used by the button component for quaternary danger rest foreground.
- `--ki-button-quaternary-disabled-shadow`: value used by the button component for quaternary disabled shadow.
- `--ki-button-quaternary-hover-shadow`: value used by the button component for quaternary hover shadow.
- `--ki-button-quaternary-neutral-disabled-bg`: color used by the button component for quaternary neutral disabled background.
- `--ki-button-quaternary-neutral-disabled-border`: color used by the button component for quaternary neutral disabled border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-neutral-disabled-fg`: color used by the button component for quaternary neutral disabled foreground: the disabled ink of every field and selection control (Text/base_em). quaternary has no fill or border, so its ink alone shows the state; ki.text.muted equals its resting ki.text.med-em in onmars.
- `--ki-button-quaternary-neutral-hover-bg`: color used by the button component for quaternary neutral hover background (MarsUI hover mechanism: hover_overlay_inverse Black/3 wash over the transparent rest fill).
- `--ki-button-quaternary-neutral-hover-border`: color used by the button component for quaternary neutral hover border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-neutral-hover-fg`: color used by the button component for quaternary neutral hover foreground (MarsUI quaternary label text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-button-quaternary-neutral-rest-bg`: color used by the button component for quaternary neutral rest background.
- `--ki-button-quaternary-neutral-rest-border`: color used by the button component for quaternary neutral rest border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-neutral-rest-fg`: color used by the button component for quaternary neutral rest foreground (MarsUI quaternary label text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-button-quaternary-rest-shadow`: value used by the button component for quaternary rest shadow.
- `--ki-button-quaternary-success-hover-bg`: color used by the button component for quaternary success hover background.
- `--ki-button-quaternary-success-hover-border`: color used by the button component for quaternary success hover border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-success-hover-fg`: color used by the button component for quaternary success hover foreground.
- `--ki-button-quaternary-success-rest-bg`: color used by the button component for quaternary success rest background.
- `--ki-button-quaternary-success-rest-border`: color used by the button component for quaternary success rest border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-success-rest-fg`: color used by the button component for quaternary success rest foreground.
- `--ki-button-secondary-active-overlay`: Pressed state layer for the secondary button: secondary paints on a light fill, so its wash darkens: the next rung above ki.surface.hover-overlay-inverse (Black/3 -> Black/5 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first.
- `--ki-button-secondary-danger-hover-bg`: color used by the button component for secondary danger hover background.
- `--ki-button-secondary-danger-hover-border`: color used by the button component for secondary danger hover border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-danger-hover-fg`: color used by the button component for secondary danger hover foreground.
- `--ki-button-secondary-danger-rest-bg`: color used by the button component for secondary danger rest background.
- `--ki-button-secondary-danger-rest-border`: color used by the button component for secondary danger rest border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-danger-rest-fg`: color used by the button component for secondary danger rest foreground.
- `--ki-button-secondary-disabled-shadow`: value used by the button component for secondary disabled shadow.
- `--ki-button-secondary-hover-overlay`: color used by the button component for the secondary hover overlay layer (MarsUI hover_overlay_inverse, Black/3).
- `--ki-button-secondary-hover-shadow`: shadow used by the button component for secondary hover shadow (MarsUI Component_effect/secondary_hover).
- `--ki-button-secondary-neutral-disabled-bg`: color used by the button component for secondary neutral disabled background.
- `--ki-button-secondary-neutral-disabled-border`: color used by the button component for secondary neutral disabled border.
- `--ki-button-secondary-neutral-disabled-fg`: color used by the button component for secondary neutral disabled foreground.
- `--ki-button-secondary-neutral-hover-bg`: color used by the button component for secondary neutral hover background (MarsUI: rest fill; hover darkening comes from the hover overlay).
- `--ki-button-secondary-neutral-hover-border`: color used by the button component for secondary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-button-secondary-neutral-hover-fg`: color used by the button component for secondary neutral hover foreground (MarsUI text/high_em).
- `--ki-button-secondary-neutral-rest-bg`: color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: gray glass, not a brand tint).
- `--ki-button-secondary-neutral-rest-border`: color used by the button component for secondary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-button-secondary-neutral-rest-fg`: color used by the button component for secondary neutral rest foreground (MarsUI text/high_em).
- `--ki-button-secondary-rest-border-bottom`: color used by the button component for the secondary bevel bottom edge (MarsUI Outline/secondary_button_bottom).
- `--ki-button-secondary-rest-shadow`: shadow used by the button component for secondary rest shadow (MarsUI Component_effect/secondary_default).
- `--ki-button-secondary-success-hover-bg`: color used by the button component for secondary success hover background.
- `--ki-button-secondary-success-hover-border`: color used by the button component for secondary success hover border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-success-hover-fg`: color used by the button component for secondary success hover foreground.
- `--ki-button-secondary-success-rest-bg`: color used by the button component for secondary success rest background.
- `--ki-button-secondary-success-rest-border`: color used by the button component for secondary success rest border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-success-rest-fg`: color used by the button component for secondary success rest foreground.
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns).
- `--ki-button-spinner-duration`: duration used by the button and icon button components for one turn of the loading spinner (spec 046 D5: the ki-progress indeterminate period). Applied only under prefers-reduced-motion: no-preference.
- `--ki-button-spinner-stroke-width`: dimension used by the button and icon button components for the loading spinner stroke (spec 046 D5: the circular ki-progress ring, drawn with a non-scaling stroke of this width).
- `--ki-button-tertiary-danger-hover-bg`: Tertiary alias of the secondary danger hover background.
- `--ki-button-tertiary-danger-hover-border`: color used by the button component for tertiary danger hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-danger-hover-fg`: color used by the button component for tertiary danger hover foreground.
- `--ki-button-tertiary-danger-rest-bg`: Tertiary alias of the secondary danger rest background.
- `--ki-button-tertiary-danger-rest-border`: color used by the button component for tertiary danger rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-danger-rest-fg`: color used by the button component for tertiary danger rest foreground.
- `--ki-button-tertiary-disabled-shadow`: value used by the button component for tertiary disabled shadow.
- `--ki-button-tertiary-hover-overlay`: Hover overlay for neutral tertiary buttons, shared with secondary by default.
- `--ki-button-tertiary-hover-shadow`: shadow used by the button component for tertiary hover shadow (MarsUI Component_effect/secondary_hover).
- `--ki-button-tertiary-neutral-disabled-bg`: color used by the button component for tertiary neutral disabled background.
- `--ki-button-tertiary-neutral-disabled-border`: color used by the button component for tertiary neutral disabled border.
- `--ki-button-tertiary-neutral-disabled-fg`: color used by the button component for tertiary neutral disabled foreground.
- `--ki-button-tertiary-neutral-hover-bg`: Tertiary alias of the secondary neutral hover background.
- `--ki-button-tertiary-neutral-hover-border`: color used by the button component for tertiary neutral hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-neutral-hover-fg`: Tertiary alias of the secondary neutral hover foreground.
- `--ki-button-tertiary-neutral-rest-bg`: Tertiary alias of the secondary neutral rest background.
- `--ki-button-tertiary-neutral-rest-border`: color used by the button component for tertiary neutral rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-neutral-rest-fg`: Tertiary alias of the secondary neutral rest foreground.
- `--ki-button-tertiary-rest-border-bottom`: color used by the button component for the tertiary bevel bottom edge (MarsUI Outline/secondary_button_bottom — same bevel pair as secondary).
- `--ki-button-tertiary-rest-shadow`: shadow used by the button component for tertiary rest shadow (MarsUI Component_effect/secondary_default — replaces the migrated M2-era stack, which the material3 theme keeps via its own override).
- `--ki-button-tertiary-success-hover-bg`: Tertiary alias of the secondary success hover background.
- `--ki-button-tertiary-success-hover-border`: color used by the button component for tertiary success hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-success-hover-fg`: color used by the button component for tertiary success hover foreground.
- `--ki-button-tertiary-success-rest-bg`: Tertiary alias of the secondary success rest background.
- `--ki-button-tertiary-success-rest-border`: color used by the button component for tertiary success rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-success-rest-fg`: color used by the button component for tertiary success rest foreground.
- `--ki-button-xl-radius`: dimension used by the button component for xl radius (Button master 8003:300 binds Radius/small-component/xl, the scale a radius mode reassigns).
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns).
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-icon-button-lg-icon-size`: dimension used by the icon button component for lg icon size (MarsUI Placeholder_lg 24px).
- `--ki-icon-button-lg-size`: dimension used by the icon button component for lg box (48px square).
- `--ki-icon-button-lg-spinner-size`: dimension used by the icon button component for the lg loading spinner box (24px, the lg icon size; spec 046 D5: the spinner takes the place of the icon).
- `--ki-icon-button-md-icon-size`: dimension used by the icon button component for md icon size (MarsUI Placeholder_md 20px — the button md icon is 18px, 002 §3).
- `--ki-icon-button-md-size`: dimension used by the icon button component for md box (40px square, Figma node 10078:3129).
- `--ki-icon-button-md-spinner-size`: dimension used by the icon button component for the md loading spinner box (20px, the md icon size; spec 046 D5: the spinner takes the place of the icon).
- `--ki-icon-button-sm-icon-size`: dimension used by the icon button component for sm icon size (MarsUI Placeholder_sm 18px).
- `--ki-icon-button-sm-size`: dimension used by the icon button component for sm box (32px square).
- `--ki-icon-button-sm-spinner-size`: dimension used by the icon button component for the sm loading spinner box (18px, the sm icon size; spec 046 D5: the spinner takes the place of the icon).
- `--ki-icon-button-xl-icon-size`: dimension used by the icon button component for xl icon size (MarsUI Placeholder_xl 28px).
- `--ki-icon-button-xl-size`: dimension used by the icon button component for xl box (56px square).
- `--ki-icon-button-xl-spinner-size`: dimension used by the icon button component for the xl loading spinner box (28px, the xl icon size; spec 046 D5: the spinner takes the place of the icon).
- `--ki-icon-button-xs-icon-size`: dimension used by the icon button component for xs icon size (MarsUI Icon/Placeholder_xs 16px — one step above the button xs icon).
- `--ki-icon-button-xs-size`: dimension used by the icon button component for xs box (24px square, Figma Space/7xl).
- `--ki-icon-button-xs-spinner-size`: dimension used by the icon button component for the xs loading spinner box (16px, the xs icon size; spec 046 D5: the spinner takes the place of the icon).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-typography-family-body`: semantic font family for typography family body.
