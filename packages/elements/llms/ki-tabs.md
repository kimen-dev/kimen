# ki-tabs

> A tab group for switching between peer content views.

## When to use

switch between small sets of peer views inside the same page,
with one visible panel at a time.

## When not to use

selecting form values
(use `ki-radio-group`), page navigation (use links), step flows, or
standalone `ki-tab` / `ki-tab-panel` children outside this group.

## Examples

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

## Attributes

- `label` (string | undefined): Accessible name for the tablist. Always provide one when multiple tab groups may appear in a view. When NOT to use: do not use `label` as a visible heading; render visible context in surrounding content.
- `value` (string, default ''): Resolved selected value. The attribute declares the initial request; the live property falls back to the first enabled owner tab, or `""` when no tab is selectable. Programmatic writes are silent.

## Slots

- (default): `ki-tab` and `ki-tab-panel` children. Tabs are auto-assigned to an internal named slot as managed output.

## Parts

- `tablist`: Internal row around the tab strip: gap, alignment and the divider. The strip inside it carries the `tablist` role.

## Events

- `ki-change` (CustomEvent<{ value: string }>): Fired once after a user-driven selection change from pointer or keyboard navigation. `detail.value` is the resolved selected value and `value` is already current when listeners run. Programmatic `value` writes and first-render fallback are silent.

## Methods

None.

## CSS custom properties

- `--ki-tabs-divider-color`: color used by the tabs component for divider color.
- `--ki-tabs-divider-width`: dimension used by the tabs component for the tablist divider width (the Tab_nav bar has no stroke; the hook stays for consumers to opt back in — material3 keeps its hairline via its override).
- `--ki-tabs-gap`: dimension used by the tabs component for gap (MarsUI md bar item gap Space/8xl 26px; the gap carries all spacing now that items have zero inline padding).
- `--ki-typography-family-body`: semantic font family for typography family body.
