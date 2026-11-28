# ki-status

> A tiny, non-interactive status dot that marks the state of a nearby item.

## When to use

mark a state with minimal footprint adjacent to (or overlaid
on) the item it describes: presence on an avatar, health of a service
list entry, connection state in a toolbar. Label it (`label`) or pair it
with adjacent visible text — color is never the only carrier of the
meaning (WCAG 1.4.1).

## When not to use

short labeled status text (that pill is ki-badge — this dot
never renders text), notification counters or the overlay attachment
mechanism (a future, separate nav-badge concern), messages that need
attention or announcement (ki-alert — the dot has no live region),
progress or loading (ki-progress). An unlabeled dot without adjacent
visible text is an authoring mistake (WCAG 1.4.1).

## Examples

`tone` declares semantic intent and `label` exposes the dot as a named non-interactive image; an unrecognized tone keeps the neutral appearance:

```html
<ki-status tone="success" label="Online"></ki-status>
<ki-status tone="danger" label="Build failing"></ki-status>
```

Without a `label` the dot is decorative and contributes nothing to the accessibility tree — adjacent visible text must then carry the meaning (color is never the only carrier, WCAG 1.4.1):

```html
<p><ki-status tone="success"></ki-status> Online</p>
```

`ring` keeps the dot distinguishable over media; positioning the overlay is the consumer's layout concern, and the ring never shifts layout:

```html
<div style="position: relative">
  <img src="avatar.png" alt="" />
  <ki-status
    tone="success"
    ring
    label="Online"
    style="position: absolute; inset-block-end: 0; inset-inline-end: 0"
  ></ki-status>
</div>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-status`: the default, only the tokens ki-status needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `label` (string | undefined): Accessible name for the state ("Online", "Build failing"). With a label the dot is exposed to assistive technology as a named non-interactive image (role `img`); without one it is decorative and contributes nothing to the accessibility tree — the meaning must then live in adjacent visible text (FR-003, FR-008). The label is never rendered visually: visible status text belongs to ki-badge. Runtime changes are not announced (no live region, FR-005).
- `ring` (boolean, default false): Draws a separating ring around the dot for placement over media (an avatar photo), keeping it distinguishable from the pixels beneath. A per-instance functional axis — MarsUI ships Outline=True|False as sibling variants under one theme (recorded deviation from the 002 token-only rule) — while ring width and color stay per-theme `--ki-status-ring-*` tokens. The ring paints outside the dot's box and never shifts layout.
- `tone` ("danger" | "info" | "neutral" | "success" | "warning", default 'neutral'): Semantic intent, never appearance: each tone resolves its fill from the per-theme `--ki-status-{tone}-color` tokens. An unrecognized value matches no style selector, so the dot keeps the neutral appearance (fallback by CSS construction — no validation code, FR-007).

## Slots

None.

## Parts

- `dot`: The dot itself: size, tone fill, radius, ring and effects.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-emphasized-decelerate`: Expressive entrance curve. M3 md.sys.motion.easing.emphasized-decelerate. onmars: the MarsUI decelerate curve (ki.easing.out). Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0.05,0.7,0.1,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-status-danger-color`: color used by the status component for the danger tone fill: Surface/danger_med_em, the exact variable bound to the Type=danger Status variant (Danger/500). Default: `var(--ki-surface-danger-med-em)`.
- `--ki-status-info-color`: color used by the status component for the info tone fill: Surface/info_high_em (Info/600 light, Info/400 dark) — one step above the med-em 500 pattern the success and danger tones follow, because Info/500 reads 2.29:1 on the light page and WCAG 1.4.11 asks 3:1 of the dot (FR-008). No Figma Status variant ships an info Type, so the fill remains an extrapolation onto the Info ramp (001 contract, 010/015 precedent) declared for founder ratification. Default: `var(--ki-surface-info-high-em)`.
- `--ki-status-neutral-color`: color used by the status component for the neutral tone fill: ki.outline.control, the semantic 3:1 non-text floor (Black/48 light, White/48 dark; md.sys.color.outline in material3) — a declared a11y deviation from the MarsUI binding Surface/disabled_high_em (Gray/500 light, White/32 dark), which reads 2.10:1 and 2.78:1 against the page where WCAG 1.4.11 asks 3:1 of the dot (FR-008). MarsUI's disabled gray still maps to the charter neutral tone (spec Assumptions). Default: `var(--ki-outline-control)`.
- `--ki-status-radius`: dimension used by the status component for the dot shape: Radius/radius_round bound in Figma — the round dot is a radius token, never an attribute (002 shape precedent). Default: `var(--ki-radius-round)`.
- `--ki-status-ring-color`: color used by the status component for the separating ring: Outline/inverse_black, the exact variable bound to Outline=True variants — white over light surfaces, black over dark ones, so the ring reads as a cutout from the underlying media (FR-002). Default: `var(--ki-outline-inverse-black)`.
- `--ki-status-ring-width`: dimension used by the status component for the separating ring: the 2px stroke on every Outline=True Status variant (FR-002). Default: `var(--ki-space-xxs)`.
- `--ki-status-shadow`: shadow used by the status component for the dot effects: the exact MarsUI pair on every Status variant — e1 drop (0/1/1/-0.5 in the scheme shadow color) plus inner White/12 highlight (0/3/3), i.e. Component_effect/primary_default's box-shadow layers, flat in onmars v2. Its backdrop blur is not applied: a 4px dot has nothing to blur (brief §5 perf note). Default: onmars `var(--ki-effect-component-primary-default-shadow)`, material3 `0 0 0 0 var(--ki-color-transparent-black)`.
- `--ki-status-size`: dimension used by the status component for the dot: the MarsUI 4px dot, Space/xs bound to every Status variant (specs/021-ki-status/design-extraction.md). One size per theme, never an attribute (FR-006). Default: onmars `var(--ki-space-md)`, material3 `var(--ki-space-sm)`.
- `--ki-status-success-color`: color used by the status component for the success tone fill: Surface/success_med_em, the exact variable bound to the Type=success Status variant (Success/500). Default: `var(--ki-surface-success-med-em)`.
- `--ki-status-warning-color`: color used by the status component for the warning tone fill: Text/warning_high_em (Warning/800 light, Warning/300 dark) — a declared a11y deviation from the MarsUI binding Surface/warning_med_em (Warning/500), which reads 1.92:1 on the light page. No warning surface step clears the 3:1 WCAG 1.4.11 asks of the dot (Warning/600 reads 2.33:1), so the fill takes the warning ink that is legible on the page (FR-008). Default: `var(--ki-text-warning-high-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
