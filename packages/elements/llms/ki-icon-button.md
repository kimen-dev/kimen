# ki-icon-button

> A token-styled, icon-only action button with native button semantics and a mandatory accessible name.

## When to use

a compact, widely understood action where space precludes a
visible label: toolbars, card and dialog corners (close), media transport,
data-row actions. Always supply `label`; usually pair with ki-tooltip for
sighted discoverability. Enable `toggle` for persistent actions such as
Bookmark. While the action it started is in progress, set `loading`.

## When not to use

whenever a visible label fits (use ki-button),
navigation (use a link), or form
submit/reset (ki-icon-button is not form-associated; use ki-button, whose
visible label communicates the consequence).

## Examples

The default slot holds exactly one decorative icon; the mandatory `label` is the accessible name — the slot never contributes to it:

```html
<ki-icon-button label="Close">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
</ki-icon-button>
```

Visual hierarchy comes from `variant` (default `secondary`). In the original momentary variants, `tone` (default `neutral`) carries semantic intent such as success or danger.

```html
<ki-icon-button variant="primary" label="Play">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
</ki-icon-button>
<ki-icon-button variant="ghost" tone="danger" label="Delete row">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" stroke="currentColor" stroke-width="2" fill="none" /></svg>
</ki-icon-button>
```

Add `toggle` for an action such as Bookmark that stays pressed until the next activation. `variant="outline"` uses an outline at rest and a fill when selected. Give the pressed version a decorative icon in the `selected` slot.

```html
<ki-icon-button toggle variant="outline" label="Bookmark">
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4z" stroke="currentColor" stroke-width="2" />
  </svg>
  <svg slot="selected" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
</ki-icon-button>
```

Enabled outline actions use `--ki-icon-button-outline-hover-bg`,
`--ki-icon-button-outline-hover-fg` and `--ki-icon-button-outline-hover-border` on hover.
Unselected filled and quiet toggles use `--ki-icon-button-toggle-unselected-hover-overlay`.
A selected toggle keeps its fill on hover. Use `--ki-icon-button-outline-selected-border`
to set the selected outline edge.

With an empty `selected` slot, the default inline SVG takes a `currentColor` fill while pressed. Let its paths inherit `fill`. Keep `label` the same in both states. Activating the control emits `ki-change` with `{ selected }`. Set the `selected` attribute for the initial state or write the property to update it silently.

Sizes run `xs` (24px, the WCAG 2.2 pointer-target floor) through `xl`,
with `md` as the default. The `--ki-icon-button-{size}-icon-size` token
sizes the box and any directly slotted `ki-icon` glyph in either icon slot,
including a glyph with an explicit `size`.

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

An icon button in the dialog footer can dismiss it by ID. The dialog must be
in the same document or shadow root as the icon button.

```html
<ki-icon-button slot="footer" label="Close details" commandfor="details" command="close">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
</ki-icon-button>
```

While the action it started is in progress, set `loading` instead of `disabled`: the icon button keeps its size, its focus and its `label`, ignores further activation, draws a spinner in place of the icon and announces `loading-label` (default "Loading") as a polite status message:

```html
<ki-icon-button label="Refresh" loading loading-label="Refreshing">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2" stroke="currentColor" stroke-width="2" fill="none" /></svg>
</ki-icon-button>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-icon-button`: the default, only the tokens ki-icon-button needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `command` ("close" | "request-close" | "show-modal" | undefined): Dialog action to run for `commandfor`. Use `show-modal` to open, `close` for direct dismissal, or `request-close` for guarded dismissal. Choose a command for local dialog control and omit it for other actions.
- `commandfor` (string | undefined): ID of a ki-dialog in the same document or shadow tree as this button. Set it together with `command` to connect a dialog declaratively.
- `disabled` (boolean, default false): Prevents activation, removes the icon button from keyboard reach, and exposes the unavailable state through the internal native button. Wins over `loading` when both are set. When NOT to use: do not use disabled for pending/loading semantics; use `loading`.
- `expanded` (boolean | undefined): Application-owned disclosure state for a trigger that opens a popup. The native icon button exposes this as `aria-expanded`. Use with `aria-haspopup="menu"` for a menu trigger. Omit for other actions.
- `label` (string, required): Accessible name of the internal focusable button ("Close", "Play"). Required in the catalog. When slotted as a trailing list control, the row text supplies a fallback through the host aria-label. Use ki-button when the action has a visible label.
- `loading` (boolean, default false): Pending state of the action this icon button started (refreshing, sending). While set, every activation is blocked (pointer, Enter and Space), but the icon button stays focusable, in the Tab order and at its size: the icon stays laid out, transparent, and a spinner is drawn in its place. The internal native button is exposed with `aria-disabled="true"` and keeps its `label`, and `loadingLabel` is announced as a polite status message. `disabled` wins over it. The application sets it when the action starts and clears it when the action ends. When to use: while the work a click on this icon button started is running, so a second activation cannot repeat it. When NOT to use: for an icon button the person cannot use yet (use `disabled`), or for the progress of a page or region (use ki-progress).
- `loading-label` (string, default 'Loading'): Text of the polite status message announced while `loading` is set. Override for localization; the default English string is the icon button's only built-in user-visible text. When to use: provide a localized message whenever the document language is not English, or a more specific one ("Refreshing"). When NOT to use: do not repeat `label` here; the person already hears it on focus.
- `pressed` (boolean | undefined): Application-owned toggle state. The native icon button exposes this as `aria-pressed` when `toggle` is off. Omit for a momentary action.
- `selected` (boolean, default false): Current press state in toggle mode. Set this to initialize or synchronize the state programmatically without emitting a change.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed square size. Every size keeps at least the 24×24 minimum pointer target (`xs` sits exactly on it); choose the size that matches the density of the surrounding UI. When NOT to use: do not shrink below `xs` through tokens; no theme may go under the WCAG 2.2 pointer-target floor.
- `toggle` (boolean, default false): Enables persistent press state for an action such as Bookmark. The native button exposes `aria-pressed` and each activation switches `selected`. Keep the same accessible label in both states.
- `tone` ("danger" | "neutral" | "success", default 'neutral'): Semantic intent for the action, independent of hierarchy. Use `success` for confirming actions and `danger` for destructive actions. Toggle palettes are specific to the variant. When NOT to use: do not use tone for visual hierarchy; use `variant`.
- `variant` ("ghost" | "outline" | "primary" | "quaternary" | "secondary" | "tertiary", default 'secondary'): Visual hierarchy for the action. Use filled `primary` for the single main action, outlined `secondary` for supporting actions, `quaternary` for neutral icon actions, `ghost` for accent icon actions and `outline` for an unfilled action with a visible boundary. When NOT to use: do not use variant to signal success or danger; use `tone` for intent.

## Slots

- (default): Exactly one decorative icon. The slot is presentational: its content is hidden from assistive technology and never contributes to the accessible name. Supply `label` or use a named trailing list control. Button tokens size ki-icon glyphs in both slots, overriding their size.
- `counter`: Decorative ki-counter in the block-start inline-end corner. Include its meaning in the button label.
- `selected`: Optional decorative icon shown when the toggle is selected. If omitted, the default icon stays visible and an inline SVG takes a current-colour fill.

## Parts

- `button`: Internal native button.
- `icon`: Icon wrapper around the default slot.
- `spinner`: Loading spinner drawn in place of the icon, in the button's foreground ink, rendered only while `loading` is in effect.

## Events

- `ki-change` (CustomEvent<{ selected: boolean }>): Emitted after toggle activation with the new selected state.

## Methods

None.

## Other CSS custom properties

- `--ki-button-backdrop-filter`: Complete backdrop filter for button and icon-button variants; none in onmars v2. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-button-border-width`: dimension used by the button component for border width (MarsUI outline stroke: 1px). Default: onmars `var(--ki-size-border-hairline)`, material3 `0.0625rem`.
- `--ki-button-focus-ring-color`: color used by the button component for focus ring color. Default: `var(--ki-focus-ring-color)`.
- `--ki-button-focus-ring-offset`: dimension used by the button component for focus ring offset. Default: `var(--ki-focus-ring-offset)`.
- `--ki-button-focus-ring-shadow`: shadow used by the button component for the focus ring glow (MarsUI Focus/primary: 3px spread ring). Default: `var(--ki-focus-primary)`.
- `--ki-button-focus-ring-width`: dimension used by the button component for focus ring width. Default: `var(--ki-focus-ring-width)`.
- `--ki-button-lg-radius`: dimension used by the button component for lg radius (Button master 8003:300 binds Radius/small-component/lg, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-lg)`, material3 `var(--ki-radius-round)`.
- `--ki-button-md-radius`: dimension used by the button component for md radius (Button master 8003:300 binds Radius/small-component/md, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-md)`, material3 `var(--ki-radius-round)`.
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-button-spinner-duration`: duration used by the button and icon button components for one turn of the loading spinner (spec 046 D5: the ki-progress indeterminate period). Applied only under prefers-reduced-motion: no-preference. Default: `1600ms`.
- `--ki-button-spinner-stroke-width`: dimension used by the button and icon button components for the loading spinner stroke (spec 046 D5: the circular ki-progress ring, drawn with a non-scaling stroke of this width). Default: `var(--ki-space-xxs)`.
- `--ki-button-toggle-quiet-bg`: Background of unselected ghost and quaternary toggle buttons. Default: `var(--ki-surface-transparent)`.
- `--ki-button-toggle-quiet-fg`: Foreground of unselected ghost toggle buttons. Default: `var(--ki-text-high-em)`.
- `--ki-button-toggle-unselected-bg`: Background of unselected filled toggle buttons. Default: `var(--ki-surface-s2)`.
- `--ki-button-toggle-unselected-fg`: Foreground of unselected filled toggle buttons. Default: `var(--ki-text-high-em)`.
- `--ki-button-xl-radius`: dimension used by the button component for xl radius (Button master 8003:300 binds Radius/small-component/xl, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xl)`, material3 `var(--ki-radius-round)`.
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-counter-ring-width`: Thickness of the separating ring. Default: `var(--ki-notification-marker-ring-width)`.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-effect-component-no-backdrop-filter`: An unadorned surface applies no backdrop filter. Default: `none`.
- `--ki-elevation-none`: Flat surfaces carry no resting shadow. Default: `0 0 #0000`.
- `--ki-icon-button-lg-icon-size`: dimension used by the icon button component for lg icon size (MarsUI Placeholder_lg 24px). Default: `var(--ki-space-7xl)`.
- `--ki-icon-button-lg-size`: dimension used by the icon button component for lg box (48px square). Default: `var(--ki-space-14xl)`.
- `--ki-icon-button-lg-spinner-size`: dimension used by the icon button component for the lg loading spinner box (24px, the lg icon size; spec 046 D5: the spinner takes the place of the icon). Default: `var(--ki-space-7xl)`.
- `--ki-icon-button-md-icon-size`: dimension used by the icon button component for md icon size (MarsUI Placeholder_md 20px — the button md icon is 18px, 002 §3). Default: `var(--ki-space-5xl)`.
- `--ki-icon-button-md-size`: dimension used by the icon button component for md box (40px square, Figma node 10078:3129). Default: `var(--ki-space-12xl)`.
- `--ki-icon-button-md-spinner-size`: dimension used by the icon button component for the md loading spinner box (20px, the md icon size; spec 046 D5: the spinner takes the place of the icon). Default: `var(--ki-space-5xl)`.
- `--ki-icon-button-sm-icon-size`: dimension used by the icon button component for sm icon size (MarsUI Placeholder_sm 18px). Default: `var(--ki-space-4xl)`.
- `--ki-icon-button-sm-size`: dimension used by the icon button component for sm box (32px square). Default: `var(--ki-space-10xl)`.
- `--ki-icon-button-sm-spinner-size`: dimension used by the icon button component for the sm loading spinner box (18px, the sm icon size; spec 046 D5: the spinner takes the place of the icon). Default: `var(--ki-space-4xl)`.
- `--ki-icon-button-toggle-radius`: Round shape for an unselected icon toggle button. Default: `var(--ki-radius-round)`.
- `--ki-icon-button-toggle-selected-radius`: Rounded square shape for a selected icon toggle button. Default: `var(--ki-radius-component-md)`.
- `--ki-icon-button-toggle-unselected-hover-overlay`: Hover wash for unselected filled and quiet toggles. Default: `var(--ki-surface-hover-overlay-inverse)`.
- `--ki-icon-button-xl-icon-size`: dimension used by the icon button component for xl icon size (MarsUI Placeholder_xl 28px). Default: `var(--ki-space-9xl)`.
- `--ki-icon-button-xl-size`: dimension used by the icon button component for xl box (56px square). Default: `var(--ki-space-16xl)`.
- `--ki-icon-button-xl-spinner-size`: dimension used by the icon button component for the xl loading spinner box (28px, the xl icon size; spec 046 D5: the spinner takes the place of the icon). Default: `var(--ki-space-9xl)`.
- `--ki-icon-button-xs-icon-size`: dimension used by the icon button component for xs icon size (MarsUI Icon/Placeholder_xs 16px — one step above the button xs icon). Default: `var(--ki-space-3xl)`.
- `--ki-icon-button-xs-size`: dimension used by the icon button component for xs box (24px square, Figma Space/7xl). Default: `var(--ki-space-7xl)`.
- `--ki-icon-button-xs-spinner-size`: dimension used by the icon button component for the xs loading spinner box (16px, the xs icon size; spec 046 D5: the spinner takes the place of the icon). Default: `var(--ki-space-3xl)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-outline-none`: semantic color for outline none. Default: `light-dark(var(--ki-color-transparent-white),var(--ki-color-transparent-black))`.
- `--ki-surface-image-none`: An unadorned surface has no background image. Default: `none`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ghost | — | rest | `--ki-button-ghost-rest-shadow` | `none` | value used by the button component for ghost rest shadow. |
| ghost | — | active | `--ki-button-ghost-active-shadow` | `none` | Shadow of a pressed ghost button. |
| ghost | — | disabled | `--ki-button-ghost-disabled-shadow` | `none` | value used by the button component for ghost disabled shadow. |
| ghost | — | hover | `--ki-button-ghost-hover-shadow` | `none` | value used by the button component for ghost hover shadow. |
| ghost | — | selected | `--ki-icon-button-ghost-selected-bg` | onmars `var(--ki-text-primary-high-em)`, material3 `var(--ki-surface-primary-high-em)` | Background of the selected ghost icon button toggle. |
| ghost | — | selected | `--ki-icon-button-ghost-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected ghost icon button toggle. |
| ghost | danger | rest | `--ki-button-ghost-danger-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost danger rest background. |
| ghost | danger | rest | `--ki-button-ghost-danger-rest-border` | `var(--ki-outline-none)` | color used by the button component for ghost danger rest border. |
| ghost | danger | rest | `--ki-button-ghost-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for ghost danger rest foreground. |
| ghost | danger | active | `--ki-button-ghost-danger-active-bg` | `var(--ki-surface-danger-low-em)` | Fill of a pressed ghost danger button. |
| ghost | danger | active | `--ki-button-ghost-danger-active-border` | `var(--ki-outline-none)` | Edge of a pressed ghost danger button. |
| ghost | danger | active | `--ki-button-ghost-danger-active-fg` | `var(--ki-text-danger-high-em)` | Ink of a pressed ghost danger button. |
| ghost | danger | disabled | `--ki-button-ghost-danger-disabled-bg` | `var(--ki-transparent-inverse)` | Fill of a disabled ghost danger button. |
| ghost | danger | disabled | `--ki-button-ghost-danger-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled ghost danger button. |
| ghost | danger | disabled | `--ki-button-ghost-danger-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled ghost danger button. |
| ghost | danger | hover | `--ki-button-ghost-danger-hover-bg` | `var(--ki-surface-danger-base-em-alpha)` | color used by the button component for ghost danger hover background. |
| ghost | danger | hover | `--ki-button-ghost-danger-hover-border` | `var(--ki-outline-none)` | color used by the button component for ghost danger hover border. |
| ghost | danger | hover | `--ki-button-ghost-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for ghost danger hover foreground. |
| ghost | neutral | rest | `--ki-button-ghost-neutral-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost neutral rest background. |
| ghost | neutral | rest | `--ki-button-ghost-neutral-rest-border` | `var(--ki-outline-none)` | color used by the button component for ghost neutral rest border. |
| ghost | neutral | rest | `--ki-button-ghost-neutral-rest-fg` | `var(--ki-text-primary-high-em)` | color used by the button component for ghost neutral rest foreground. |
| ghost | neutral | active | `--ki-button-ghost-neutral-active-bg` | `var(--ki-surface-primary-low-em)` | Fill of a pressed ghost neutral button. |
| ghost | neutral | active | `--ki-button-ghost-neutral-active-border` | `var(--ki-outline-none)` | Edge of a pressed ghost neutral button. |
| ghost | neutral | active | `--ki-button-ghost-neutral-active-fg` | `var(--ki-text-primary-high-em)` | Ink of a pressed ghost neutral button. |
| ghost | neutral | disabled | `--ki-button-ghost-neutral-disabled-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost neutral disabled background. |
| ghost | neutral | disabled | `--ki-button-ghost-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for ghost neutral disabled border. |
| ghost | neutral | disabled | `--ki-button-ghost-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for ghost neutral disabled foreground. |
| ghost | neutral | hover | `--ki-button-ghost-neutral-hover-bg` | `var(--ki-surface-primary-base-em-alpha)` | color used by the button component for ghost neutral hover background. |
| ghost | neutral | hover | `--ki-button-ghost-neutral-hover-border` | `var(--ki-outline-none)` | color used by the button component for ghost neutral hover border. |
| ghost | neutral | hover | `--ki-button-ghost-neutral-hover-fg` | `var(--ki-text-primary-high-em)` | color used by the button component for ghost neutral hover foreground. |
| ghost | success | rest | `--ki-button-ghost-success-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost success rest background. |
| ghost | success | rest | `--ki-button-ghost-success-rest-border` | `var(--ki-outline-none)` | color used by the button component for ghost success rest border. |
| ghost | success | rest | `--ki-button-ghost-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for ghost success rest foreground. |
| ghost | success | active | `--ki-button-ghost-success-active-bg` | `var(--ki-surface-success-low-em)` | Fill of a pressed ghost success button. |
| ghost | success | active | `--ki-button-ghost-success-active-border` | `var(--ki-outline-none)` | Edge of a pressed ghost success button. |
| ghost | success | active | `--ki-button-ghost-success-active-fg` | `var(--ki-text-success-high-em)` | Ink of a pressed ghost success button. |
| ghost | success | disabled | `--ki-button-ghost-success-disabled-bg` | `var(--ki-transparent-inverse)` | Fill of a disabled ghost success button. |
| ghost | success | disabled | `--ki-button-ghost-success-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled ghost success button. |
| ghost | success | disabled | `--ki-button-ghost-success-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled ghost success button. |
| ghost | success | hover | `--ki-button-ghost-success-hover-bg` | `var(--ki-surface-success-base-em-alpha)` | color used by the button component for ghost success hover background. |
| ghost | success | hover | `--ki-button-ghost-success-hover-border` | `var(--ki-outline-none)` | color used by the button component for ghost success hover border. |
| ghost | success | hover | `--ki-button-ghost-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for ghost success hover foreground. |
| outline | — | rest | `--ki-icon-button-outline-rest-bg` | `var(--ki-surface-transparent)` | Background of the outline variant at rest. |
| outline | — | rest | `--ki-icon-button-outline-rest-border` | `var(--ki-outline-control)` | Visible outline of the outline variant at rest. |
| outline | — | rest | `--ki-icon-button-outline-rest-fg` | `var(--ki-text-high-em)` | Foreground of the outline variant at rest. |
| outline | — | hover | `--ki-icon-button-outline-hover-bg` | onmars `var(--ki-surface-s1)`, material3 `var(--ki-surface-s2)` | Background of the hovered outline variant. |
| outline | — | hover | `--ki-icon-button-outline-hover-border` | `var(--ki-outline-control-hover)` | Border of the hovered outline variant. |
| outline | — | hover | `--ki-icon-button-outline-hover-fg` | `var(--ki-text-high-em)` | Ink of the hovered outline variant. |
| outline | — | selected | `--ki-icon-button-outline-selected-bg` | `var(--ki-surface-inverse-white)` | Background of the selected outline icon button toggle. |
| outline | — | selected | `--ki-icon-button-outline-selected-border` | `var(--ki-outline-none)` | Border of the selected outline toggle. |
| outline | — | selected | `--ki-icon-button-outline-selected-fg` | `var(--ki-text-inverse-black)` | Foreground of the selected outline icon button toggle. |
| primary | — | rest | `--ki-button-primary-rest-border-bottom` | onmars `var(--ki-outline-primary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the primary bottom edge (MarsUI Outline/primary_button_bottom; none in onmars v2). |
| primary | — | rest | `--ki-button-primary-rest-shadow` | `var(--ki-effect-component-primary-default-shadow)` | shadow used by the button component for button primary rest shadow (MarsUI Component_effect/primary_default). |
| primary | — | active | `--ki-button-primary-active-overlay` | `var(--ki-state-layer-pressed)` | Pressed state layer for the primary button: primary paints on a dark brand fill, so its wash lightens: the next rung above ki.surface.hover-overlay (White/5 -> White/8 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first. |
| primary | — | active | `--ki-button-primary-active-shadow` | `var(--ki-effect-component-primary-default-shadow)` | Shadow of a pressed primary button. |
| primary | — | disabled | `--ki-button-primary-disabled-shadow` | `none` | value used by the button component for primary disabled shadow. |
| primary | — | hover | `--ki-button-primary-hover-overlay` | onmars `var(--ki-surface-hover-overlay)`, material3 `var(--ki-state-layer-hover)` | color used by the button component for the primary hover overlay layer (MarsUI hover overlay, White/5). |
| primary | — | hover | `--ki-button-primary-hover-shadow` | `var(--ki-effect-component-primary-hover-shadow)` | shadow used by the button component for button primary hover shadow (MarsUI Component_effect/primary_hover). |
| primary | — | selected | `--ki-icon-button-primary-selected-bg` | `var(--ki-surface-primary-med-em)` | Background of the selected primary icon button toggle. |
| primary | — | selected | `--ki-icon-button-primary-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected primary icon button toggle. |
| primary | danger | rest | `--ki-button-primary-danger-rest-bg` | `var(--ki-surface-danger-high-em)` | color used by the button component for primary danger rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/danger_med_em #f05149) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification). |
| primary | danger | rest | `--ki-button-primary-danger-rest-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary danger rest border (MarsUI top/inline edge; none in onmars v2). |
| primary | danger | rest | `--ki-button-primary-danger-rest-fg` | `var(--ki-text-primary-on-danger)` | color used by the button component for primary danger rest foreground. |
| primary | danger | active | `--ki-button-primary-danger-active-bg` | `var(--ki-surface-danger-high-em)` | Fill of a pressed primary danger button. |
| primary | danger | active | `--ki-button-primary-danger-active-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed primary danger button. |
| primary | danger | active | `--ki-button-primary-danger-active-fg` | `var(--ki-text-primary-on-danger)` | Ink of a pressed primary danger button. |
| primary | danger | disabled | `--ki-button-primary-danger-disabled-bg` | `var(--ki-surface-disabled-low-em)` | Fill of a disabled primary danger button. |
| primary | danger | disabled | `--ki-button-primary-danger-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled primary danger button. |
| primary | danger | disabled | `--ki-button-primary-danger-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled primary danger button. |
| primary | danger | hover | `--ki-button-primary-danger-hover-bg` | `var(--ki-surface-danger-high-em)` | color used by the button component for primary danger hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). |
| primary | danger | hover | `--ki-button-primary-danger-hover-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary danger hover border (MarsUI top/inline edge; none in onmars v2). |
| primary | danger | hover | `--ki-button-primary-danger-hover-fg` | `var(--ki-text-primary-on-danger)` | color used by the button component for primary danger hover foreground. |
| primary | neutral | rest | `--ki-button-primary-neutral-rest-bg` | `var(--ki-surface-primary-med-em)` | color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500). |
| primary | neutral | rest | `--ki-button-primary-neutral-rest-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary neutral rest border (MarsUI top/inline edge; none in onmars v2). |
| primary | neutral | rest | `--ki-button-primary-neutral-rest-fg` | `var(--ki-text-primary-on-primary)` | color used by the button component for primary neutral rest foreground. |
| primary | neutral | active | `--ki-button-primary-neutral-active-bg` | `var(--ki-surface-primary-med-em)` | Fill of a pressed primary neutral button. |
| primary | neutral | active | `--ki-button-primary-neutral-active-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed primary neutral button. |
| primary | neutral | active | `--ki-button-primary-neutral-active-fg` | `var(--ki-text-primary-on-primary)` | Ink of a pressed primary neutral button. |
| primary | neutral | disabled | `--ki-button-primary-neutral-disabled-bg` | `var(--ki-surface-disabled-low-em)` | color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification). |
| primary | neutral | disabled | `--ki-button-primary-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for primary neutral disabled border. |
| primary | neutral | disabled | `--ki-button-primary-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification). |
| primary | neutral | hover | `--ki-button-primary-neutral-hover-bg` | onmars `var(--ki-surface-primary-med-em-hover)`, material3 `var(--ki-surface-primary-med-em)` | color used by the button component for primary neutral hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). |
| primary | neutral | hover | `--ki-button-primary-neutral-hover-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary neutral hover border (MarsUI top/inline edge; none in onmars v2). |
| primary | neutral | hover | `--ki-button-primary-neutral-hover-fg` | `var(--ki-text-primary-on-primary)` | color used by the button component for primary neutral hover foreground. |
| primary | success | rest | `--ki-button-primary-success-rest-bg` | `var(--ki-surface-success-high-em)` | color used by the button component for primary success rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/success_med_em #409b3f) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification). |
| primary | success | rest | `--ki-button-primary-success-rest-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary success rest border (MarsUI top/inline edge; none in onmars v2). |
| primary | success | rest | `--ki-button-primary-success-rest-fg` | `var(--ki-text-primary-on-success)` | color used by the button component for primary success rest foreground. |
| primary | success | active | `--ki-button-primary-success-active-bg` | `var(--ki-surface-success-high-em)` | Fill of a pressed primary success button. |
| primary | success | active | `--ki-button-primary-success-active-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed primary success button. |
| primary | success | active | `--ki-button-primary-success-active-fg` | `var(--ki-text-primary-on-success)` | Ink of a pressed primary success button. |
| primary | success | disabled | `--ki-button-primary-success-disabled-bg` | `var(--ki-surface-disabled-low-em)` | Fill of a disabled primary success button. |
| primary | success | disabled | `--ki-button-primary-success-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled primary success button. |
| primary | success | disabled | `--ki-button-primary-success-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled primary success button. |
| primary | success | hover | `--ki-button-primary-success-hover-bg` | `var(--ki-surface-success-high-em)` | color used by the button component for primary success hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). |
| primary | success | hover | `--ki-button-primary-success-hover-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary success hover border (MarsUI top/inline edge; none in onmars v2). |
| primary | success | hover | `--ki-button-primary-success-hover-fg` | `var(--ki-text-primary-on-success)` | color used by the button component for primary success hover foreground. |
| quaternary | — | rest | `--ki-button-quaternary-rest-shadow` | `none` | value used by the button component for quaternary rest shadow. |
| quaternary | — | active | `--ki-button-quaternary-active-shadow` | `none` | Shadow of a pressed quaternary button. |
| quaternary | — | disabled | `--ki-button-quaternary-disabled-shadow` | `none` | value used by the button component for quaternary disabled shadow. |
| quaternary | — | hover | `--ki-button-quaternary-hover-shadow` | `none` | value used by the button component for quaternary hover shadow. |
| quaternary | — | selected | `--ki-icon-button-quaternary-selected-bg` | `var(--ki-surface-primary-high-em)` | Background of the selected quaternary icon button toggle. |
| quaternary | — | selected | `--ki-icon-button-quaternary-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected quaternary icon button toggle. |
| quaternary | danger | rest | `--ki-button-quaternary-danger-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary danger rest background. |
| quaternary | danger | rest | `--ki-button-quaternary-danger-rest-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-med-em)` | color used by the button component for quaternary danger rest border (MarsUI quaternary is borderless in every state). |
| quaternary | danger | rest | `--ki-button-quaternary-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for quaternary danger rest foreground. |
| quaternary | danger | active | `--ki-button-quaternary-danger-active-bg` | `var(--ki-surface-danger-low-em)` | Fill of a pressed quaternary danger button. |
| quaternary | danger | active | `--ki-button-quaternary-danger-active-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-high-em)` | Edge of a pressed quaternary danger button. |
| quaternary | danger | active | `--ki-button-quaternary-danger-active-fg` | `var(--ki-text-danger-high-em)` | Ink of a pressed quaternary danger button. |
| quaternary | danger | disabled | `--ki-button-quaternary-danger-disabled-bg` | `var(--ki-transparent-inverse)` | Fill of a disabled quaternary danger button. |
| quaternary | danger | disabled | `--ki-button-quaternary-danger-disabled-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-low-em)` | Edge of a disabled quaternary danger button. |
| quaternary | danger | disabled | `--ki-button-quaternary-danger-disabled-fg` | `var(--ki-button-quaternary-neutral-disabled-fg)` | Ink of a disabled quaternary danger button. |
| quaternary | danger | hover | `--ki-button-quaternary-danger-hover-bg` | `var(--ki-surface-danger-base-em-alpha)` | color used by the button component for quaternary danger hover background. |
| quaternary | danger | hover | `--ki-button-quaternary-danger-hover-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-high-em)` | color used by the button component for quaternary danger hover border (MarsUI quaternary is borderless in every state). |
| quaternary | danger | hover | `--ki-button-quaternary-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for quaternary danger hover foreground. |
| quaternary | neutral | rest | `--ki-button-quaternary-neutral-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary neutral rest background. |
| quaternary | neutral | rest | `--ki-button-quaternary-neutral-rest-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-med-em)` | color used by the button component for quaternary neutral rest border (MarsUI quaternary is borderless in every state). |
| quaternary | neutral | rest | `--ki-button-quaternary-neutral-rest-fg` | onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)` | color used by the button component for quaternary neutral rest foreground (MarsUI quaternary label text/med_em gray; never the accent). |
| quaternary | neutral | active | `--ki-button-quaternary-neutral-active-bg` | onmars `var(--ki-surface-pressed-overlay-inverse)`, material3 `var(--ki-surface-primary-low-em)` | Fill of a pressed quaternary neutral button. |
| quaternary | neutral | active | `--ki-button-quaternary-neutral-active-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-high-em)` | Edge of a pressed quaternary neutral button. |
| quaternary | neutral | active | `--ki-button-quaternary-neutral-active-fg` | onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)` | Ink of a pressed quaternary neutral button. |
| quaternary | neutral | disabled | `--ki-button-quaternary-neutral-disabled-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary neutral disabled background. |
| quaternary | neutral | disabled | `--ki-button-quaternary-neutral-disabled-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-low-em)` | color used by the button component for quaternary neutral disabled border (MarsUI quaternary is borderless in every state). |
| quaternary | neutral | disabled | `--ki-button-quaternary-neutral-disabled-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-text-muted)` | color used by the button component for quaternary neutral disabled foreground: the disabled ink of every field and selection control (Text/base_em). quaternary has no fill or border, so its ink alone shows the state; ki.text.muted equals its resting ki.text.med-em in onmars. |
| quaternary | neutral | hover | `--ki-button-quaternary-neutral-hover-bg` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-surface-primary-base-em-alpha)` | color used by the button component for quaternary neutral hover background (MarsUI hover mechanism: hover-overlay-inverse Black/3 wash over the transparent rest fill). |
| quaternary | neutral | hover | `--ki-button-quaternary-neutral-hover-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-high-em)` | color used by the button component for quaternary neutral hover border (MarsUI quaternary is borderless in every state). |
| quaternary | neutral | hover | `--ki-button-quaternary-neutral-hover-fg` | onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)` | color used by the button component for quaternary neutral hover foreground (MarsUI quaternary label text/med_em gray; never the accent). |
| quaternary | success | rest | `--ki-button-quaternary-success-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary success rest background. |
| quaternary | success | rest | `--ki-button-quaternary-success-rest-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-med-em)` | color used by the button component for quaternary success rest border (MarsUI quaternary is borderless in every state). |
| quaternary | success | rest | `--ki-button-quaternary-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for quaternary success rest foreground. |
| quaternary | success | active | `--ki-button-quaternary-success-active-bg` | `var(--ki-surface-success-low-em)` | Fill of a pressed quaternary success button. |
| quaternary | success | active | `--ki-button-quaternary-success-active-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-high-em)` | Edge of a pressed quaternary success button. |
| quaternary | success | active | `--ki-button-quaternary-success-active-fg` | `var(--ki-text-success-high-em)` | Ink of a pressed quaternary success button. |
| quaternary | success | disabled | `--ki-button-quaternary-success-disabled-bg` | `var(--ki-transparent-inverse)` | Fill of a disabled quaternary success button. |
| quaternary | success | disabled | `--ki-button-quaternary-success-disabled-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-low-em)` | Edge of a disabled quaternary success button. |
| quaternary | success | disabled | `--ki-button-quaternary-success-disabled-fg` | `var(--ki-button-quaternary-neutral-disabled-fg)` | Ink of a disabled quaternary success button. |
| quaternary | success | hover | `--ki-button-quaternary-success-hover-bg` | `var(--ki-surface-success-base-em-alpha)` | color used by the button component for quaternary success hover background. |
| quaternary | success | hover | `--ki-button-quaternary-success-hover-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-high-em)` | color used by the button component for quaternary success hover border (MarsUI quaternary is borderless in every state). |
| quaternary | success | hover | `--ki-button-quaternary-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for quaternary success hover foreground. |
| secondary | — | rest | `--ki-button-secondary-rest-border-bottom` | onmars `var(--ki-outline-secondary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the secondary bottom edge (MarsUI Outline/secondary_button_bottom). |
| secondary | — | rest | `--ki-button-secondary-rest-shadow` | `var(--ki-effect-component-secondary-default-shadow)` | shadow used by the button component for secondary rest shadow (MarsUI Component_effect/secondary_default). |
| secondary | — | active | `--ki-button-secondary-active-overlay` | onmars `var(--ki-surface-pressed-overlay-inverse)`, material3 `var(--ki-state-layer-pressed)` | Pressed state layer for the secondary button: secondary paints on a light fill, so its wash darkens: the next rung above ki.surface.hover-overlay-inverse (Black/3 -> Black/5 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first. |
| secondary | — | active | `--ki-button-secondary-active-shadow` | `var(--ki-effect-component-secondary-default-shadow)` | Shadow of a pressed secondary button. |
| secondary | — | disabled | `--ki-button-secondary-disabled-shadow` | `none` | value used by the button component for secondary disabled shadow. |
| secondary | — | hover | `--ki-button-secondary-hover-overlay` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-state-layer-hover)` | color used by the button component for the secondary hover overlay layer (MarsUI hover overlay inverse, Black/3). |
| secondary | — | hover | `--ki-button-secondary-hover-shadow` | `var(--ki-effect-component-secondary-hover-shadow)` | shadow used by the button component for secondary hover shadow (MarsUI Component_effect/secondary_hover). |
| secondary | — | selected | `--ki-icon-button-secondary-selected-bg` | `var(--ki-surface-secondary-med-em)` | Background of the selected secondary icon button toggle. |
| secondary | — | selected | `--ki-icon-button-secondary-selected-fg` | `var(--ki-text-primary-on-secondary)` | Foreground of the selected secondary icon button toggle. |
| secondary | danger | rest | `--ki-button-secondary-danger-rest-bg` | `var(--ki-surface-danger-base-em)` | color used by the button component for secondary danger rest background. |
| secondary | danger | rest | `--ki-button-secondary-danger-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary danger rest border (MarsUI top/inline edge, variant trait). |
| secondary | danger | rest | `--ki-button-secondary-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for secondary danger rest foreground. |
| secondary | danger | active | `--ki-button-secondary-danger-active-bg` | `var(--ki-surface-danger-low-em)` | Fill of a pressed secondary danger button. |
| secondary | danger | active | `--ki-button-secondary-danger-active-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed secondary danger button. |
| secondary | danger | active | `--ki-button-secondary-danger-active-fg` | `var(--ki-text-danger-high-em)` | Ink of a pressed secondary danger button. |
| secondary | danger | disabled | `--ki-button-secondary-danger-disabled-bg` | `var(--ki-surface-disabled-low-em)` | Fill of a disabled secondary danger button. |
| secondary | danger | disabled | `--ki-button-secondary-danger-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled secondary danger button. |
| secondary | danger | disabled | `--ki-button-secondary-danger-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled secondary danger button. |
| secondary | danger | hover | `--ki-button-secondary-danger-hover-bg` | `var(--ki-surface-danger-low-em)` | color used by the button component for secondary danger hover background. |
| secondary | danger | hover | `--ki-button-secondary-danger-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary danger hover border (MarsUI top/inline edge, variant trait). |
| secondary | danger | hover | `--ki-button-secondary-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for secondary danger hover foreground. |
| secondary | neutral | rest | `--ki-button-secondary-neutral-rest-bg` | `var(--ki-surface-special-secondary-alpha-base)` | color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: neutral, not a brand tint; white in onmars v2). |
| secondary | neutral | rest | `--ki-button-secondary-neutral-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary neutral rest border (MarsUI top/inline edge). |
| secondary | neutral | rest | `--ki-button-secondary-neutral-rest-fg` | `var(--ki-text-high-em)` | color used by the button component for secondary neutral rest foreground (MarsUI text/high_em). |
| secondary | neutral | active | `--ki-button-secondary-neutral-active-bg` | `var(--ki-surface-special-secondary-alpha-base)` | Fill of a pressed secondary neutral button. |
| secondary | neutral | active | `--ki-button-secondary-neutral-active-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed secondary neutral button. |
| secondary | neutral | active | `--ki-button-secondary-neutral-active-fg` | `var(--ki-text-high-em)` | Ink of a pressed secondary neutral button. |
| secondary | neutral | disabled | `--ki-button-secondary-neutral-disabled-bg` | `var(--ki-surface-disabled-low-em)` | color used by the button component for secondary neutral disabled background. |
| secondary | neutral | disabled | `--ki-button-secondary-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for secondary neutral disabled border. |
| secondary | neutral | disabled | `--ki-button-secondary-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for secondary neutral disabled foreground. |
| secondary | neutral | hover | `--ki-button-secondary-neutral-hover-bg` | onmars `var(--ki-surface-special-light-s2-dark-s3)`, material3 `var(--ki-surface-special-secondary-alpha-base)` | color used by the button component for secondary neutral hover background (MarsUI: rest fill; hover darkening comes from the hover overlay). |
| secondary | neutral | hover | `--ki-button-secondary-neutral-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary neutral hover border (MarsUI top/inline edge). |
| secondary | neutral | hover | `--ki-button-secondary-neutral-hover-fg` | `var(--ki-text-high-em)` | color used by the button component for secondary neutral hover foreground (MarsUI text/high_em). |
| secondary | success | rest | `--ki-button-secondary-success-rest-bg` | `var(--ki-surface-success-base-em)` | color used by the button component for secondary success rest background. |
| secondary | success | rest | `--ki-button-secondary-success-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary success rest border (MarsUI top/inline edge, variant trait). |
| secondary | success | rest | `--ki-button-secondary-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for secondary success rest foreground. |
| secondary | success | active | `--ki-button-secondary-success-active-bg` | `var(--ki-surface-success-low-em)` | Fill of a pressed secondary success button. |
| secondary | success | active | `--ki-button-secondary-success-active-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed secondary success button. |
| secondary | success | active | `--ki-button-secondary-success-active-fg` | `var(--ki-text-success-high-em)` | Ink of a pressed secondary success button. |
| secondary | success | disabled | `--ki-button-secondary-success-disabled-bg` | `var(--ki-surface-disabled-low-em)` | Fill of a disabled secondary success button. |
| secondary | success | disabled | `--ki-button-secondary-success-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled secondary success button. |
| secondary | success | disabled | `--ki-button-secondary-success-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled secondary success button. |
| secondary | success | hover | `--ki-button-secondary-success-hover-bg` | `var(--ki-surface-success-low-em)` | color used by the button component for secondary success hover background. |
| secondary | success | hover | `--ki-button-secondary-success-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary success hover border (MarsUI top/inline edge, variant trait). |
| secondary | success | hover | `--ki-button-secondary-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for secondary success hover foreground. |
| tertiary | — | rest | `--ki-button-tertiary-rest-border-bottom` | onmars `var(--ki-outline-secondary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the tertiary bottom edge (MarsUI Outline/secondary_button_bottom, as secondary). |
| tertiary | — | rest | `--ki-button-tertiary-rest-shadow` | onmars `var(--ki-effect-component-secondary-default-shadow)`, material3 `0px 1px 2px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 2px 6px 2px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))` | shadow used by the button component for tertiary rest shadow (MarsUI Component_effect/secondary_default — replaces the migrated M2-era stack, which the material3 theme keeps via its own override). |
| tertiary | — | active | `--ki-button-tertiary-active-shadow` | onmars `var(--ki-effect-component-secondary-default-shadow)`, material3 `0px 1px 2px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 2px 6px 2px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))` | Shadow of a pressed tertiary button. |
| tertiary | — | disabled | `--ki-button-tertiary-disabled-shadow` | `none` | value used by the button component for tertiary disabled shadow. |
| tertiary | — | hover | `--ki-button-tertiary-hover-overlay` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-transparent-inverse)` | Hover overlay for neutral tertiary buttons, shared with secondary by default. |
| tertiary | — | hover | `--ki-button-tertiary-hover-shadow` | onmars `var(--ki-effect-component-secondary-hover-shadow)`, material3 `0px 1px 3px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 4px 8px 3px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))` | shadow used by the button component for tertiary hover shadow (MarsUI Component_effect/secondary_hover). |
| tertiary | danger | rest | `--ki-button-tertiary-danger-rest-bg` | onmars `var(--ki-surface-danger-base-em)`, material3 `var(--ki-surface-s0)` | Tertiary alias of the secondary danger rest background. |
| tertiary | danger | rest | `--ki-button-tertiary-danger-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary danger rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | danger | rest | `--ki-button-tertiary-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for tertiary danger rest foreground. |
| tertiary | danger | active | `--ki-button-tertiary-danger-active-bg` | onmars `var(--ki-surface-danger-low-em)`, material3 `var(--ki-surface-s2)` | Fill of a pressed tertiary danger button. |
| tertiary | danger | active | `--ki-button-tertiary-danger-active-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed tertiary danger button. |
| tertiary | danger | active | `--ki-button-tertiary-danger-active-fg` | `var(--ki-text-danger-high-em)` | Ink of a pressed tertiary danger button. |
| tertiary | danger | disabled | `--ki-button-tertiary-danger-disabled-bg` | `var(--ki-surface-disabled-low-em)` | Fill of a disabled tertiary danger button. |
| tertiary | danger | disabled | `--ki-button-tertiary-danger-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled tertiary danger button. |
| tertiary | danger | disabled | `--ki-button-tertiary-danger-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled tertiary danger button. |
| tertiary | danger | hover | `--ki-button-tertiary-danger-hover-bg` | onmars `var(--ki-surface-danger-low-em)`, material3 `var(--ki-surface-s1)` | Tertiary alias of the secondary danger hover background. |
| tertiary | danger | hover | `--ki-button-tertiary-danger-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary danger hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | danger | hover | `--ki-button-tertiary-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for tertiary danger hover foreground. |
| tertiary | neutral | rest | `--ki-button-tertiary-neutral-rest-bg` | onmars `var(--ki-surface-special-secondary-alpha-base)`, material3 `var(--ki-surface-s0)` | Tertiary alias of the secondary neutral rest background. |
| tertiary | neutral | rest | `--ki-button-tertiary-neutral-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary neutral rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | neutral | rest | `--ki-button-tertiary-neutral-rest-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | Tertiary alias of the secondary neutral rest foreground. |
| tertiary | neutral | active | `--ki-button-tertiary-neutral-active-bg` | onmars `var(--ki-surface-special-secondary-alpha-base)`, material3 `var(--ki-surface-s2)` | Fill of a pressed tertiary neutral button. |
| tertiary | neutral | active | `--ki-button-tertiary-neutral-active-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed tertiary neutral button. |
| tertiary | neutral | active | `--ki-button-tertiary-neutral-active-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | Ink of a pressed tertiary neutral button. |
| tertiary | neutral | disabled | `--ki-button-tertiary-neutral-disabled-bg` | `var(--ki-surface-disabled-low-em)` | color used by the button component for tertiary neutral disabled background. |
| tertiary | neutral | disabled | `--ki-button-tertiary-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for tertiary neutral disabled border. |
| tertiary | neutral | disabled | `--ki-button-tertiary-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for tertiary neutral disabled foreground. |
| tertiary | neutral | hover | `--ki-button-tertiary-neutral-hover-bg` | onmars `var(--ki-surface-special-light-s2-dark-s3)`, material3 `var(--ki-surface-s1)` | Tertiary alias of the secondary neutral hover background. |
| tertiary | neutral | hover | `--ki-button-tertiary-neutral-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary neutral hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | neutral | hover | `--ki-button-tertiary-neutral-hover-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | Tertiary alias of the secondary neutral hover foreground. |
| tertiary | success | rest | `--ki-button-tertiary-success-rest-bg` | onmars `var(--ki-surface-success-base-em)`, material3 `var(--ki-surface-s0)` | Tertiary alias of the secondary success rest background. |
| tertiary | success | rest | `--ki-button-tertiary-success-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary success rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | success | rest | `--ki-button-tertiary-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for tertiary success rest foreground. |
| tertiary | success | active | `--ki-button-tertiary-success-active-bg` | onmars `var(--ki-surface-success-low-em)`, material3 `var(--ki-surface-s2)` | Fill of a pressed tertiary success button. |
| tertiary | success | active | `--ki-button-tertiary-success-active-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | Edge of a pressed tertiary success button. |
| tertiary | success | active | `--ki-button-tertiary-success-active-fg` | `var(--ki-text-success-high-em)` | Ink of a pressed tertiary success button. |
| tertiary | success | disabled | `--ki-button-tertiary-success-disabled-bg` | `var(--ki-surface-disabled-low-em)` | Fill of a disabled tertiary success button. |
| tertiary | success | disabled | `--ki-button-tertiary-success-disabled-border` | `var(--ki-outline-none)` | Edge of a disabled tertiary success button. |
| tertiary | success | disabled | `--ki-button-tertiary-success-disabled-fg` | `var(--ki-text-muted)` | Ink of a disabled tertiary success button. |
| tertiary | success | hover | `--ki-button-tertiary-success-hover-bg` | onmars `var(--ki-surface-success-low-em)`, material3 `var(--ki-surface-s1)` | Tertiary alias of the secondary success hover background. |
| tertiary | success | hover | `--ki-button-tertiary-success-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary success hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | success | hover | `--ki-button-tertiary-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for tertiary success hover foreground. |
