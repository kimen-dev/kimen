A panel is visible only while the `ki-tab` sharing its `value` is selected; the default slot holds the content:

```html
<ki-tabs label="Documentation" value="guide">
  <ki-tab value="guide">Guide</ki-tab>
  <ki-tab value="reference">Reference</ki-tab>
  <ki-tab-panel value="guide">Step-by-step instructions.</ki-tab-panel>
  <ki-tab-panel value="reference">Complete API tables.</ki-tab-panel>
</ki-tabs>
```

Panels hold arbitrary content, form controls included; every panel mounts eagerly (no lazy mounting exists):

```html
<ki-tabs label="Account" value="contact">
  <ki-tab value="contact">Contact</ki-tab>
  <ki-tab value="password">Password</ki-tab>
  <ki-tab-panel value="contact">
    <ki-input label="Work email" name="email" type="email"></ki-input>
  </ki-tab-panel>
  <ki-tab-panel value="password">Password change form.</ki-tab-panel>
</ki-tabs>
```

The first panel with a given `value` owns it — duplicate or orphan panels stay hidden without error:

```html
<ki-tabs label="Report" value="summary">
  <ki-tab value="summary">Summary</ki-tab>
  <ki-tab-panel value="summary">Quarterly totals.</ki-tab-panel>
  <ki-tab-panel value="detail">Never shown: no tab shares this value.</ki-tab-panel>
</ki-tabs>
```
