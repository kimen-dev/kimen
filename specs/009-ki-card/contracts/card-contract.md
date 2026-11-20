# Public contract: `<ki-card>`

The behavior contract is `specs/009-ki-card/feature.feature` (S1–S8). This
document freezes the public API surface the scenarios observe. Any deviation
discovered during implementation re-enters through the spec, not through code
(Art. II).

## Element

`<ki-card>` groups related content and optionally offers a primary link or
action. It is registered by `@kimen/elements` and exported individually at
`dist/components/ki-card.js`.

## Attributes / properties

`variant`, `href` and `interactive` follow the
[CardVariants contract](../../079-card-variants/contracts/card-variants.md).
An unrecognized variant renders the default appearance (S3, FR-010).

## Slots

Regions render in the documented reading order: media, header, body, footer
(S1). A region with no slotted content collapses completely — no reserved
space, no padding, no gap contribution (S2, FR-003).

| Slot | Contract |
|---|---|
| `media` | Leading visual (image, video, illustration). Both shipped themes zero its padding (edge-to-edge media); a theme may pad it instead — `--ki-card-media-padding` decides, never markup. |
| `header` | Title area. The author supplies the heading at the surrounding document level. A clickable card uses one text heading as its primary control. |
| *(default)* | Body: supporting text or arbitrary composed content. |
| `footer` | Closing region; actions (e.g. `ki-button`) compose here. No dedicated `actions` slot in v1. |

## Parts

Customization ladder: tokens first, then parts, then slots.

| Part | Contract |
|---|---|
| `card` | The card surface (background, border, radius, elevation, gap). |
| `media` | The media region wrapper. |
| `header` | The header region wrapper. |
| `body` | The body region wrapper (default slot). |
| `footer` | The footer region wrapper. |

## Events

Action cards emit `ki-activate`. Separate controls keep their pointer and
keyboard behavior; a page listening to a slotted button observes exactly one
activation (S8, FR-005).

## Accessibility contract

The card contributes **no role, name or state of its own** — not `article`,
not `group`, not `region` (S5, FR-006): its accessible structure derives
entirely from the slotted content. A passive card adds zero keyboard stops (S4, FR-001). A clickable card
adds one named heading link or button; separate controls stay focusable.

## CSS custom properties (component token layer)

```text
--ki-card-bg                  card surface color
--ki-card-fg                  default text color on the surface
--ki-card-border-color        border color (outlined themes; transparent otherwise)
--ki-card-border-width        border width
--ki-card-radius              corner radius
--ki-card-elevation           box-shadow (elevated themes; none otherwise)
--ki-card-gap                 block gap between rendered regions
--ki-card-media-padding       per-region padding (0 in both shipped themes: full-bleed)
--ki-card-header-padding      per-region padding
--ki-card-body-padding        per-region padding
--ki-card-footer-padding      per-region padding
```

Guarantees:

- Every visual property resolves from `--ki-card-*`; those resolve from the
  001 semantic layer (Art. VI). Zero hardcoded visual values.
- The default treatment uses the theme's existing surface, border and
  elevation. The CardVariants extension adds token-driven explicit variants.
- Padding lives on the regions, never on the card surface (FR-009): a theme
  bleeds media by zeroing `--ki-card-media-padding`, pads it by setting it.
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs)

- **When to use**: grouping related content — media, heading, supporting
  text, actions — into one scannable surface visually distinct from the
  page; the summary entry point to a detail. Fill any subset of regions.
  Supply the heading element yourself in the `header` slot.
- **When to use primary activation**: one destination or primary action
  with a title. Secondary controls compose in the slots independently.
- **Avoid using a card** as a form control, fieldset, page landmark, section
  replacement or nested card.

## Compatibility

First release of the element (pre-1.0 line): additive MINOR. Removing or
renaming anything above after first publish is MAJOR per Art. IX.

## Composition constraints (review round 1 additions)

- **Whitespace collapse scope**: the empty-region collapse treats
  whitespace-only TEXT NODES as empty. Text nodes can only reach the default
  (body) slot — named slots require elements, and any slotted ELEMENT counts
  as content even if visually empty (an `<img>` has no text; the component
  cannot judge visual emptiness).
- **Clipping**: the card surface clips its regions to the radius
  (`overflow: hidden`) so full-bleed media honors the corner shape. Slotted
  absolutely-positioned overlays that escape the card box will be clipped;
  top-layer content (`popover`, `<dialog>`) is unaffected.
