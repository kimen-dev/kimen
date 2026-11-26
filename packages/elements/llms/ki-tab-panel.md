# ki-tab-panel

> One content view paired with a `ki-tab` inside `ki-tabs`.

## When to use

hold the content for one peer tab view, sharing `value` with
its `ki-tab`.

## When not to use

standalone, as lazy mounting, or for page
navigation; orphan and duplicate panels are hidden by the parent group.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-tab-panel`: the default, only the tokens ki-tab-panel needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `value` (string, default ''): Pairing identifier shared with a `ki-tab`. The first panel with a value owns it; duplicate or orphan panels stay hidden.

## Slots

- (default): Panel content.

## Parts

- `panel`: Panel surface.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-tab-panel-bg`: color used by the tab panel component for background (Tab_nav masters have no panel chrome: content sits on the ambient surface; the panel never paints a surface it does not own).
- `--ki-tab-panel-fg`: color used by the tab panel component for foreground (pairs a scheme-correct text color with whatever ground the transparent panel sits on — fixes black-on-black slotted text in dark).
- `--ki-tab-panel-focus-ring-color`: color used by the tab panel component for focus ring color.
- `--ki-tab-panel-focus-ring-offset`: dimension used by the tab panel component for focus ring offset.
- `--ki-tab-panel-focus-ring-width`: dimension used by the tab panel component for focus ring width.
- `--ki-tab-panel-padding-block`: dimension used by the tab panel component for padding block.
- `--ki-tab-panel-padding-inline`: dimension used by the tab panel component for padding inline.
- `--ki-typography-family-body`: semantic font family for typography family body.
