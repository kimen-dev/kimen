# Public markup

```html
<button id="grace-help" type="button">Retention</button>
<ki-tooltip for="grace-help" heading="Grace period">
  Deleted projects stay restorable for 30 days.
</ki-tooltip>

<button id="contrast-help" type="button">Contrast mode</button>
<ki-popover for="contrast-help" kind="toggletip" appearance="rich" label="About contrast mode" arrow="false">
  <strong>Contrast mode</strong>
  <p>Kimen follows the system setting.</p>
  <ki-button size="sm" variant="ghost">Learn more</ki-button>
</ki-popover>
```

The tooltip body accepts direct text only. To provide a link, button or
other control, use the click-opened popover. Rich tooltip descriptions are
available to assistive technology before the visual panel opens.

The popover's `appearance` defaults to `default`. Both rich surfaces
take their paint, typography and sizing from the `--ki-tooltip-rich-*`
token family.
