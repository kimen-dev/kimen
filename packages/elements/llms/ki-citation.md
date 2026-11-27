# ki-citation

> A numbered inline link from an answer to a source card.

## When to use

Next to a claim supported by a `ki-source` in the same document
or shadow root. Repeat the same reference for subsequent mentions.

## When not to use

To cite a source outside this tree or replace a standalone
link. Use `ki-link` for direct navigation.

## Examples

# Using ki-citation

Place a citation after its claim and set `ref` to the matching source identifier.

```html
<p>The methods account for the difference<ki-citation ref="methods"></ki-citation>.</p>
<ki-sources>
  <ki-source id="methods" title="Study design" href="/methods"></ki-source>
</ki-sources>
```

Use `citationRef` in JSX. Tab to the link for a preview. Escape dismisses the
preview, and Enter opens the list and moves focus to the source link.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-citation`: the default, only the tokens ki-citation needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `ref` (string, required): ID or source-id of the source. Use the `ref` attribute in HTML and `citationRef` in JSX so framework refs remain available.
- `label-template` (string, default 'Source {number}: {title}'): Localized link name with `{number}` and `{title}` placeholders.

## Slots

None.

## Parts

- `link`: Focusable citation link.
- `marker`: Visible citation number.
- `preview`: Anchored title and hostname preview.
- `preview-domain`: Hostname in the preview.
- `preview-title`: Title in the preview.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-citation-backdrop-filter`: Complete backdrop filter for a citation marker. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-citation-bg`: Background of a citation marker. Default: `var(--ki-surface-s2)`.
- `--ki-citation-bg-image`: Optional decorative image over a citation marker. Default: `var(--ki-surface-image-none)`.
- `--ki-citation-fg`: Text on a citation marker. Default: `var(--ki-text-high-em)`.
- `--ki-citation-hover-bg`: Background of a hovered citation marker. Default: `var(--ki-surface-s3)`.
- `--ki-citation-hover-fg`: Text on a hovered citation marker. Default: `var(--ki-text-high-em)`.
- `--ki-citation-padding`: Inline padding of the citation number. Default: `var(--ki-source-reference-marker-padding)`.
- `--ki-citation-preview-backdrop-filter`: Complete backdrop filter for the citation preview. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-citation-preview-bg`: Background of the title and hostname preview. Default: `var(--ki-surface-s0)`.
- `--ki-citation-preview-bg-image`: Optional decorative image over the citation preview. Default: `var(--ki-surface-image-none)`.
- `--ki-citation-preview-border`: Edge color of the citation preview. Default: `var(--ki-outline-low-em)`.
- `--ki-citation-preview-border-width`: Edge width of the citation preview. Default: `var(--ki-source-reference-hairline)`.
- `--ki-citation-preview-fg`: Text on the citation preview. Default: `var(--ki-text-high-em)`.
- `--ki-citation-preview-max-inline-size`: Maximum width of the citation preview. Default: `var(--ki-source-reference-preview-width)`.
- `--ki-citation-preview-padding`: Inset around the preview content. Default: `var(--ki-source-reference-card-padding)`.
- `--ki-citation-preview-radius`: Corner radius of the citation preview. Default: `var(--ki-source-reference-card-radius)`.
- `--ki-citation-preview-shadow`: Elevation of the citation preview. Default: onmars `var(--ki-elevation-e2)`, material3 `var(--ki-elevation-e1)`.
- `--ki-citation-radius`: Corner radius of a citation marker. Default: `var(--ki-source-reference-marker-radius)`.
- `--ki-citation-size`: Minimum painted edge of a citation marker. Default: `var(--ki-source-reference-marker-size)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold. Default: `var(--ki-font-weight-body-semibold)`.
