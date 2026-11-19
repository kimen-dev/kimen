The default slot holds exactly one decorative icon; the mandatory `label` is the accessible name — the slot never contributes to it:

```html
<ki-icon-button label="Close">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
</ki-icon-button>
```

Visual hierarchy comes from `variant` (default `secondary`). In the original momentary variants, `tone` (default `neutral`) carries semantic intent such as success or danger.

```html
<ki-icon-button variant="primary" label="Play">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
</ki-icon-button>
<ki-icon-button variant="ghost" tone="danger" label="Delete row">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" stroke="currentColor" stroke-width="2" fill="none" /></svg>
</ki-icon-button>
```

Add `toggle` for an action such as Bookmark that stays pressed until the next activation. `variant="outline"` uses an outline at rest and a fill when selected. Give the pressed version a decorative icon in the `selected` slot.

```html
<ki-icon-button toggle variant="outline" label="Bookmark">
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4z" stroke="currentColor" stroke-width="2" />
  </svg>
  <svg slot="selected" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
</ki-icon-button>
```

With an empty `selected` slot, the default inline SVG takes a `currentColor` fill while pressed. Let its paths inherit `fill`. Keep `label` the same in both states. Activating the control emits `ki-change` with `{ selected }`. Set the `selected` attribute for the initial state or write the property to update it silently.

Sizes run `xs` (24px, exactly the WCAG 2.2 pointer-target floor) through `xl`, default `md`; each pairs a square box with its own icon size:

```html
<ki-icon-button size="xs" label="Clear">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
</ki-icon-button>
<ki-icon-button size="xl" variant="primary" label="Record">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor" /></svg>
</ki-icon-button>
```

Pair with `ki-tooltip` for sighted discoverability: the tooltip's `label` becomes the accessible description while the icon button's `label` stays the accessible name:

```html
<ki-tooltip label="Closes the dialog">
  <ki-icon-button label="Close">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" /></svg>
  </ki-icon-button>
</ki-tooltip>
```

While the action it started is in progress, set `loading` instead of `disabled`: the icon button keeps its size, its focus and its `label`, ignores further activation, draws a spinner in place of the icon and announces `loading-label` (default "Loading") as a polite status message:

```html
<ki-icon-button label="Refresh" loading loading-label="Refreshing">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2" stroke="currentColor" stroke-width="2" fill="none" /></svg>
</ki-icon-button>
```
