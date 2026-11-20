Tabs pair with panels through a shared `value`; the group's `value` selects the active pair and `label` names the tablist:

```html
<ki-tabs label="Settings" value="email">
  <ki-tab value="email">Email</ki-tab>
  <ki-tab value="security">Security</ki-tab>
  <ki-tab-panel value="email">Email delivery preferences</ki-tab-panel>
  <ki-tab-panel value="security">Security and sign-in preferences</ki-tab-panel>
</ki-tabs>
```

A disabled tab stays visible but cannot be selected by any modality; user selection dispatches a composed `ki-change` event carrying the new value in `detail.value` (programmatic `value` writes stay silent):

```html
<ki-tabs label="Billing" value="plans">
  <ki-tab value="plans">Plans</ki-tab>
  <ki-tab value="invoices" disabled>Invoices</ki-tab>
  <ki-tab-panel value="plans">Plan management</ki-tab-panel>
  <ki-tab-panel value="invoices">Invoice history</ki-tab-panel>
</ki-tabs>
```

Use a primary group for tabs at screen level. In content, use
`variant="secondary"` for a full-width selection indicator. A decorative
SVG in a tab's `icon` slot stacks above the label in primary tabs and
appears before the label in secondary tabs. Set `icon-layout="inline"` or
`icon-layout="stacked"` to override the layout for the group.

```html
<ki-tabs label="Mail sections" variant="secondary">
  <ki-tab value="inbox">
    <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 5h18v14H3zM3 5l9 7 9-7" />
    </svg>
    Inbox
  </ki-tab>
  <ki-tab-panel value="inbox">Incoming messages</ki-tab-panel>
</ki-tabs>
```
