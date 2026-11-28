# ki-alert

> A persistent inline status message with token-backed tone semantics.

## When to use

show a persistent inline message about the state of a page or
section, such as a failed save, completed operation, or service notice, that
remains until the condition is resolved or the person dismisses it. Express
severity with `tone`, never custom styling.

## When not to use

transient confirmations that expire on their own belong to
`ki-toast`, raised into a `ki-toaster`; tiny status descriptors attached to
another element belong to `ki-badge`; blocking decisions belong to
`ki-dialog`; inline field-level validation belongs to the form control.

Assistive technology note: alerts that must be announced should be inserted
dynamically, or re-shown by clearing `dismissed`; alerts present at initial
page load are exposed with their role but platform announcement is not
guaranteed.

Every non-neutral alert draws its tone's glyph in the icon frame (`info`,
`circle-check`, `triangle-alert`, `octagon-alert`) unless an icon is slotted.

## Examples

`tone` sets the token-backed colors and the live-region urgency — `danger` and `warning` expose `role="alert"`, every other value `role="status"`:

```html
<ki-alert tone="success">Your changes were saved.</ki-alert>
<ki-alert tone="danger">Payment failed. Update your billing details.</ki-alert>
```

An optional `heading` adds emphasized text inside the live region; it is a `strong` element, never a document heading:

```html
<ki-alert tone="warning" heading="Storage almost full">
  You are using 92% of your plan.
</ki-alert>
```

`dismissible` renders the alert's only tab stop; user dismissal reflects `dismissed` and fires a composed `ki-dismiss` (programmatic `dismissed` writes stay silent, and clearing the attribute re-shows the alert):

```html
<ki-alert tone="danger" heading="Save failed" dismissible>
  Your changes could not be saved. Retry or copy your work elsewhere.
</ki-alert>
```

`dismiss-label` overrides the dismiss button's accessible name — the default `Dismiss` is the component's only built-in user-visible string, so localize it whenever the document language is not English:

```html
<ki-alert lang="es" tone="info" dismissible dismiss-label="Descartar">
  Mantenimiento programado el sábado desde las 02:00 UTC.
</ki-alert>
```

The `icon` slot takes a decorative glyph, drawn in the tone's colors in a round frame at the top of the card. Without one, every non-neutral tone draws its own Lucide glyph there (`info`, `circle-check`, `triangle-alert`, `octagon-alert`); slot an icon to replace it, or to give a neutral alert one. The `actions` slot takes the responses to the message as `size="sm"` buttons, in a row after the message and outside the live region. An action never dismisses the alert by itself: set `dismissed` when it should go, and focus moves on to the next control:

```html
<ki-alert tone="warning" heading="Session ending" dismissible>
  <svg slot="icon" viewBox="0 0 20 20" aria-hidden="true">
    <path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4v4.5h-1.5V6h1.5Zm-.75 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
  </svg>
  Your session expires in one minute. Choose Stay signed in to keep working.
  <ki-button slot="actions" type="button" variant="secondary" size="sm">Sign out</ki-button>
  <ki-button slot="actions" type="button" variant="primary" size="sm">Stay signed in</ki-button>
</ki-alert>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-alert`: the default, only the tokens ki-alert needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `dismiss-label` (string, default 'Dismiss'): Accessible name for the dismiss button. Override for localization; the default English string is the component's only built-in user-visible text. When to use: provide a localized action name whenever the document language is not English. When NOT to use: do not put the alert message here; use the default slot.
- `dismissed` (boolean, default false): Reflected dismissed state. User dismissal sets it; applications may also set or clear it. While true, the host remains in the document but renders no alert subtree and leaves the accessibility tree. Clearing it re-shows the alert and creates a dynamic live-region appearance. When to use: persist or restore acknowledgement state from application data. When NOT to use: do not listen for programmatic changes as dismissal events; `ki-dismiss` is only for user activation.
- `dismissible` (boolean, default false): Renders one native dismiss button when true. The button sits outside the live-region boundary, so its accessible name is not announced as part of the alert message. When false, the alert adds no tab stop. When to use: allow a person to acknowledge and clear a persistent message. When NOT to use: do not use dismissible for auto-expiring messages; those belong to `ki-toast`.
- `heading` (string | undefined): Optional emphasized text rendered before the message inside the live region. Empty strings render no heading. The heading is a `strong` element, not a document heading, so it never changes page outline. When to use: add a short label when it helps identify the status message. When NOT to use: do not use heading for page structure; use a real heading outside the alert when the document needs one.
- `tone` ("danger" | "info" | "neutral" | "success" | "warning" | string & {}, default 'neutral'): Semantic intent for visual styling and live-region urgency. `danger` and `warning` expose `role="alert"`; `neutral`, `success`, `info`, absent, and unrecognized values expose `role="status"`. Unknown values keep rendering and fall back to the neutral token matrix by CSS construction. When to use: choose the tone that describes the page or section state. When NOT to use: do not use tone for layout, density, or filled-vs-outlined styling; those are token/theme decisions.

## Slots

- (default): Message body. It lives inside the live-region boundary.
- `actions`: Optional responses to this message, in a row at the bottom of the card, outside the live region. Slot `size="sm"` buttons. The alert never activates them and an action does not dismiss the alert; the application does, by setting `dismissed`. When NOT to use: a response the person cannot skip belongs in `ki-dialog`.
- `icon`: Optional decorative glyph shown in a round frame at the top of the card, in the tone's colors. Hidden from assistive technology: it never carries meaning the heading and message lack. Without one, a non-neutral alert draws its tone's default glyph. When to use: replace the default glyph, or give a neutral alert one. When NOT to use: never as the only cue for the message.

## Parts

- `actions`: Row around the `actions` slot, rendered only when it holds content.
- `alert`: Outer shell around the card: padding, radius, wash and blur.
- `card`: Card holding the icon, text, actions and dismiss control: tone background, border, radius, padding and elevation.
- `dismiss`: Native dismiss button, rendered only when dismissible.
- `heading`: Optional emphasized heading, rendered only when non-empty.
- `icon`: Round frame around the `icon` slot, rendered when it holds content or the tone draws a default glyph.
- `message`: Message body wrapper around the default slot.

## Events

- `ki-dismiss` (CustomEvent<null>): Fired once after the user dismisses the alert — emitted after the alert is hidden and focus has been handed to the next control. `detail` is `null` and the event is not cancelable (the alert is already gone when it runs). When to use: record acknowledgement, or advance an application flow after a user closes the alert. When NOT to use: do not treat it as a veto point, and do not expect it for programmatic `dismissed` changes — it fires only for user activation.

## Methods

None.

## CSS custom properties

- `--ki-alert-actions-gap`: dimension used by the alert component for the gap between slotted actions (MarsUI Alert master CTAs gap Space/xl 12px). Default: `var(--ki-space-xl)`.
- `--ki-alert-border-width`: dimension used by the alert component for the card border width (the MarsUI Alert master card stroke is fully transparent). onmars v2 draws a hairline (spec 011 A2); material3 keeps its 2px border via its override. Default: onmars `var(--ki-size-border-hairline)`, material3 `var(--ki-space-xxs)`.
- `--ki-alert-card-shadow`: shadow used by the alert component for the card elevation (MarsUI Alert master List_wrap: elevation ramp level e5). An inline alert does not float, so onmars v2 and material3 lay the card flat. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0 0 0 0 var(--ki-color-transparent-black)`.
- `--ki-alert-danger-bg`: color used by the alert component for the danger card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.danger-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too. Default: onmars `var(--ki-surface-danger-tint)`, material3 `var(--ki-surface-danger-low-em)`.
- `--ki-alert-danger-border`: color used by the alert component for the danger card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.danger-low-em hairline around the tinted card (spec 011 A2). Default: onmars `var(--ki-outline-danger-low-em)`, material3 `var(--ki-outline-danger-high-em)`.
- `--ki-alert-danger-fg`: color used by the alert component for the danger card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8). Default: onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-danger-high-em)`.
- `--ki-alert-danger-icon-bg`: color used by the alert component for the danger icon frame (MarsUI Alert master Feature-icon Surface/danger-base-em-alpha at 12%). Default: `var(--ki-surface-danger-tint)`.
- `--ki-alert-danger-icon-fg`: color used by the alert component for the danger icon glyph (MarsUI Alert master Feature-icon glyph Text/danger-high-em). Default: `var(--ki-text-danger-high-em)`.
- `--ki-alert-dismiss-active-fg`: color used by the alert component for dismiss active foreground. Default: `var(--ki-text-high-em)`.
- `--ki-alert-dismiss-backdrop-filter`: Complete backdrop filter behind the alert dismiss button. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-alert-dismiss-border-width`: dimension used by the alert component for the dismiss chip outline (MarsUI 24px circle: 1px Outline/secondary_button_top hairline). Default: `var(--ki-size-border-hairline)`.
- `--ki-alert-dismiss-hover-bg`: color used by the alert component for dismiss hover background (MarsUI hover mechanism: hover-overlay-inverse Black/3 wash). Default: `var(--ki-surface-hover-overlay-inverse)`.
- `--ki-alert-dismiss-hover-fg`: color used by the alert component for dismiss hover foreground. Default: `var(--ki-text-high-em)`.
- `--ki-alert-dismiss-icon-size`: dimension used by the alert component for dismiss icon size (Figma close glyph box 16px inside the 24px raised circle; repointed from 18px per the fidelity audit). Default: `var(--ki-space-3xl)`.
- `--ki-alert-dismiss-radius`: dimension used by the alert component for the dismiss chip shape (MarsUI Radius/radius_round full circle). Default: `var(--ki-radius-round)`.
- `--ki-alert-dismiss-rest-fg`: color used by the alert component for dismiss rest foreground. Default: `var(--ki-text-high-em)`.
- `--ki-alert-dismiss-size`: dimension used by the alert component for dismiss size. Default: `var(--ki-space-7xl)`.
- `--ki-alert-focus-ring-color`: color used by the alert component for focus ring color. Default: `var(--ki-focus-ring-color)`.
- `--ki-alert-focus-ring-offset`: dimension used by the alert component for focus ring offset. Default: `var(--ki-focus-ring-offset)`.
- `--ki-alert-focus-ring-shadow`: shadow used by the alert dismiss control for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator). Default: `var(--ki-focus-primary)`.
- `--ki-alert-focus-ring-width`: dimension used by the alert component for focus ring width. Default: `var(--ki-focus-ring-width)`.
- `--ki-alert-font-size`: dimension used by the alert component for font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-alert-gap`: dimension used by the alert component for the card stack gap between icon, text and actions (MarsUI Alert master List_wrap gap Space/xl 12px). Default: `var(--ki-space-xl)`.
- `--ki-alert-heading-font-family`: Font family for the alert heading. Override it to give alerts their own heading typeface. Default: `var(--ki-typography-family-heading)`.
- `--ki-alert-heading-font-size`: dimension used by the alert component for heading font size. Default: `var(--ki-typography-size-body-2)`.
- `--ki-alert-heading-font-weight`: font weight used by the alert component for heading font weight (MarsUI UI/Body 2/medium: weight 600 on the master heading). Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-alert-icon-glyph-size`: dimension used by the alert component for the icon glyph inside the frame (MarsUI Alert master Feature-icon glyph 20px). Default: `var(--ki-space-5xl)`.
- `--ki-alert-icon-radius`: dimension used by the alert component for the icon frame radius (MarsUI Alert master Feature-icon: a circle). Default: `var(--ki-radius-round)`.
- `--ki-alert-icon-size`: dimension used by the alert component for the icon frame (MarsUI Alert master Feature-icon size xs: 32px). Default: `var(--ki-space-10xl)`.
- `--ki-alert-info-bg`: color used by the alert component for the info card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.info-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too. Default: onmars `var(--ki-surface-info-tint)`, material3 `var(--ki-surface-s3)`.
- `--ki-alert-info-border`: color used by the alert component for the info card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.info-low-em hairline around the tinted card (spec 011 A2). Default: onmars `var(--ki-outline-info-low-em)`, material3 `var(--ki-outline-med-em)`.
- `--ki-alert-info-fg`: color used by the alert component for the info card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8). Default: `var(--ki-text-high-em)`.
- `--ki-alert-info-icon-bg`: color used by the alert component for the info icon frame (MarsUI Alert master Feature-icon Surface/info-base-em-alpha at 12%). Default: `var(--ki-surface-info-tint)`.
- `--ki-alert-info-icon-fg`: color used by the alert component for the info icon glyph (MarsUI Alert master Feature-icon glyph Text/info-high-em). Default: `var(--ki-text-info-high-em)`.
- `--ki-alert-line-height`: dimension used by the alert component for line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-alert-message-line-height`: dimension used by the alert component for message line height (MarsUI description is 13/20 line_height/para; the heading keeps 15/24). Default: `var(--ki-typography-line-height-para)`.
- `--ki-alert-neutral-bg`: color used by the alert component for the neutral card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 keeps that card for the neutral tone and edges it with a hairline (spec 011 A2). Default: onmars `var(--ki-surface-special-light-s0-dark-s2)`, material3 `var(--ki-surface-s2)`.
- `--ki-alert-neutral-border`: color used by the alert component for the neutral card edge. onmars v2 draws it as the outline.low-em hairline of any flat card (spec 011 A2). Default: onmars `var(--ki-outline-low-em)`, material3 `var(--ki-outline-med-em)`.
- `--ki-alert-neutral-fg`: color used by the alert component for the neutral card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8). Default: `var(--ki-text-high-em)`.
- `--ki-alert-neutral-icon-bg`: color used by the alert component for the neutral icon frame (MarsUI Alert master Feature-icon Surface/primary-base-em-alpha at 12%: the master variable itself, not the heavier primary-tint content fill, so the primary glyph clears 4.5:1 in dark). onmars v2 keeps the accent off it: the frame takes the neutral card surface. Default: onmars `var(--ki-alert-neutral-bg)`, material3 `var(--ki-surface-primary-base-em-alpha)`.
- `--ki-alert-neutral-icon-fg`: color used by the alert component for the neutral icon glyph (MarsUI Alert master Feature-icon glyph Text/primary-high-em). onmars v2 draws it in the neutral text.high-em ink. Default: onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)`.
- `--ki-alert-padding-block`: dimension used by the alert component for the card padding block (MarsUI Alert master List_wrap card: 12px on all four sides). Default: `var(--ki-space-xl)`.
- `--ki-alert-padding-inline`: dimension used by the alert component for the card padding inline (MarsUI Alert master List_wrap card: 12px on all four sides). Default: `var(--ki-space-xl)`.
- `--ki-alert-radius`: dimension used by the alert component for the card radius (MarsUI Alert master List_wrap big_component/radius_xs 16px; the shell around it has its own radius). Default: `var(--ki-radius-component-lg)`.
- `--ki-alert-shell-backdrop-filter`: Complete backdrop filter behind the alert shell. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-alert-shell-bg`: color used by the alert component for the shell wash (MarsUI Alert master Inverse-white/alpha-2: the nearest step of the Kimen inverse-white ramp, Black/3 light and White/3 dark). onmars v2 and material3 paint no shell: it is transparent. Default: `var(--ki-color-transparent-black)`.
- `--ki-alert-shell-padding`: dimension used by the alert component for the shell padding around the card (MarsUI Alert master: 12px on all four sides). onmars v2 and material3 set it to zero, so the alert paints as one flat card (spec 011 A2, S31). Default: `var(--ki-space-zero)`.
- `--ki-alert-shell-radius`: dimension used by the alert component for the shell radius (MarsUI Alert master big_component/radius_lg 28px). A flat theme gives the shell the card radius. Default: `var(--ki-radius-component-lg)`.
- `--ki-alert-success-bg`: color used by the alert component for the success card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.success-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too. Default: onmars `var(--ki-surface-success-tint)`, material3 `var(--ki-surface-s1)`.
- `--ki-alert-success-border`: color used by the alert component for the success card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.success-low-em hairline around the tinted card (spec 011 A2). Default: onmars `var(--ki-outline-success-low-em)`, material3 `var(--ki-outline-med-em)`.
- `--ki-alert-success-fg`: color used by the alert component for the success card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8). Default: `var(--ki-text-high-em)`.
- `--ki-alert-success-icon-bg`: color used by the alert component for the success icon frame (MarsUI Alert master Feature-icon Surface/success-base-em-alpha at 12%). Default: `var(--ki-surface-success-tint)`.
- `--ki-alert-success-icon-fg`: color used by the alert component for the success icon glyph (MarsUI Alert master Feature-icon glyph Text/success-high-em). Default: `var(--ki-text-success-high-em)`.
- `--ki-alert-text-gap`: dimension used by the alert component for the heading-to-message stack gap (MarsUI Text_wrap 4px, decoupled from the outer 12px card gap). Default: `var(--ki-space-xs)`.
- `--ki-alert-warning-bg`: color used by the alert component for the warning card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.warning-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too. Default: onmars `var(--ki-surface-warning-tint)`, material3 `var(--ki-surface-s4)`.
- `--ki-alert-warning-border`: color used by the alert component for the warning card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.warning-low-em hairline around the tinted card (spec 011 A2). Default: onmars `var(--ki-outline-warning-low-em)`, material3 `var(--ki-outline-high-em)`.
- `--ki-alert-warning-fg`: color used by the alert component for the warning card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8). Default: `var(--ki-text-high-em)`.
- `--ki-alert-warning-icon-bg`: color used by the alert component for the warning icon frame (MarsUI Alert master Feature-icon Surface/warning-base-em-alpha at 12%). Default: `var(--ki-surface-warning-tint)`.
- `--ki-alert-warning-icon-fg`: color used by the alert component for the warning icon glyph (MarsUI Alert master Feature-icon glyph Text/warning-high-em). Default: `var(--ki-text-warning-high-em)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets. Default: `var(--ki-space-xs)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base). Default: onmars `var(--ki-duration-moderate)`, material3 `250ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-outline-secondary-button-top`: semantic color for outline secondary button top. Default: onmars `light-dark(rgba(24,22,19,0.14),rgba(255,250,240,0.14))`, material3 `light-dark(var(--ki-color-black-5),var(--ki-color-white-8))`.
- `--ki-surface-special-light-s0-dark-s2`: semantic color for surface special light s0 dark s2. Default: `light-dark(var(--ki-surface-s0),var(--ki-surface-s2))`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
