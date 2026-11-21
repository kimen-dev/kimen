# DESIGN.md

The visual rules of Kimen's default theme, **onmars v2 "Calma"**, as
`@kimen/tokens` ships it. The tokens are the source of truth. This file
states the intent behind them, so reviews, agents and theme authors can tell
a correct screen from a wrong one. Values are onmars light / dark unless
noted. The per-token reference is
[`packages/elements/docs/tokens-reference.mdx`](packages/elements/docs/tokens-reference.mdx).

## Principles

- **Neutral first, on paper.** Warm paper and charcoal surfaces, warm ink
  actions, and one terracotta accent.
- **Flat and opaque.** Surfaces are opaque and edged with a hairline. Only
  things that float cast a shadow. There is no glass, blur or bevel.
- **Calm type.** Instrument Sans for the UI, Newsreader for titles and
  display text.
- **Readable by construction.** Every text pair and control boundary clears
  WCAG. A gate measures them in every theme, scheme and preference mode
  (`packages/tokens/scripts/check-contrast.mjs`).

## Layers

Primitive (`ki-color-*`, `ki-space-*`, `ki-radius-*`) → theme (onmars picks:
brand ramp, fonts) → semantic (`ki-surface-*`, `ki-text-*`, `ki-outline-*`,
`ki-elevation-*`) → component (`--ki-<component>-*`).

- Components read only semantic and component tokens.
- A rebrand reassigns the theme or semantic layer, never component CSS.
- Customize in this order: tokens, then `::part()`, then slots. A change that
  needs `!important` is an API bug.
- Every scheme-dependent token is one `light-dark()` value, so nothing is
  hard-coded per scheme.

## Colour

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Page | `ki-surface-base` | `#f9f7f4` (= s1) | `#1b1916` (= s0) |
| Cards, fields, menus | `ki-surface-s0` … `s3` | `#ffffff` → `#ebe7e1` | `#1b1916` → `#312f2b` |
| Primary action fill | `ki-surface-primary-med-em` | `#1d1a16` ink | `#edebe7` |
| Accent ramp | `ki-color-brand-500` | `#bc4c26` terracotta | same ramp |
| Body and headings | `ki-text-high-em` | `#181613` | `#edebe7` |
| Supporting text | `ki-text-med-em` / `low-em` | `#5e5953` / `#6b665f` | `#bfbcb6` / `#9e9b96` |

- **Ink plus one accent.** Primary fills are warm ink:
  `ki-text-primary-on-primary` reads 17.3:1 on them in light and 14.7:1 in
  dark.
- **Accent roles.** The terracotta accent is spent only on these four roles:
  - **Selection:** `ki-surface-primary-low-em` with
    `ki-text-primary-on-primary-light`, 6.2:1 or more.
  - **Links and ghost actions:** `ki-text-primary-high-em`, 4.8:1 or more on
    s0–s3.
  - **The focus ring:** `ki-focus-ring-color`.

  An avatar, a FAB menu or a media control is not a selection. In onmars they
  take neutral fills (`ki-surface-s3`, the ink FAB, quaternary buttons).
- **Danger is crimson**, so an error never reads as the accent.
- **Status** comes in four tones: info (cyan), success (green), warning
  (amber) and danger (crimson). Each has `high-em`, `med-em`, `low-em` and
  `base-em` steps for surface, text and outline.
  - Status is never colour alone: alerts and badges carry words, and
    `ki-status` needs a label.
  - Tinted containers use `ki-surface-<tone>-tint`, which is opaque in v2.
    A non-neutral alert is the tone's tint, edged by `ki-outline-<tone>-low-em`
    and headed by the tone's glyph.
- **Text inks.**
  - The neutral inks reach 5.0:1 or more on s0–s2.
  - The tonal `high-em`, `med-em` and `low-em` inks reach 4.5:1 or more on
    s0–s2, in both schemes and in Material 3.
  - Two families are not for readable text: `ki-text-base-em` (disabled ink,
    which WCAG exempts) and the tonal `base-em` inks (decorative tints).
- **Fixed inks.** `ki-text-white` and `ki-text-black` never change with the
  theme. Use them only on `ki-surface-white`, `ki-surface-black` or fixed
  imagery.

## Surfaces, edges and depth

- **Edges, not shadows.** Cards sit on the page with a 1px `ki-outline-low-em`
  hairline (10% ink) and no shadow. A surface declares its depth once, as a
  border or as a shadow, never both.
- **Control boundaries.** A control that can be empty (field, checkbox, radio,
  switch) is edged by `ki-outline-control`, at 3:1 or more on s0–s3.
- **Floating layers.** Shadows use the one elevation scale,
  `ki-elevation-e1` to `e4`: warm and low in light, black in dark.
  - Menus, popovers and tooltips use `e3`, dialogs `e4`.
  - Never add a shadow that is not a token.
- **No translucency.** `ki-effect-component-backdrop-blur` is 0, and fills
  are opaque. The translucent and bevel tokens remain only so another theme
  can turn them back on.
- **Inverse and scrim.** Tooltips are inverse. The dialog scrim dims in both
  schemes.
- **Corners** are soft, not round:
  - buttons 8, 10 or 12px by size;
  - fields 10px, alerts 12px, cards 14px, dialogs 18px;
  - pills and avatars `ki-radius-round`.

## Buttons

| Variant | Look |
| --- | --- |
| `primary` | The ink fill |
| `secondary`, `tertiary` | The same opaque surface with a hairline |
| `quaternary` | Neutral text |
| `ghost` | Accent text |

Prefer `primary`, `secondary`, `quaternary` and `ghost`. `variant` is
hierarchy; `tone` is intent. Never use `variant` to signal danger.

## Type

- **Families.**
  - **Instrument Sans** for UI and body text (`ki-typography-family-body`),
    weight 500 for body text.
  - **Newsreader** for titles and display text
    (`ki-typography-family-display`), weight 500.
  - **JetBrains Mono** for code.
  - A product that wants an all-sans look sets the display family to the body
    family.
- **Roles.** Each is a size and line-height pair.

  | Role | Size / line height |
  | --- | --- |
  | `display-1` | 76 / 80px |
  | `display-2` | 88 / 96px |
  | `display-3` | 104 / 104px |
  | `heading-1` … `heading-6` | 22 → 62px |
  | `title-1` / `title-2` | 15 / 18px |
  | `body-1` / `body-2` | 13 / 15px |
  | `caption-1` / `caption-2` | 11 / 12px |
  | `overline` | 11 / 16px |

- **Use.** Components set UI text in `body-1`; reading text uses `body-2`.
  `caption-1` is for counters and dense meta, never sentences. Display line
  heights are at least 1.0× the size.
- **Tracking** tightens gently on headings and display (`xs` −0.005em to `lg`
  −0.02em).

## Space, motion and states

- **Space.** `ki-space-*` is a rem scale on a 16px root.
  - Compact density (`data-ki-density="compact"`) drops control heights by
    8px and scales padding by 0.75.
  - No pointer target goes below `ki-size-target-min` (24px).
- **Motion.** Durations are 150, 260 and 380ms, and the ease-out has no
  overshoot. Every transition sits behind
  `@media (prefers-reduced-motion: no-preference)`.
- **Focus.** Every focusable element shows a solid 2px ring at a 2px offset
  in `ki-focus-ring-color`, plus a soft glow. Restyle it, never remove it.
- **Preference modes.**
  - More contrast: neutral text 7:1, control boundaries 4.5:1, container
    edges 3:1, a 3px ring.
  - Reduced transparency: every content surface opaque, no blur.
- **Logical properties only.** `dir="rtl"` mirrors every component.

## Contrast floors

| Pair | Minimum |
| --- | --- |
| Text | 4.5:1 |
| Non-text control boundaries and marks | 3:1 |
| More contrast: neutral text | 7:1 |
| More contrast: control boundaries | 4.5:1 |
| More contrast: separators | 3:1 |

- Every component `-bg`/`-fg` pair is measured as text on `ki-surface-s0`.
  Checkbox and radio indicators are measured at 3:1.
- Disabled controls are exempt and stay faint on purpose.

## Material 3

Material 3 is the reference second theme. It proves that reassigning the
theme and semantic layers alone restyles every component.

- Opt in with `@kimen/tokens/css/material3` alongside the default sheet, and
  `data-ki-theme="material3"`.
- It keeps the M3 baseline scheme, tonal fills, Roboto, the M3 shape and type
  scales and M3 elevation.
- Where an M3 baseline ink misses 4.5:1 for text, Kimen darkens it within its
  hue and says so in the token's description.

## Not in this file

- **Copy and voice.** Sentence case, verb-first labels and errors that say
  how to fix the answer. See the component guides.
- **Iconography.** Lucide glyphs through `ki-icon` and per-icon imports. See
  `packages/elements/src/components/ki-icon/docs/site.mdx`.
