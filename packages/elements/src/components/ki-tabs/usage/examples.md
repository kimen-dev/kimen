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
