# ki-sources

> A disclosure with the ordered sources behind an answer.

## When to use

To show the evidence behind an answer. Add direct `ki-source`
children and place `ki-citation` markers next to the claims they support.

## When not to use

For ordinary navigation, unrelated links, or form controls.

## Examples

# Using Sources

Put a citation immediately after the clause it supports. Put the source
definitions directly inside the corresponding disclosure. The list shows
sources in order of first citation and adds uncited sources in declaration order.

```html
<p>The study design<ki-citation ref="methods"></ki-citation> explains the results.</p>
<ki-sources>
  <ki-source
    id="methods"
    href="https://example.org/methods"
    title="Study design"
    snippet="How the study ran."
  ></ki-source>
</ki-sources>
```

Use `open` to start with the list expanded. Use unique source identifiers
within each document or shadow root. Hover or focus a citation to see its
title and hostname. Activate it to expand the list and focus the title link.
The card links can be used independently of the inline markers.

When importing individual elements, register all three tags with their
respective `defineCustomElement()` functions. Use `citationRef` and
`sourceTitle` as component props in JSX. In a guarded spec, use keys
`ref`, `source-id`, `title` and `href` on their respective nodes. Put
the citation in a `div` primitive if it shares a line with text.

Provide the local language through `label-template`, `source-count-label`,
and `sources-count-label`. Titles and snippets are plain text. HTTP(S) URLs
and relative web references work in authored HTML. Guarded specs also follow
the application's allowed-origin policy.

## Attributes

- `open` (boolean, default false): Whether the disclosure is expanded. Set to show the list initially.
- `source-count-label` (string, default '{count} source'): Localized summary when there is one source. Use `{count}` for its number.
- `sources-count-label` (string, default '{count} sources'): Localized summary for multiple sources. Use `{count}` for their number.

## Slots

- (default): Direct `ki-source` definitions for this answer.

## Parts

- `disclosure`: Native expandable section.
- `domain`: Hostname derived from the link destination.
- `list`: Ordered list of sources.
- `number`: Source order marker inside the card.
- `snippet`: Optional excerpt.
- `source`: Source card link.
- `summary`: Disclosure control with the localized source count.
- `title`: Visible title of the link.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-source-card-backdrop-filter`: Complete backdrop filter for a source card.
- `--ki-source-card-bg`: Resting background of a source card.
- `--ki-source-card-bg-image`: Optional decorative image over a source card.
- `--ki-source-card-border`: Border color of a source card.
- `--ki-source-card-border-width`: Border width of a source card.
- `--ki-source-card-fg`: Text on a resting source card.
- `--ki-source-card-hover-bg`: Background of a hovered source card.
- `--ki-source-card-hover-fg`: Text on a hovered source card.
- `--ki-source-card-padding`: Inset around source card content.
- `--ki-source-card-radius`: Corner radius of a source card.
- `--ki-source-number-bg`: Background of the number in a source card.
- `--ki-source-number-fg`: Text color of the number in a source card.
- `--ki-source-number-radius`: Corner radius of the number in a source card.
- `--ki-source-number-size`: Minimum size of the number in a source card.
- `--ki-sources-list-gap`: Gap between source cards.
- `--ki-sources-max-inline-size`: Maximum line length of the source disclosure.
- `--ki-sources-summary-bg`: Background of the source-count control.
- `--ki-sources-summary-fg`: Text on the source-count control.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
