# ki-alert

> A persistent inline status message with token-backed tone semantics.

## When to use

show a persistent inline message about the state of a page or
section, such as a failed save, completed operation, or service notice, that
remains until the condition is resolved or the person dismisses it. Express
severity with `tone`, never custom styling.

## When not to use

transient confirmations that expire on their own belong to
the future `ki-toast`; tiny status descriptors attached to another element
belong to `ki-badge`; blocking decisions belong to `ki-dialog`; inline
field-level validation belongs to the form control.

Assistive technology note: alerts that must be announced should be inserted
dynamically, or re-shown by clearing `dismissed`; alerts present at initial
page load are exposed with their role but platform announcement is not
guaranteed.

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

## Attributes

- `dismiss-label` (string, default 'Dismiss'): Accessible name for the dismiss button. Override for localization; the default English string is the component's only built-in user-visible text. When to use: provide a localized action name whenever the document language is not English. When NOT to use: do not put the alert message here; use the default slot.
- `dismissed` (boolean, default false): Reflected dismissed state. User dismissal sets it; applications may also set or clear it. While true, the host remains in the document but renders no alert subtree and leaves the accessibility tree. Clearing it re-shows the alert and creates a dynamic live-region appearance. When to use: persist or restore acknowledgement state from application data. When NOT to use: do not listen for programmatic changes as dismissal events; `ki-dismiss` is only for user activation.
- `dismissible` (boolean, default false): Renders one native dismiss button when true. The button sits outside the live-region boundary, so its accessible name is not announced as part of the alert message. When false, the alert adds no tab stop. When to use: allow a person to acknowledge and clear a persistent message. When NOT to use: do not use dismissible for auto-expiring messages; that is future `ki-toast` behavior.
- `heading` (string | undefined): Optional emphasized text rendered before the message inside the live region. Empty strings render no heading. The heading is a `strong` element, not a document heading, so it never changes page outline. When to use: add a short label when it helps identify the status message. When NOT to use: do not use heading for page structure; use a real heading outside the alert when the document needs one.
- `tone` ("danger" | "info" | "neutral" | "success" | "warning" | string & {}, default 'neutral'): Semantic intent for visual styling and live-region urgency. `danger` and `warning` expose `role="alert"`; `neutral`, `success`, `info`, absent, and unrecognized values expose `role="status"`. Unknown values keep rendering and fall back to the neutral token matrix by CSS construction. When to use: choose the tone that describes the page or section state. When NOT to use: do not use tone for layout, density, or filled-vs-outlined styling; those are token/theme decisions.

## Slots

- (default): Message body. It lives inside the live-region boundary.

## Parts

- `alert`: Outer alert surface: tone background, border, radius, and padding.
- `dismiss`: Native dismiss button, rendered only when dismissible.
- `heading`: Optional emphasized heading, rendered only when non-empty.
- `message`: Message body wrapper around the default slot.

## Events

- `ki-dismiss` (CustomEvent<null>): Fired once after the user dismisses the alert — emitted after the alert is hidden and focus has been handed to the next control. `detail` is `null` and the event is not cancelable (the alert is already gone when it runs). When to use: record acknowledgement, or advance an application flow after a user closes the alert. When NOT to use: do not treat it as a veto point, and do not expect it for programmatic `dismissed` changes — it fires only for user activation.

## Methods

None.

## CSS custom properties

- `--ki-alert-border-width`: dimension used by the alert component for border width (MarsUI never strokes alert surfaces: Alert master, Info Notes and Toasts all carry width 0; tone lives in the fill and text. material3 keeps its 2px border via its override).
- `--ki-alert-danger-bg`: color used by the alert component for danger background (MarsUI Surface/danger_base_em_alpha: tone-500 at 12% light / alpha dark — the Info-Note tint, replacing the opaque 50/950 slabs).
- `--ki-alert-danger-border`: color used by the alert component for danger border (MarsUI draws no tone border on any alert/note/toast surface).
- `--ki-alert-danger-fg`: color used by the alert component for danger foreground.
- `--ki-alert-dismiss-active-fg`: color used by the alert component for dismiss active foreground.
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
- `--ki-alert-gap`: dimension used by the alert component for gap (MarsUI Alert master card gap Space/xl 12px).
- `--ki-alert-heading-font-size`: dimension used by the alert component for heading font size.
- `--ki-alert-heading-font-weight`: font weight used by the alert component for heading font weight (MarsUI UI/Body 2/medium: weight 600 on the master heading).
- `--ki-alert-info-bg`: color used by the alert component for info background (MarsUI Surface/info_base_em_alpha: tone-500 at 12% light / alpha dark — the Info-Note tint, replacing the opaque 50/950 slabs).
- `--ki-alert-info-border`: color used by the alert component for info border (MarsUI draws no tone border on any alert/note/toast surface).
- `--ki-alert-info-fg`: color used by the alert component for info foreground (MarsUI brief §1 systematic em pattern: tone high-em text on tone base-em surface, matching the success/danger rows and the ki-badge tone matrix; AA 7.3:1).
- `--ki-alert-line-height`: dimension used by the alert component for line height.
- `--ki-alert-message-line-height`: dimension used by the alert component for message line height (MarsUI description is 13/20 line_height/para; the heading keeps 15/24).
- `--ki-alert-neutral-bg`: color used by the alert component for neutral background.
- `--ki-alert-neutral-border`: color used by the alert component for neutral border.
- `--ki-alert-neutral-fg`: color used by the alert component for neutral foreground.
- `--ki-alert-padding-block`: dimension used by the alert component for padding block (MarsUI Alert master card: 12px on all four sides).
- `--ki-alert-padding-inline`: dimension used by the alert component for padding inline (MarsUI Alert master card: 12px on all four sides).
- `--ki-alert-radius`: dimension used by the alert component for radius (Info Notes pills measure component radius 8-10px; same 10px value, repointed to the component ramp so personality modes reach it. The card-form Alert master anchors 16px big_component/radius_xs — applies if ki-alert grows the icon-chip card form).
- `--ki-alert-success-bg`: color used by the alert component for success background (MarsUI Surface/success_base_em_alpha: tone-500 at 12% light / alpha dark — the Info-Note tint, replacing the opaque 50/950 slabs).
- `--ki-alert-success-border`: color used by the alert component for success border (MarsUI draws no tone border on any alert/note/toast surface).
- `--ki-alert-success-fg`: color used by the alert component for success foreground.
- `--ki-alert-text-gap`: dimension used by the alert component for the heading-to-message stack gap (MarsUI Text_wrap 4px, decoupled from the outer 12px card gap).
- `--ki-alert-warning-bg`: color used by the alert component for warning background (MarsUI Surface/warning_base_em_alpha: tone-500 at 12% light / alpha dark — the Info-Note tint, replacing the opaque 50/950 slabs).
- `--ki-alert-warning-border`: color used by the alert component for warning border (MarsUI draws no tone border on any alert/note/toast surface).
- `--ki-alert-warning-fg`: color used by the alert component for warning foreground (MarsUI brief §1 systematic em pattern: tone high-em text on tone base-em surface, matching the success/danger rows and the ki-badge tone matrix; AA 5.5:1).
- `--ki-effect-component-backdrop-blur`: MarsUI Blur/24 as the component glass backdrop. Components consume this semantic name for backdrop-filter: blur(...) — never the ki.blur primitive directly (primitive-css-consumption gate).
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with backdrop-filter blur(var(--ki-effect-component-backdrop-blur)).
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-outline-secondary-button-top`: semantic color for outline secondary button top.
- `--ki-surface-special-light-s0-dark-s2`: semantic color for surface special light s0 dark s2.
- `--ki-typography-family-body`: semantic font family for typography family body.
