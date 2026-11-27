# ki-indicator

> A non-interactive page-position indicator: one dot per position of a bounded sequence, exactly one highlighted as current.

## When to use

show the current position within a bounded, sequential set of
peer views whose navigation lives elsewhere: carousel slides, unlabeled
onboarding steps, gallery pages. Wire `count` and `current` (1-based) to
the sequence the consumer renders and give it a `label` (required
authoring: assistive technology reads one graphic named
"<label>, <current> / <count>"). Below two positions an indicator carries
no information.

## When not to use

section navigation (ki-tabs), task completion or loading
(ki-progress), labeled step flows (ki-stepper), interactive pagination
(ki-pagination — the indicator takes no focus and no input; navigation
belongs to the composing carousel's own controls), or conveying quantity
without a current position. Position
changes are never announced by the indicator itself (no live region): the
composing carousel owns announcements.

## Examples

Two integers determine everything — one dot per `count` position with the 1-based `current` highlighted — and `label` names the sequence (the exposed name reads "&lt;label&gt;, &lt;current&gt; / &lt;count&gt;"):

```html
<ki-indicator label="Slide position" count="5" current="2"></ki-indicator>
```

Malformed declarations never break the row: `current` above `count` clamps to the last position, a non-numeric one falls back to the first, and an invalid `count` renders zero dots (an authoring mistake, not an error state):

```html
<ki-indicator label="Slide position" count="5" current="9"></ki-indicator>
<!-- fifth dot current -->
```

Drive it from the composing carousel by updating `current` (1-based); the highlight and exposed text follow immediately, and the indicator never announces changes (no live region) — announcements belong to the carousel:

```html
<ki-indicator id="gallery-position" label="Photo position" count="4" current="1"></ki-indicator>

<script type="module">
  const indicator = document.getElementById('gallery-position');
  indicator.current = 3;
</script>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-indicator`: the default, only the tokens ki-indicator needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `count` (number | undefined, minimum 0, maximum 20): Number of positions (non-negative integer): one dot renders per position, in position order. A missing, non-numeric or negative value renders zero dots — an authoring mistake by catalog guidance, never an error state or a rendering failure (FR-002; empty ki-list precedent). At most 20 positions render, and the catalog accepts no more: the indicator serves a short sequence of peer views, 20 dots are the longest row that fits a 320 CSS px viewport (the WCAG reflow width) in both shipped themes, and one dot renders per position, so the bound also caps the work a single node can demand. A larger value renders 20.
- `current` (number | undefined, minimum 1, maximum 20): The current position, 1-based to match the exposed position text ("2 / 5"). Exactly one dot presents the current appearance whenever `count` >= 1: values above `count` clamp to the last position, values below 1 and non-numeric values fall back to the first (FR-003). Updates re-render in place — the highlight and the exposed text follow immediately, re-applying the normalization (FR-004). The catalog accepts 1 to 20, the positions a bounded `count` can have.
- `label` (string, required): Accessible name of the sequence ("Slide position"). The exposed name combines it with the wordless numeric position — "<label>, <current> / <count>" — on a single non-interactive graphic; without a label the name degrades to the bare position text (documented as required authoring, FR-005). The label is never rendered visually and position changes are never announced (no live region, FR-006).

## Slots

None.

## Parts

- `dot`: Every dot: size, shape and color.
- `dot-current`: Additionally on the current dot: the highlight treatment.
- `indicator`: The row container: layout and the token-driven gap.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-indicator-dot-block-size`: dimension used by the indicator component for the resting dot block size: the 8px circle diameter measured in the State=inactive vector (the 16px frame height is row alignment, carried by the current dot). Default: `var(--ki-space-md)`.
- `--ki-indicator-dot-color`: color used by the indicator component for the resting dot fill: Inverse_white/alpha_48 (Black/48 light, White/48 dark) — a declared a11y deviation from the MarsUI binding Inverse_white/alpha_18, which reads 1.53:1 light and 1.64:1 dark against the page; alpha_48 is the first step of the same ramp that clears the 3:1 FR-012 and WCAG 1.4.11 ask. The scheme flip rides the semantic layer. Default: onmars `var(--ki-inverse-white-alpha-48)`, material3 `var(--ki-outline-control)`.
- `--ki-indicator-dot-current-block-size`: dimension used by the indicator component for the current dot block size: Space/3xl, the exact variable bound as the 16px height of the State=active pill (the full row line; declared family extension, design-extraction §Decisiones). Default: onmars `var(--ki-space-3xl)`, material3 `var(--ki-space-md)`.
- `--ki-indicator-dot-current-color`: color used by the indicator component for the current dot treatment: Inverse_white/alpha_48, the same step as the resting dots — the MarsUI State=active ring vector binds the variable of the resting fill, and its alpha_18 reads 1.53-1.64:1 against the page (declared a11y deviation, FR-012). Painted as the pill ring in onmars, where elongation carries the state; as the solid dot in themes that zero the hole. Default: onmars `var(--ki-inverse-white-alpha-48)`, material3 `var(--ki-surface-inverse-white)`.
- `--ki-indicator-dot-current-hole-block-size`: dimension used by the indicator component for the block size of the transparent hole cut from the current pill: the 6px cutout height measured in the State=active vector; the ring width derives by construction as (current block size − hole block size) / 2 and a theme resolves it to zero for a solid dot (declared family extension, design-extraction §Decisiones). Default: onmars `var(--ki-space-sm)`, material3 `var(--ki-space-zero)`.
- `--ki-indicator-dot-current-inline-size`: dimension used by the indicator component for the current dot inline size: Space/10xl, the exact variable bound as the 32px width of the State=active pill — the MarsUI elongation lives here, never in an attribute (FR-007). Default: onmars `var(--ki-space-10xl)`, material3 `var(--ki-space-md)`.
- `--ki-indicator-dot-current-radius`: dimension used by the indicator component for the current dot shape: Radius/radius_round bound in Figma — the pill is a radius token, never an attribute (002 shape precedent). Default: `var(--ki-radius-round)`.
- `--ki-indicator-dot-inline-size`: dimension used by the indicator component for the resting dot inline size: Space/md, the exact variable bound as the 8px width of the State=inactive symbol; the painted circle is 8x8 centered in the 16px row line. Default: `var(--ki-space-md)`.
- `--ki-indicator-dot-radius`: dimension used by the indicator component for the resting dot shape: Radius/radius_round bound in Figma — the round dot is a radius token, never an attribute (002 shape precedent). Default: `var(--ki-radius-round)`.
- `--ki-indicator-gap`: dimension used by the indicator component for the space between dots: Space/sm, the exact variable bound as the 6px gap of the composed Nav_indicator row (node 14195:5866, specs/024-ki-indicator/design-extraction.md). Default: onmars `var(--ki-space-sm)`, material3 `var(--ki-space-md)`.
- `--ki-indicator-motion-duration`: duration used by the indicator component for the highlight transfer between dots: the Figma set documents no motion, so onmars resolves the single transition to the fast semantic duration (FR-008; disabled under reduced motion by construction). Default: `var(--ki-motion-duration-fast)`.
- `--ki-indicator-motion-easing`: easing used by the indicator component for the highlight-transfer transition (MarsUI standard curve; previously the UA default ease applied). Default: `var(--ki-motion-easing-standard)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-standard-decelerate`: Utility entrance curve. M3 md.sys.motion.easing.standard-decelerate. onmars: the MarsUI decelerate curve (ki.easing.out). Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
