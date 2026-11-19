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
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed strip size: every `ki-tab` it holds is 24, 32, 40, 48 or 56px tall in onmars, with its text, and the gap between tabs follows. The strip decides for all its tabs; a tab has no size of its own. An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the controls around the strip. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
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

- `--ki-tab-lg-font-size`: dimension used by the tab component for lg font size (Tab-nav-item 10048:1068 lg: UI/body-2).
- `--ki-tab-lg-line-height`: dimension used by the tab component for lg line height (Tab-nav-item 10048:1068 lg: UI/body-2).
- `--ki-tab-lg-min-block-size`: dimension used by the tab component for lg min block size (Tab-nav-item 10048:1068 lg: 48px).
- `--ki-tab-sm-font-size`: dimension used by the tab component for sm font size (Tab-nav-item 10048:1068 sm: UI/para).
- `--ki-tab-sm-line-height`: dimension used by the tab component for sm line height (Tab-nav-item 10048:1068 sm: UI/para).
- `--ki-tab-sm-min-block-size`: dimension used by the tab component for sm min block size (Tab-nav-item 10048:1068 sm: 32px).
- `--ki-tab-xl-font-size`: dimension used by the tab component for xl font size (Tab-nav-item 10048:1068 xl: UI/title-2).
- `--ki-tab-xl-line-height`: dimension used by the tab component for xl line height (Tab-nav-item 10048:1068 xl: UI/title-2).
- `--ki-tab-xl-min-block-size`: dimension used by the tab component for xl min block size (Tab-nav-item 10048:1068 xl: 56px).
- `--ki-tab-xs-font-size`: dimension used by the tab component for xs font size (Tab-nav-item 10048:1068 xs: UI/caption-2). Figma draws caption_1, 10px; caption_2, 12px, is the smallest text the library ships (spec 050 D7).
- `--ki-tab-xs-line-height`: dimension used by the tab component for xs line height (Tab-nav-item 10048:1068 xs: UI/caption-2).
- `--ki-tab-xs-min-block-size`: dimension used by the tab component for xs min block size (Tab-nav-item 10048:1068 xs: 24px).
- `--ki-tabs-divider-color`: color used by the tabs component for divider color.
- `--ki-tabs-divider-width`: dimension used by the tabs component for the tablist divider width (the Tab_nav bar has no stroke; the hook stays for consumers to opt back in — material3 keeps its hairline via its override).
- `--ki-tabs-gap`: dimension used by the tabs component for gap (MarsUI md bar item gap Space/8xl 26px; the gap carries all spacing now that items have zero inline padding).
- `--ki-tabs-lg-gap`: dimension used by the tabs component for the lg gap between tabs (Tab-nav 10048:1249 lg binds Space/9xl, 28px).
- `--ki-tabs-sm-gap`: dimension used by the tabs component for the sm gap between tabs (Tab-nav 10048:1249 sm binds Space/7xl, 24px).
- `--ki-tabs-xl-gap`: dimension used by the tabs component for the xl gap between tabs (Tab-nav 10048:1249 xl binds Space/10xl, 32px).
- `--ki-tabs-xs-gap`: dimension used by the tabs component for the xs gap between tabs (Tab-nav 10048:1249 xs binds Space/5xl, 20px).
- `--ki-typography-family-body`: semantic font family for typography family body.
