Use a named dialog popover for interactive filters. The host supplies the trigger in the same document or shadow tree.

```html
<ki-button id="filters" type="button" variant="secondary">Filters</ki-button>
<ki-popover for="filters" label="Incident filters" placement="bottom-start">
  <ki-checkbox checked>Open incidents</ki-checkbox>
</ki-popover>
```

Use a toggletip to announce supplementary text and keep focus on the trigger.

```html
<ki-button id="retention" type="button" variant="ghost">About retention</ki-button>
<ki-popover for="retention" kind="toggletip" arrow="false">
  Logs are kept for 30 days.
</ki-popover>
```

Use `open` to drive visibility and listen for `ki-open` and `ki-close` to observe it. In guarded catalog markup, bind actions to slotted controls. A trusted host can listen to the popover's two lifecycle events through the DOM.
