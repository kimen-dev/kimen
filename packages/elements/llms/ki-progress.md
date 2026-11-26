# ki-progress

> A token-styled, non-interactive progress indicator for known or unknown duration work.

## When to use

communicate advancement of an ongoing task such as upload,
download, installation or multi-step processing. Use `value`/`max` when
the completed fraction is known; use `indeterminate` when work is ongoing
but its duration cannot be measured, including loading-indicator use cases.
Choose `linear` in page flows and lists, and `circular` in compact or
centered placements. Always set `label` to what is progressing.

## When not to use

static measurements within a known range such as disk
usage or scores (gauge/meter), step-by-step wizard navigation (stepper),
skeleton placeholders while content loads, or operations that finish in
under about one second.

## Examples

A determinate task; `label` names what is progressing (without it the progressbar exposes no accessible name) and `value` is clamped to `0..max` for both presentation and ARIA:

```html
<ki-progress label="Uploading report.pdf" value="42"></ki-progress>
```

When the total is not 100, set `max`; non-finite, zero or negative totals normalize to `100`:

```html
<ki-progress label="Installing dependencies" value="3" max="8"></ki-progress>
```

Unknown-duration work sets `indeterminate` instead of a fabricated `value` (which is ignored while it is set); the motion is declared only when reduced motion is not requested:

```html
<ki-progress label="Contacting server" indeterminate></ki-progress>
```

`shape="circular"` fits compact or centered placements; unknown shape values render linear:

```html
<ki-progress label="Export progress" shape="circular" value="80"></ki-progress>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-progress`: the default, only the tokens ki-progress needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `indeterminate` (boolean, default false): Unknown-duration mode. When set, no completed fraction or current value is exposed. Its motion is declared only when reduced motion is not requested. When to use: show ongoing work whose duration or total cannot be measured. When NOT to use: do not use for known fractions; use `value` and `max`.
- `label` (string, required): Accessible name applied to the internal progressbar. Always set this to what is progressing, such as "Uploading report.pdf". Without it the element renders but exposes no accessible name, so the catalog contract requires it. When NOT to use: do not use a generic label such as "Loading" when the task can be named more specifically.
- `max` (number, default 100): Total amount. Non-finite, zero or negative values normalize to `100` for presentation and ARIA. When to use: set when a determinate task's total is not 100. When NOT to use: omit for conventional percentage-style progress.
- `shape` ("circular" | "linear", default 'linear'): Structural presentation. Use `linear` in page flows and lists; use `circular` in compact or centered placements. Unknown values render linear. When NOT to use: do not use shape to encode semantic status or task intent.
- `value` (number, default 0): Completed amount. Presentation and ARIA clamp this value to `0..max`; malformed values fall back to `0`. Ignored while `indeterminate` is set. When to use: set with `max` for determinate task advancement. When NOT to use: do not set a fabricated value for unknown-duration work; set `indeterminate` instead.

## Slots

None.

## Parts

- `indicator`: The advancing fill or arc: indicator ink and indeterminate animation.
- `track`: The full channel or ring: track ink and radius/stroke geometry.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-2`: M3 md.sys.motion.duration.medium2 (300ms). onmars: MarsUI moderate step (240ms).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-progress-circular-size`: dimension used by the progress component for circular size.
- `--ki-progress-circular-track-width`: dimension used by the progress component for circular track width.
- `--ki-progress-indeterminate-duration`: duration used by the progress component for progress indeterminate duration.
- `--ki-progress-indicator-color`: MarsUI fills components with the med-em (500) tone of the ramp (marsui-design-dna.md §1; specs/002-ki-button/design-extraction.md §§2.1-2.4 delta 500-vs-high-em): progress indicator uses surface.primary-med-em.
- `--ki-progress-linear-radius`: dimension used by the progress component for linear radius.
- `--ki-progress-linear-thickness`: dimension used by the progress component for linear thickness.
- `--ki-progress-track-color`: color used by the progress component for track color.
- `--ki-typography-family-body`: semantic font family for typography family body.
