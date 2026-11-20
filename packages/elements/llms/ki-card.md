# ki-card

> A card surface for grouping related content, with an optional primary link or action.

## When to use

group related media, a title, supporting text and actions into
one scannable surface. Set `href` for navigation or `interactive` for a
declared action. Give a clickable card one text heading in the header
slot and place secondary controls in the body or footer.

## When not to use

as a form field, fieldset, page landmark, section replacement
or nested card. Use a standalone button or link for a control without
supporting content.

## Examples

The four regions — `media`, `header`, default body and `footer`; supply the heading element yourself, because plain text in the `header` slot carries no heading semantics:

```html
<ki-card>
  <img slot="media" src="/telemetry.png" alt="Orbit trajectory plot" />
  <h3 slot="header">Mission telemetry</h3>
  <p>Latest downlink completed at 14:02 UTC. All systems nominal.</p>
  <ki-button slot="footer" type="button" variant="secondary">View details</ki-button>
</ki-card>
```

Any subset of regions works — a text-only card is valid:

```html
<ki-card>
  <h3 slot="header">Storage almost full</h3>
  <p>You are using 92% of your plan. Consider archiving old projects.</p>
</ki-card>
```

Place independent actions in the `footer` slot.

```html
<ki-card>
  <h3 slot="header">Invite your team</h3>
  <p>Collaborators can review specs and approve merges.</p>
  <ki-button slot="footer" type="button" variant="primary">Invite</ki-button>
  <ki-button slot="footer" type="button" variant="ghost">Later</ki-button>
</ki-card>
```

Use `href` for a primary destination. Use `interactive` to emit the
`ki-activate` action event. Supply a single text heading for either option
and keep secondary controls in their own slot content.

```html
<ki-card href="/incidents/42" variant="outlined">
  <h3 slot="header">Search index rebuild</h3>
  <p>Scheduled for midnight.</p>
  <ki-button slot="footer" type="button" variant="secondary">Bookmark</ki-button>
</ki-card>

<ki-card interactive variant="filled">
  <h3 slot="header">Preview monthly report</h3>
  <p>Review the new report before publishing it.</p>
</ki-card>
```

## Attributes

- `href` (string | undefined, URL): Destination for the card's title link. Supply a text heading in the header slot. A nonblank href takes precedence over interactive.
- `interactive` (boolean | undefined, default false): Gives a titled card a primary button that emits ki-activate. Use href for navigation. Keep other actions in separate controls in the card.
- `variant` ("default" | "elevated" | "filled" | "outlined" | undefined, default 'default'): Surface treatment. Choose elevated for a raised panel, filled for a tinted group or outlined for a bordered surface. Use default to follow the theme's existing card treatment.

## Slots

- (default): Body region for supporting text or arbitrary composed content.
- `footer`: Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.
- `header`: Title region. Supply one nonempty text heading at the surrounding document level for a clickable card.
- `media`: Leading visual region for an image, video or illustration.

## Parts

- `body`: Body region wrapper around the default slot.
- `card`: Card surface: background, border, radius, elevation and region gap.
- `footer`: Footer region wrapper.
- `header`: Header region wrapper.
- `media`: Media region wrapper.
- `trigger`: Native link or action button in a clickable card’s heading.

## Events

- `ki-activate` (CustomEvent<void>): Fires once when the user activates an action card by pointer or keyboard.

## Methods

None.

## CSS custom properties

- `--ki-card-backdrop-filter`: Complete card backdrop filter, off by default.
- `--ki-card-bg`: color used by the card component for background (MarsUI Dashboard masters bind Surface/special/light-s0_dark-s1: white light / Dark/900 dark; #f9f9fa is the nested media panel, so the old s1 value inverted the surface hierarchy).
- `--ki-card-bg-image`: Optional decorative image over the card background.
- `--ki-card-body-padding`: dimension used by the card component for body padding.
- `--ki-card-border-color`: color used by the card component for border color (MarsUI Outline/base_em hairline — painted on large Chart cards; Dashboard_info leaves width 0, which stays the default via ki.card.border-width).
- `--ki-card-border-width`: dimension used by the card component for border width.
- `--ki-card-elevated-bg`: Raised card background.
- `--ki-card-elevated-fg`: Text on the elevated card background.
- `--ki-card-elevated-shadow`: Resting shadow for an elevated card.
- `--ki-card-elevation`: Card resting elevation: MarsUI elevation ramp level e1 (brief §5, drop 0/1/1/-0.5 in the scheme shadow color; replaces the migrated M2-era shadow).
- `--ki-card-fg`: color used by the card component for foreground.
- `--ki-card-filled-bg`: Tinted card background.
- `--ki-card-filled-fg`: Text on the filled card background.
- `--ki-card-footer-padding`: dimension used by the card component for footer padding.
- `--ki-card-gap`: dimension used by the card component for gap (MarsUI Dashboard_info/Chart rhythm between regions 12px; material3 keeps zero via its override).
- `--ki-card-header-padding`: dimension used by the card component for header padding.
- `--ki-card-hover-overlay`: Pointer hover state layer on a primary-action card.
- `--ki-card-hover-shadow`: Hover shadow of a primary-action card.
- `--ki-card-media-padding`: dimension used by the card component for media padding (MarsUI Dashboard masters inset media panels 8px inline; material3 keeps full-bleed zero via its override).
- `--ki-card-media-radius`: dimension used by the card component for slotted media corner radius (MarsUI nested media panel Radius/big_component/radius_sm 20px; formalizes the fallback ki-card.css already consumes).
- `--ki-card-outlined-bg`: Page-coloured background for an outlined card.
- `--ki-card-outlined-border`: Boundary colour for an outlined card.
- `--ki-card-outlined-border-width`: Hairline width for an outlined card.
- `--ki-card-outlined-fg`: Text on the outlined card background.
- `--ki-card-padding-block`: dimension used by the card component for the surface block padding (16px carried by the card surface itself so stacked region paddings no longer double to 32px; formalizes the fallback ki-card.css already consumes).
- `--ki-card-radius`: dimension used by the card component for radius (MarsUI card surfaces ride the big_component scale: Dashboard_info 400x128 binds radius_xs 16px; large Chart cards anchor radius_lg 28px).
- `--ki-card-title-family`: Family used for a clickable card title.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-elevation-e2`: MarsUI Elevation/e2 (cumulative: e1 layers plus 0/3/3/-1.5).
- `--ki-elevation-none`: Flat surfaces carry no resting shadow.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-title-1`: semantic dimension for typography line height title 1.
- `--ki-typography-size-title-1`: semantic dimension for typography size title 1.
