`label` is the entire tooltip content, reflected to the slotted trigger's accessible description; the trigger must already carry its own accessible name:

```html
<ki-tooltip label="Copies a shareable link to the clipboard">
  <ki-button type="button">Copy link</ki-button>
</ki-tooltip>
```

`placement` (default `top`; also `bottom`, `start`, `end`) is a preference — the component flips or clamps it to keep the bubble inside the viewport:

```html
<ki-tooltip label="Downloads the report as PDF" placement="bottom">
  <ki-button type="button">Export</ki-button>
</ki-tooltip>
```

An empty or whitespace-only `label` renders no tooltip and exposes no description — useful for conditional hints; never put essential or unique information in a tooltip:

```html
<ki-tooltip label="">
  <ki-button type="button">No hint here</ki-button>
</ki-tooltip>
```
