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
