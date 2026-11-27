# ki-copy-button

> Copies text to the clipboard and confirms the result in the same button.

## When to use

let a person copy a link, identifier, token or code sample. Supply
a direct value or point to a source in the same document or shadow root.

## When not to use

submit a form, navigate, or trigger an action with no clipboard
write. Use a button or link for those actions.

## Examples

# ki-copy-button examples

## Copy an invite link

```html
<ki-copy-button value="https://kimen.dev/i/4f9a" label="Copy invite link"></ki-copy-button>
```

## Copy what a field currently contains

```html
<ki-input id="token-field" label="Token" value="token-4f9a"></ki-input>
<ki-copy-button from="token-field" variant="secondary">Copy token</ki-copy-button>
```

## Copy a code sample with localized feedback

```html
<pre id="install-command"><code>pnpm add @kimen/elements</code></pre>
<ki-copy-button
  from="install-command"
  copied-label="Copiado"
  copy-error-label="No se pudo copiar"
>Copiar comando</ki-copy-button>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-copy-button`: the default, only the tokens ki-copy-button needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `copied-label` (string, default 'Copied'): Polite announcement after a successful write. Override for localized interfaces.
- `copy-error-label` (string, default "Couldn't copy"): Polite announcement after a failed write or missing source. Override for localized interfaces.
- `feedback-duration` (number, default 1500, minimum 0): Milliseconds to show feedback after a write settles. Zero keeps the outcome visible until the next result. Invalid values use 1500 ms.
- `from` (string | undefined, ID of another element of the same spec): ID of a source in this button's document or shadow root. A nonempty ID takes precedence over `value`. The source's current string value or its text content is read on activation.
- `label` (string, default 'Copy'): Accessible name for the icon-only control. Visible slot text supplies the name when present.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed button size. Match the size of adjacent controls.
- `value` (string | undefined): Exact clipboard text, including whitespace. Supply it when the text is known directly.
- `variant` ("ghost" | "outline" | "primary" | "quaternary" | "secondary", default 'ghost'): Button emphasis. Use ghost for compact actions and secondary for a visible supporting action.

## Slots

- (default): Optional visible text, which supplies the accessible name and places the icon at the inline start. Use plain text or non-interactive markup.

## Parts

- `button`: Native copy control with keyboard and pointer activation.
- `icon`: Fixed-size decorative feedback glyph box inside the button.
- `label`: Wrapper around the visible slotted label.

## Events

- `ki-copy` (CustomEvent<{ value: string }>): Fired after a successful clipboard write. The detail carries the exact text copied.
- `ki-copy-error` (CustomEvent<void>): Fired when the source cannot be read or clipboard writing is unavailable or fails.

## Methods

None.

## Other CSS custom properties

- `--ki-button-backdrop-filter`: Complete backdrop filter for button and icon-button variants; none in onmars v2. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-button-border-width`: dimension used by the button component for border width (MarsUI outline stroke: 1px). Default: onmars `var(--ki-size-border-hairline)`, material3 `0.0625rem`.
- `--ki-button-focus-ring-color`: color used by the button component for focus ring color. Default: `var(--ki-focus-ring-color)`.
- `--ki-button-focus-ring-offset`: dimension used by the button component for focus ring offset. Default: `var(--ki-focus-ring-offset)`.
- `--ki-button-focus-ring-shadow`: shadow used by the button component for the focus ring glow (MarsUI Focus/primary: 3px spread ring). Default: `var(--ki-focus-primary)`.
- `--ki-button-focus-ring-width`: dimension used by the button component for focus ring width. Default: `var(--ki-focus-ring-width)`.
- `--ki-button-font-family`: font family used by the button component for font family. Default: `var(--ki-typography-family-body)`.
- `--ki-button-font-weight`: font weight used by the button component for font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-button-ghost-danger-hover-bg`: color used by the button component for ghost danger hover background. Default: `var(--ki-surface-danger-base-em-alpha)`.
- `--ki-button-ghost-danger-hover-border`: color used by the button component for ghost danger hover border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-danger-hover-fg`: color used by the button component for ghost danger hover foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-ghost-danger-rest-bg`: color used by the button component for ghost danger rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-danger-rest-border`: color used by the button component for ghost danger rest border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-danger-rest-fg`: color used by the button component for ghost danger rest foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-ghost-neutral-disabled-bg`: color used by the button component for ghost neutral disabled background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-neutral-disabled-border`: color used by the button component for ghost neutral disabled border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-neutral-disabled-fg`: color used by the button component for ghost neutral disabled foreground. Default: `var(--ki-text-muted)`.
- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background. Default: `var(--ki-surface-primary-base-em-alpha)`.
- `--ki-button-ghost-neutral-hover-border`: color used by the button component for ghost neutral hover border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground. Default: `var(--ki-text-primary-high-em)`.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-neutral-rest-border`: color used by the button component for ghost neutral rest border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground. Default: `var(--ki-text-primary-high-em)`.
- `--ki-button-ghost-success-hover-bg`: color used by the button component for ghost success hover background. Default: `var(--ki-surface-success-base-em-alpha)`.
- `--ki-button-ghost-success-hover-border`: color used by the button component for ghost success hover border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-success-hover-fg`: color used by the button component for ghost success hover foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-ghost-success-rest-bg`: color used by the button component for ghost success rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-success-rest-border`: color used by the button component for ghost success rest border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-success-rest-fg`: color used by the button component for ghost success rest foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-inline-size`: Button and link inline size. Set to 100% to fill the container. Default: `var(--ki-size-layout-fit-content)`.
- `--ki-button-justify-content`: Placement of the button content; start for a card. Default: `center`.
- `--ki-button-label-padding-inline`: dimension used by the button component for the label Text_wrap inline padding (MarsUI 8003:300: 4px each side of the label; the flex gap subtracts the same value so icon-to-text keeps the composite distance). Default: `var(--ki-space-xs)`.
- `--ki-button-lg-font-size`: dimension used by the button component for lg font size. Default: `var(--ki-typography-size-body-2)`.
- `--ki-button-lg-gap`: dimension used by the button component for lg gap. Default: `var(--ki-space-sm)`.
- `--ki-button-lg-height`: dimension used by the button component for lg height. Default: `var(--ki-space-14xl)`.
- `--ki-button-lg-icon-size`: dimension used by the button component for lg icon size. Default: `var(--ki-space-5xl)`.
- `--ki-button-lg-line-height`: dimension used by the button component for lg line height. Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-button-lg-min-target`: dimension used by the button component for lg min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-lg-padding-inline`: dimension used by the button component for lg padding inline. Default: `var(--ki-space-xl)`.
- `--ki-button-lg-radius`: dimension used by the button component for lg radius (Button master 8003:300 binds Radius/small-component/lg, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-lg)`, material3 `var(--ki-radius-round)`.
- `--ki-button-lg-spinner-size`: dimension used by the button component for the lg loading spinner box (20px, the lg icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-5xl)`.
- `--ki-button-md-font-size`: dimension used by the button component for md font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-button-md-gap`: dimension used by the button component for md gap (MarsUI effective icon-to-text gap 6px). Default: `var(--ki-space-sm)`.
- `--ki-button-md-height`: dimension used by the button component for md height. Default: `var(--ki-space-12xl)`.
- `--ki-button-md-icon-size`: dimension used by the button component for md icon size. Default: `var(--ki-space-4xl)`.
- `--ki-button-md-line-height`: dimension used by the button component for md line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-button-md-min-target`: dimension used by the button component for md min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-md-padding-inline`: dimension used by the button component for md padding inline. Default: `var(--ki-space-lg)`.
- `--ki-button-md-radius`: dimension used by the button component for md radius (Button master 8003:300 binds Radius/small-component/md, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-md)`, material3 `var(--ki-radius-round)`.
- `--ki-button-md-spinner-size`: dimension used by the button component for the md loading spinner box (18px, the md icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-4xl)`.
- `--ki-button-padding-block`: dimension used by the button component for padding block (MarsUI: 4px in every size). Default: `var(--ki-space-xs)`.
- `--ki-button-primary-danger-hover-bg`: color used by the button component for primary danger hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). Default: `var(--ki-surface-danger-high-em)`.
- `--ki-button-primary-danger-hover-border`: color used by the button component for primary danger hover border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-danger-hover-fg`: color used by the button component for primary danger hover foreground. Default: `var(--ki-text-primary-on-danger)`.
- `--ki-button-primary-danger-rest-bg`: color used by the button component for primary danger rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/danger_med_em #f05149) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification). Default: `var(--ki-surface-danger-high-em)`.
- `--ki-button-primary-danger-rest-border`: color used by the button component for primary danger rest border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-danger-rest-fg`: color used by the button component for primary danger rest foreground. Default: `var(--ki-text-primary-on-danger)`.
- `--ki-button-primary-neutral-disabled-bg`: color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification). Default: `var(--ki-surface-disabled-low-em)`.
- `--ki-button-primary-neutral-disabled-border`: color used by the button component for primary neutral disabled border. Default: `var(--ki-outline-none)`.
- `--ki-button-primary-neutral-disabled-fg`: color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification). Default: `var(--ki-text-muted)`.
- `--ki-button-primary-neutral-hover-bg`: color used by the button component for primary neutral hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). Default: onmars `var(--ki-surface-primary-med-em-hover)`, material3 `var(--ki-surface-primary-med-em)`.
- `--ki-button-primary-neutral-hover-border`: color used by the button component for primary neutral hover border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-neutral-hover-fg`: color used by the button component for primary neutral hover foreground. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500). Default: `var(--ki-surface-primary-med-em)`.
- `--ki-button-primary-neutral-rest-border`: color used by the button component for primary neutral rest border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-button-primary-success-hover-bg`: color used by the button component for primary success hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). Default: `var(--ki-surface-success-high-em)`.
- `--ki-button-primary-success-hover-border`: color used by the button component for primary success hover border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-success-hover-fg`: color used by the button component for primary success hover foreground. Default: `var(--ki-text-primary-on-success)`.
- `--ki-button-primary-success-rest-bg`: color used by the button component for primary success rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/success_med_em #409b3f) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification). Default: `var(--ki-surface-success-high-em)`.
- `--ki-button-primary-success-rest-border`: color used by the button component for primary success rest border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-success-rest-fg`: color used by the button component for primary success rest foreground. Default: `var(--ki-text-primary-on-success)`.
- `--ki-button-quaternary-danger-hover-bg`: color used by the button component for quaternary danger hover background. Default: `var(--ki-surface-danger-base-em-alpha)`.
- `--ki-button-quaternary-danger-hover-border`: color used by the button component for quaternary danger hover border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-high-em)`.
- `--ki-button-quaternary-danger-hover-fg`: color used by the button component for quaternary danger hover foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-quaternary-danger-rest-bg`: color used by the button component for quaternary danger rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-quaternary-danger-rest-border`: color used by the button component for quaternary danger rest border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-med-em)`.
- `--ki-button-quaternary-danger-rest-fg`: color used by the button component for quaternary danger rest foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-quaternary-neutral-disabled-bg`: color used by the button component for quaternary neutral disabled background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-quaternary-neutral-disabled-border`: color used by the button component for quaternary neutral disabled border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-low-em)`.
- `--ki-button-quaternary-neutral-disabled-fg`: color used by the button component for quaternary neutral disabled foreground: the disabled ink of every field and selection control (Text/base_em). quaternary has no fill or border, so its ink alone shows the state; ki.text.muted equals its resting ki.text.med-em in onmars. Default: onmars `var(--ki-text-base-em)`, material3 `var(--ki-text-muted)`.
- `--ki-button-quaternary-neutral-hover-bg`: color used by the button component for quaternary neutral hover background (MarsUI hover mechanism: hover-overlay-inverse Black/3 wash over the transparent rest fill). Default: onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-surface-primary-base-em-alpha)`.
- `--ki-button-quaternary-neutral-hover-border`: color used by the button component for quaternary neutral hover border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-button-quaternary-neutral-hover-fg`: color used by the button component for quaternary neutral hover foreground (MarsUI quaternary label text/med_em gray; never the accent). Default: onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)`.
- `--ki-button-quaternary-neutral-rest-bg`: color used by the button component for quaternary neutral rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-quaternary-neutral-rest-border`: color used by the button component for quaternary neutral rest border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-med-em)`.
- `--ki-button-quaternary-neutral-rest-fg`: color used by the button component for quaternary neutral rest foreground (MarsUI quaternary label text/med_em gray; never the accent). Default: onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)`.
- `--ki-button-quaternary-success-hover-bg`: color used by the button component for quaternary success hover background. Default: `var(--ki-surface-success-base-em-alpha)`.
- `--ki-button-quaternary-success-hover-border`: color used by the button component for quaternary success hover border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-high-em)`.
- `--ki-button-quaternary-success-hover-fg`: color used by the button component for quaternary success hover foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-quaternary-success-rest-bg`: color used by the button component for quaternary success rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-quaternary-success-rest-border`: color used by the button component for quaternary success rest border (MarsUI quaternary is borderless in every state). Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-med-em)`.
- `--ki-button-quaternary-success-rest-fg`: color used by the button component for quaternary success rest foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-secondary-danger-hover-bg`: color used by the button component for secondary danger hover background. Default: `var(--ki-surface-danger-low-em)`.
- `--ki-button-secondary-danger-hover-border`: color used by the button component for secondary danger hover border (MarsUI top/inline edge, variant trait). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-danger-hover-fg`: color used by the button component for secondary danger hover foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-secondary-danger-rest-bg`: color used by the button component for secondary danger rest background. Default: `var(--ki-surface-danger-base-em)`.
- `--ki-button-secondary-danger-rest-border`: color used by the button component for secondary danger rest border (MarsUI top/inline edge, variant trait). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-danger-rest-fg`: color used by the button component for secondary danger rest foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-secondary-neutral-disabled-bg`: color used by the button component for secondary neutral disabled background. Default: `var(--ki-surface-disabled-low-em)`.
- `--ki-button-secondary-neutral-disabled-border`: color used by the button component for secondary neutral disabled border. Default: `var(--ki-outline-none)`.
- `--ki-button-secondary-neutral-disabled-fg`: color used by the button component for secondary neutral disabled foreground. Default: `var(--ki-text-muted)`.
- `--ki-button-secondary-neutral-hover-bg`: color used by the button component for secondary neutral hover background (MarsUI: rest fill; hover darkening comes from the hover overlay). Default: onmars `var(--ki-surface-special-light-s2-dark-s3)`, material3 `var(--ki-surface-special-secondary-alpha-base)`.
- `--ki-button-secondary-neutral-hover-border`: color used by the button component for secondary neutral hover border (MarsUI top/inline edge). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-neutral-hover-fg`: color used by the button component for secondary neutral hover foreground (MarsUI text/high_em). Default: `var(--ki-text-high-em)`.
- `--ki-button-secondary-neutral-rest-bg`: color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: neutral, not a brand tint; white in onmars v2). Default: `var(--ki-surface-special-secondary-alpha-base)`.
- `--ki-button-secondary-neutral-rest-border`: color used by the button component for secondary neutral rest border (MarsUI top/inline edge). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-neutral-rest-fg`: color used by the button component for secondary neutral rest foreground (MarsUI text/high_em). Default: `var(--ki-text-high-em)`.
- `--ki-button-secondary-success-hover-bg`: color used by the button component for secondary success hover background. Default: `var(--ki-surface-success-low-em)`.
- `--ki-button-secondary-success-hover-border`: color used by the button component for secondary success hover border (MarsUI top/inline edge, variant trait). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-success-hover-fg`: color used by the button component for secondary success hover foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-secondary-success-rest-bg`: color used by the button component for secondary success rest background. Default: `var(--ki-surface-success-base-em)`.
- `--ki-button-secondary-success-rest-border`: color used by the button component for secondary success rest border (MarsUI top/inline edge, variant trait). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-success-rest-fg`: color used by the button component for secondary success rest foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-sm-font-size`: dimension used by the button component for sm font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-button-sm-gap`: dimension used by the button component for sm gap (Button master 8003:301: root gap Space/xxs 2px + Text_wrap inline padding Space/xs 4px = 6px icon-to-text). Default: `var(--ki-space-sm)`.
- `--ki-button-sm-height`: dimension used by the button component for sm height. Default: `var(--ki-space-10xl)`.
- `--ki-button-sm-icon-size`: dimension used by the button component for sm icon size. Default: `var(--ki-space-3xl)`.
- `--ki-button-sm-line-height`: dimension used by the button component for sm line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-button-sm-min-target`: dimension used by the button component for sm min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-sm-padding-inline`: dimension used by the button component for sm padding inline. Default: `var(--ki-space-md)`.
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-button-sm-spinner-size`: dimension used by the button component for the sm loading spinner box (16px, the sm icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-3xl)`.
- `--ki-button-spinner-duration`: duration used by the button and icon button components for one turn of the loading spinner (spec 046 D5: the ki-progress indeterminate period). Applied only under prefers-reduced-motion: no-preference. Default: `1600ms`.
- `--ki-button-spinner-stroke-width`: dimension used by the button and icon button components for the loading spinner stroke (spec 046 D5: the circular ki-progress ring, drawn with a non-scaling stroke of this width). Default: `var(--ki-space-xxs)`.
- `--ki-button-tertiary-danger-hover-bg`: Tertiary alias of the secondary danger hover background. Default: onmars `var(--ki-surface-danger-low-em)`, material3 `var(--ki-surface-s1)`.
- `--ki-button-tertiary-danger-hover-border`: color used by the button component for tertiary danger hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-danger-hover-fg`: color used by the button component for tertiary danger hover foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-tertiary-danger-rest-bg`: Tertiary alias of the secondary danger rest background. Default: onmars `var(--ki-surface-danger-base-em)`, material3 `var(--ki-surface-s0)`.
- `--ki-button-tertiary-danger-rest-border`: color used by the button component for tertiary danger rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-danger-rest-fg`: color used by the button component for tertiary danger rest foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-button-tertiary-disabled-shadow`: value used by the button component for tertiary disabled shadow. Default: `none`.
- `--ki-button-tertiary-hover-overlay`: Hover overlay for neutral tertiary buttons, shared with secondary by default. Default: onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-transparent-inverse)`.
- `--ki-button-tertiary-hover-shadow`: shadow used by the button component for tertiary hover shadow (MarsUI Component_effect/secondary_hover). Default: onmars `var(--ki-effect-component-secondary-hover-shadow)`, material3 `0px 1px 3px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 4px 8px 3px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))`.
- `--ki-button-tertiary-neutral-disabled-bg`: color used by the button component for tertiary neutral disabled background. Default: `var(--ki-surface-disabled-low-em)`.
- `--ki-button-tertiary-neutral-disabled-border`: color used by the button component for tertiary neutral disabled border. Default: `var(--ki-outline-none)`.
- `--ki-button-tertiary-neutral-disabled-fg`: color used by the button component for tertiary neutral disabled foreground. Default: `var(--ki-text-muted)`.
- `--ki-button-tertiary-neutral-hover-bg`: Tertiary alias of the secondary neutral hover background. Default: onmars `var(--ki-surface-special-light-s2-dark-s3)`, material3 `var(--ki-surface-s1)`.
- `--ki-button-tertiary-neutral-hover-border`: color used by the button component for tertiary neutral hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-neutral-hover-fg`: Tertiary alias of the secondary neutral hover foreground. Default: onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)`.
- `--ki-button-tertiary-neutral-rest-bg`: Tertiary alias of the secondary neutral rest background. Default: onmars `var(--ki-surface-special-secondary-alpha-base)`, material3 `var(--ki-surface-s0)`.
- `--ki-button-tertiary-neutral-rest-border`: color used by the button component for tertiary neutral rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-neutral-rest-fg`: Tertiary alias of the secondary neutral rest foreground. Default: onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)`.
- `--ki-button-tertiary-rest-border-bottom`: color used by the button component for the tertiary bottom edge (MarsUI Outline/secondary_button_bottom, as secondary). Default: onmars `var(--ki-outline-secondary-button-bottom)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-rest-shadow`: shadow used by the button component for tertiary rest shadow (MarsUI Component_effect/secondary_default — replaces the migrated M2-era stack, which the material3 theme keeps via its own override). Default: onmars `var(--ki-effect-component-secondary-default-shadow)`, material3 `0px 1px 2px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 2px 6px 2px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))`.
- `--ki-button-tertiary-success-hover-bg`: Tertiary alias of the secondary success hover background. Default: onmars `var(--ki-surface-success-low-em)`, material3 `var(--ki-surface-s1)`.
- `--ki-button-tertiary-success-hover-border`: color used by the button component for tertiary success hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-success-hover-fg`: color used by the button component for tertiary success hover foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-tertiary-success-rest-bg`: Tertiary alias of the secondary success rest background. Default: onmars `var(--ki-surface-success-base-em)`, material3 `var(--ki-surface-s0)`.
- `--ki-button-tertiary-success-rest-border`: color used by the button component for tertiary success rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-tertiary-success-rest-fg`: color used by the button component for tertiary success rest foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-button-text-align`: Alignment of the label lines. Default: `center`.
- `--ki-button-toggle-radius`: Rounded rectangle shape for an unselected text toggle button. Default: `var(--ki-radius-component-md)`.
- `--ki-button-toggle-selected-radius`: Pill shape for a selected text toggle button. Default: `var(--ki-radius-round)`.
- `--ki-button-toggle-unselected-hover-overlay`: Hover wash for unselected filled and quiet toggles. Default: `var(--ki-surface-hover-overlay-inverse)`.
- `--ki-button-xl-font-size`: dimension used by the button component for xl font size. Default: `var(--ki-typography-size-title-2)`.
- `--ki-button-xl-gap`: dimension used by the button component for xl gap (MarsUI effective icon-to-text gap 8px). Default: `var(--ki-space-md)`.
- `--ki-button-xl-height`: dimension used by the button component for xl height. Default: `var(--ki-space-16xl)`.
- `--ki-button-xl-icon-size`: dimension used by the button component for xl icon size. Default: `var(--ki-space-7xl)`.
- `--ki-button-xl-line-height`: dimension used by the button component for xl line height. Default: `var(--ki-typography-line-height-title-2)`.
- `--ki-button-xl-min-target`: dimension used by the button component for xl min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-xl-padding-inline`: dimension used by the button component for xl padding inline (MarsUI 14px). Default: `var(--ki-space-2xl)`.
- `--ki-button-xl-radius`: dimension used by the button component for xl radius (Button master 8003:300 binds Radius/small-component/xl, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xl)`, material3 `var(--ki-radius-round)`.
- `--ki-button-xl-spinner-size`: dimension used by the button component for the xl loading spinner box (24px, the xl icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-7xl)`.
- `--ki-button-xs-font-size`: dimension used by the button component for xs font size: caption_2, 12px, the smallest size the library ships for informative text (spec 002 amendment A1, issue #321). The Figma Button master draws caption_1, 10px. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-button-xs-gap`: dimension used by the button component for xs gap (MarsUI effective icon-to-text gap 4px). Default: `var(--ki-space-xs)`.
- `--ki-button-xs-height`: dimension used by the button component for xs height. Default: `var(--ki-space-7xl)`.
- `--ki-button-xs-icon-size`: dimension used by the button component for xs icon size (MarsUI 14px). Default: `var(--ki-space-2xl)`.
- `--ki-button-xs-line-height`: dimension used by the button component for xs line height (caption_2 16px, the same height as caption_1). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-button-xs-min-target`: dimension used by the button component for xs min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-xs-padding-inline`: dimension used by the button component for xs padding inline. Default: `var(--ki-space-sm)`.
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-button-xs-spinner-size`: dimension used by the button component for the xs loading spinner box (14px, the xs icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-2xl)`.
- `--ki-copy-button-success-bg`: Contrast ground for the success glyph on filled primary copy buttons. Default: `var(--ki-surface-success-low-em)`.
- `--ki-copy-button-success-fg`: Confirmation check ink. Default: `var(--ki-text-success-high-em)`.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | error | `--ki-copy-button-error-bg` | `var(--ki-surface-danger-low-em)` | Contrast ground for the error glyph on filled primary copy buttons. |
| — | — | error | `--ki-copy-button-error-fg` | `var(--ki-text-danger-high-em)` | Copy failure glyph ink. |
| ghost | — | rest | `--ki-button-ghost-rest-shadow` | `none` | value used by the button component for ghost rest shadow. |
| ghost | — | disabled | `--ki-button-ghost-disabled-shadow` | `none` | value used by the button component for ghost disabled shadow. |
| ghost | — | hover | `--ki-button-ghost-hover-shadow` | `none` | value used by the button component for ghost hover shadow. |
| ghost | — | selected | `--ki-button-ghost-selected-bg` | onmars `var(--ki-text-primary-high-em)`, material3 `var(--ki-surface-primary-high-em)` | Background of the selected ghost button toggle. |
| ghost | — | selected | `--ki-button-ghost-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected ghost button toggle. |
| outline | — | rest | `--ki-button-outline-rest-bg` | `var(--ki-surface-transparent)` | Background of the outline variant at rest. |
| outline | — | rest | `--ki-button-outline-rest-border` | `var(--ki-outline-control)` | Visible outline of the outline variant at rest. |
| outline | — | rest | `--ki-button-outline-rest-fg` | `var(--ki-text-high-em)` | Foreground of the outline variant at rest. |
| outline | — | hover | `--ki-button-outline-hover-bg` | onmars `var(--ki-surface-s1)`, material3 `var(--ki-surface-s2)` | Background of the hovered outline variant. |
| outline | — | hover | `--ki-button-outline-hover-border` | `var(--ki-outline-control-hover)` | Border of the hovered outline variant. |
| outline | — | hover | `--ki-button-outline-hover-fg` | `var(--ki-text-high-em)` | Ink of the hovered outline variant. |
| outline | — | selected | `--ki-button-outline-selected-bg` | `var(--ki-surface-inverse-white)` | Background of the selected outline button toggle. |
| outline | — | selected | `--ki-button-outline-selected-border` | `var(--ki-outline-none)` | Border of the selected outline toggle. |
| outline | — | selected | `--ki-button-outline-selected-fg` | `var(--ki-text-inverse-black)` | Foreground of the selected outline button toggle. |
| primary | — | rest | `--ki-button-primary-rest-border-bottom` | onmars `var(--ki-outline-primary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the primary bottom edge (MarsUI Outline/primary_button_bottom; none in onmars v2). |
| primary | — | rest | `--ki-button-primary-rest-shadow` | `var(--ki-effect-component-primary-default-shadow)` | shadow used by the button component for button primary rest shadow (MarsUI Component_effect/primary_default). |
| primary | — | active | `--ki-button-primary-active-overlay` | `var(--ki-state-layer-pressed)` | Pressed state layer for the primary button: primary paints on a dark brand fill, so its wash lightens: the next rung above ki.surface.hover-overlay (White/5 -> White/8 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first. |
| primary | — | disabled | `--ki-button-primary-disabled-shadow` | `none` | value used by the button component for primary disabled shadow. |
| primary | — | hover | `--ki-button-primary-hover-overlay` | onmars `var(--ki-surface-hover-overlay)`, material3 `var(--ki-state-layer-hover)` | color used by the button component for the primary hover overlay layer (MarsUI hover overlay, White/5). |
| primary | — | hover | `--ki-button-primary-hover-shadow` | `var(--ki-effect-component-primary-hover-shadow)` | shadow used by the button component for button primary hover shadow (MarsUI Component_effect/primary_hover). |
| primary | — | selected | `--ki-button-primary-selected-bg` | `var(--ki-surface-primary-med-em)` | Background of the selected primary button toggle. |
| primary | — | selected | `--ki-button-primary-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected primary button toggle. |
| quaternary | — | rest | `--ki-button-quaternary-rest-shadow` | `none` | value used by the button component for quaternary rest shadow. |
| quaternary | — | disabled | `--ki-button-quaternary-disabled-shadow` | `none` | value used by the button component for quaternary disabled shadow. |
| quaternary | — | hover | `--ki-button-quaternary-hover-shadow` | `none` | value used by the button component for quaternary hover shadow. |
| quaternary | — | selected | `--ki-button-quaternary-selected-bg` | `var(--ki-surface-primary-high-em)` | Background of the selected quaternary button toggle. |
| quaternary | — | selected | `--ki-button-quaternary-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected quaternary button toggle. |
| secondary | — | rest | `--ki-button-secondary-rest-border-bottom` | onmars `var(--ki-outline-secondary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the secondary bottom edge (MarsUI Outline/secondary_button_bottom). |
| secondary | — | rest | `--ki-button-secondary-rest-shadow` | `var(--ki-effect-component-secondary-default-shadow)` | shadow used by the button component for secondary rest shadow (MarsUI Component_effect/secondary_default). |
| secondary | — | active | `--ki-button-secondary-active-overlay` | onmars `var(--ki-surface-pressed-overlay-inverse)`, material3 `var(--ki-state-layer-pressed)` | Pressed state layer for the secondary button: secondary paints on a light fill, so its wash darkens: the next rung above ki.surface.hover-overlay-inverse (Black/3 -> Black/5 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first. |
| secondary | — | disabled | `--ki-button-secondary-disabled-shadow` | `none` | value used by the button component for secondary disabled shadow. |
| secondary | — | hover | `--ki-button-secondary-hover-overlay` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-state-layer-hover)` | color used by the button component for the secondary hover overlay layer (MarsUI hover overlay inverse, Black/3). |
| secondary | — | hover | `--ki-button-secondary-hover-shadow` | `var(--ki-effect-component-secondary-hover-shadow)` | shadow used by the button component for secondary hover shadow (MarsUI Component_effect/secondary_hover). |
| secondary | — | selected | `--ki-button-secondary-selected-bg` | `var(--ki-surface-secondary-med-em)` | Background of the selected secondary button toggle. |
| secondary | — | selected | `--ki-button-secondary-selected-fg` | `var(--ki-text-primary-on-secondary)` | Foreground of the selected secondary button toggle. |
