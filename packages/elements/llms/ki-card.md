# ki-card

> A non-interactive card surface for grouping related content.

## When to use

group related media, heading, supporting text and actions into
one scannable surface visually distinct from the page; fill any subset of
regions. Supply the heading element yourself in the `header` slot — plain
text slotted there carries no heading semantics for assistive technology.

## When not to use

as a button or link target, form control, fieldset, page
landmark, section replacement or nested card. For an interactive card, slot
the button or link INSIDE a region (whole-card interactivity is a future
feature, not this component).

## Examples

The four regions — `media`, `header`, default body and `footer`; supply the heading element yourself, because plain text in the `header` slot carries no heading semantics:

```html
<ki-card>
  <img slot="media" src="/telemetry.png" alt="Orbit trajectory plot" />
  <h3 slot="header">Mission telemetry</h3>
  <p>Latest downlink completed at 14:02 UTC. All systems nominal.</p>
  <ki-button slot="footer" type="button" variant="tertiary">View details</ki-button>
</ki-card>
```

Any subset of regions works — a text-only card is valid:

```html
<ki-card>
  <h3 slot="header">Storage almost full</h3>
  <p>You are using 92% of your plan. Consider archiving old projects.</p>
</ki-card>
```

Actions go in the `footer` slot (no dedicated actions slot exists in v1), and interactive elements always sit inside a region — the card itself is never a click target:

```html
<ki-card>
  <h3 slot="header">Invite your team</h3>
  <p>Collaborators can review specs and approve merges.</p>
  <ki-button slot="footer" type="button" variant="primary">Invite</ki-button>
  <ki-button slot="footer" type="button" variant="ghost">Later</ki-button>
</ki-card>
```

## Attributes

None.

## Slots

- (default): Body region for supporting text or arbitrary composed content.
- `footer`: Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.
- `header`: Title region. The author supplies the heading element at the surrounding document level; plain text here carries no heading semantics.
- `media`: Leading visual region for an image, video or illustration.

## Parts

- `body`: Body region wrapper around the default slot.
- `card`: Card surface: background, border, radius, elevation and region gap.
- `footer`: Footer region wrapper.
- `header`: Header region wrapper.
- `media`: Media region wrapper.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-card-bg`: color used by the card component for background (MarsUI Dashboard masters bind Surface/special/light-s0_dark-s1: white light / Dark/900 dark; #f9f9fa is the nested media panel, so the old s1 value inverted the surface hierarchy).
- `--ki-card-body-padding`: dimension used by the card component for body padding.
- `--ki-card-border-color`: color used by the card component for border color (MarsUI Outline/base_em hairline — painted on large Chart cards; Dashboard_info leaves width 0, which stays the default via ki.card.border-width).
- `--ki-card-border-width`: dimension used by the card component for border width.
- `--ki-card-elevation`: Card resting elevation: MarsUI elevation ramp level e1 (brief §5, drop 0/1/1/-0.5 in the scheme shadow color; replaces the migrated M2-era shadow).
- `--ki-card-fg`: color used by the card component for foreground.
- `--ki-card-footer-padding`: dimension used by the card component for footer padding.
- `--ki-card-gap`: dimension used by the card component for gap (MarsUI Dashboard_info/Chart inter-region rhythm 12px; material3 keeps zero via its override).
- `--ki-card-header-padding`: dimension used by the card component for header padding.
- `--ki-card-media-padding`: dimension used by the card component for media padding (MarsUI Dashboard masters inset media panels 8px inline; material3 keeps full-bleed zero via its override).
- `--ki-card-media-radius`: dimension used by the card component for slotted media corner radius (MarsUI nested media panel Radius/big_component/radius_sm 20px; formalizes the fallback ki-card.css already consumes).
- `--ki-card-padding-block`: dimension used by the card component for the surface block padding (16px carried by the card surface itself so stacked region paddings no longer double to 32px; formalizes the fallback ki-card.css already consumes).
- `--ki-card-radius`: dimension used by the card component for radius (MarsUI card surfaces ride the big_component scale: Dashboard_info 400x128 binds radius_xs 16px; large Chart cards anchor radius_lg 28px).
- `--ki-elevation-e2`: MarsUI Elevation/e2 (cumulative: e1 layers plus 0/3/3/-1.5).
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-typography-family-body`: semantic font family for typography family body.
