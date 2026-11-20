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

- `--ki-alert-actions-gap`: dimension used by the alert component for the gap between slotted actions (MarsUI Alert master CTAs gap Space/xl 12px).
- `--ki-alert-border-width`: dimension used by the alert component for the card border width (the MarsUI Alert master card stroke is fully transparent). onmars v2 draws a hairline (spec 011 A2); material3 keeps its 2px border via its override.
- `--ki-alert-card-shadow`: shadow used by the alert component for the card elevation (MarsUI Alert master List_wrap: elevation ramp level e5). An inline alert does not float, so onmars v2 and material3 lay the card flat.
- `--ki-alert-danger-bg`: color used by the alert component for the danger card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.danger-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too.
- `--ki-alert-danger-border`: color used by the alert component for the danger card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.danger-low-em hairline around the tinted card (spec 011 A2).
- `--ki-alert-danger-fg`: color used by the alert component for the danger card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8).
- `--ki-alert-danger-icon-bg`: color used by the alert component for the danger icon frame (MarsUI Alert master Feature-icon Surface/danger-base-em-alpha at 12%).
- `--ki-alert-danger-icon-fg`: color used by the alert component for the danger icon glyph (MarsUI Alert master Feature-icon glyph Text/danger-high-em).
- `--ki-alert-dismiss-active-fg`: color used by the alert component for dismiss active foreground.
- `--ki-alert-dismiss-backdrop-filter`: Complete backdrop filter behind the alert dismiss button.
- `--ki-alert-dismiss-border-width`: dimension used by the alert component for the dismiss chip bevel stroke (MarsUI 24px raised circle: 1px Outline/secondary_button_top hairline).
- `--ki-alert-dismiss-hover-bg`: color used by the alert component for dismiss hover background (MarsUI hover mechanism: hover_overlay_inverse Black/3 wash — the dismiss chip previously had zero visible hover change).
- `--ki-alert-dismiss-hover-fg`: color used by the alert component for dismiss hover foreground.
- `--ki-alert-dismiss-icon-size`: dimension used by the alert component for dismiss icon size (Figma close glyph box 16px inside the 24px raised circle; repointed from 18px per the fidelity audit).
- `--ki-alert-dismiss-radius`: dimension used by the alert component for the dismiss chip shape (MarsUI Radius/radius_round full circle).
- `--ki-alert-dismiss-rest-fg`: color used by the alert component for dismiss rest foreground.
- `--ki-alert-dismiss-size`: dimension used by the alert component for dismiss size.
- `--ki-alert-focus-ring-color`: color used by the alert component for focus ring color.
- `--ki-alert-focus-ring-offset`: dimension used by the alert component for focus ring offset.
- `--ki-alert-focus-ring-shadow`: shadow used by the alert dismiss control for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-alert-focus-ring-width`: dimension used by the alert component for focus ring width.
- `--ki-alert-font-size`: dimension used by the alert component for font size.
- `--ki-alert-gap`: dimension used by the alert component for the card stack gap between icon, text and actions (MarsUI Alert master List_wrap gap Space/xl 12px).
- `--ki-alert-heading-font-family`: Font family for the alert heading. Override it to give alerts their own heading typeface.
- `--ki-alert-heading-font-size`: dimension used by the alert component for heading font size.
- `--ki-alert-heading-font-weight`: font weight used by the alert component for heading font weight (MarsUI UI/Body 2/medium: weight 600 on the master heading).
- `--ki-alert-icon-glyph-size`: dimension used by the alert component for the icon glyph inside the frame (MarsUI Alert master Feature-icon glyph 20px).
- `--ki-alert-icon-radius`: dimension used by the alert component for the icon frame radius (MarsUI Alert master Feature-icon: a circle).
- `--ki-alert-icon-size`: dimension used by the alert component for the icon frame (MarsUI Alert master Feature-icon size xs: 32px).
- `--ki-alert-info-bg`: color used by the alert component for the info card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.info-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too.
- `--ki-alert-info-border`: color used by the alert component for the info card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.info-low-em hairline around the tinted card (spec 011 A2).
- `--ki-alert-info-fg`: color used by the alert component for the info card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8).
- `--ki-alert-info-icon-bg`: color used by the alert component for the info icon frame (MarsUI Alert master Feature-icon Surface/info-base-em-alpha at 12%).
- `--ki-alert-info-icon-fg`: color used by the alert component for the info icon glyph (MarsUI Alert master Feature-icon glyph Text/info-high-em).
- `--ki-alert-line-height`: dimension used by the alert component for line height.
- `--ki-alert-message-line-height`: dimension used by the alert component for message line height (MarsUI description is 13/20 line_height/para; the heading keeps 15/24).
- `--ki-alert-neutral-bg`: color used by the alert component for the neutral card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 keeps that card for the neutral tone and edges it with a hairline (spec 011 A2).
- `--ki-alert-neutral-border`: color used by the alert component for the neutral card edge. onmars v2 draws it as the outline.low-em hairline of any flat card (spec 011 A2).
- `--ki-alert-neutral-fg`: color used by the alert component for the neutral card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8).
- `--ki-alert-neutral-icon-bg`: color used by the alert component for the neutral icon frame (MarsUI Alert master Feature-icon Surface/primary-base-em-alpha at 12%: the master variable itself, not the heavier primary-tint content fill, so the primary glyph clears 4.5:1 in dark).
- `--ki-alert-neutral-icon-fg`: color used by the alert component for the neutral icon glyph (MarsUI Alert master Feature-icon glyph Text/primary-high-em).
- `--ki-alert-padding-block`: dimension used by the alert component for the card padding block (MarsUI Alert master List_wrap card: 12px on all four sides).
- `--ki-alert-padding-inline`: dimension used by the alert component for the card padding inline (MarsUI Alert master List_wrap card: 12px on all four sides).
- `--ki-alert-radius`: dimension used by the alert component for the card radius (MarsUI Alert master List_wrap big_component/radius_xs 16px; the shell around it has its own radius).
- `--ki-alert-shell-backdrop-filter`: Complete backdrop filter behind the alert shell.
- `--ki-alert-shell-bg`: color used by the alert component for the shell wash (MarsUI Alert master Inverse-white/alpha-2: the nearest step of the Kimen inverse-white ramp, Black/3 light and White/3 dark). onmars v2 and material3 paint no shell: it is transparent.
- `--ki-alert-shell-padding`: dimension used by the alert component for the shell padding around the card (MarsUI Alert master: 12px on all four sides). onmars v2 and material3 set it to zero, so the alert paints as one flat card (spec 011 A2, S31).
- `--ki-alert-shell-radius`: dimension used by the alert component for the shell radius (MarsUI Alert master big_component/radius_lg 28px). A flat theme gives the shell the card radius.
- `--ki-alert-success-bg`: color used by the alert component for the success card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.success-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too.
- `--ki-alert-success-border`: color used by the alert component for the success card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.success-low-em hairline around the tinted card (spec 011 A2).
- `--ki-alert-success-fg`: color used by the alert component for the success card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8).
- `--ki-alert-success-icon-bg`: color used by the alert component for the success icon frame (MarsUI Alert master Feature-icon Surface/success-base-em-alpha at 12%).
- `--ki-alert-success-icon-fg`: color used by the alert component for the success icon glyph (MarsUI Alert master Feature-icon glyph Text/success-high-em).
- `--ki-alert-text-gap`: dimension used by the alert component for the heading-to-message stack gap (MarsUI Text_wrap 4px, decoupled from the outer 12px card gap).
- `--ki-alert-warning-bg`: color used by the alert component for the warning card background (MarsUI Alert master: the List_wrap card is Surface/special/light-s0-dark-s2 in every tone). onmars v2 tints the card with surface.warning-tint so the tone reads on the whole card (spec 011 A2); other themes may tint it per tone here too.
- `--ki-alert-warning-border`: color used by the alert component for the warning card edge (MarsUI draws no tone border on any alert/note/toast surface). onmars v2 draws the outline.warning-low-em hairline around the tinted card (spec 011 A2).
- `--ki-alert-warning-fg`: color used by the alert component for the warning card foreground: heading and message ink (MarsUI Alert master Text/high-em in every tone; the message keeps this 4.5:1 ink instead of the master Text/low-em, spec 011 A1-D8).
- `--ki-alert-warning-icon-bg`: color used by the alert component for the warning icon frame (MarsUI Alert master Feature-icon Surface/warning-base-em-alpha at 12%).
- `--ki-alert-warning-icon-fg`: color used by the alert component for the warning icon glyph (MarsUI Alert master Feature-icon glyph Text/warning-high-em).
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-outline-secondary-button-top`: semantic color for outline secondary button top.
- `--ki-surface-special-light-s0-dark-s2`: semantic color for surface special light s0 dark s2.
- `--ki-typography-family-body`: semantic font family for typography family body.
