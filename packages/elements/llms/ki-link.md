# ki-link

> A native navigation link with Kimen ink, underline, and focus styles.

## When to use

navigate to a page, section, or resource. Use a descriptive label and keep the default underline in running text. Leave the action binding unset for native navigation.

## When not to use

perform an action on the current page. Use ki-button variant="ghost" for that.

## Examples

## Read a related page

```html
<p>Read the <ki-link href="/docs/catalog">catalog contract</ki-link> before adding a component.</p>
```

## Open an external resource

```html
<ki-link href="https://github.com/kimen-dev/kimen" external>Source on GitHub</ki-link>
```

## Link from standalone navigation

```html
<nav aria-label="Resources">
  <ki-link href="/docs" underline="hover">Documentation</ki-link>
  <ki-link href="/changelog" variant="neutral" underline="hover">Changelog</ki-link>
</nav>
```

## Navigate from a guarded surface

Supply `href` and the default text slot. The surface URL policy applies.
Leave the action binding unset for native navigation.

```json
{
  "version": 1,
  "root": {
    "component": "ki-link",
    "props": { "href": "/docs/catalog" },
    "slots": { "": ["Catalog contract"] }
  }
}
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-link`: the default, only the tokens ki-link needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `download` (string | undefined): Native download attribute. Set it to an empty string to let the browser choose the file name, or supply a suggested file name.
- `external` (boolean, default false): Requests a new tab with noopener and adds an icon and an accessible announcement. An explicit download still follows native download rules.
- `external-label` (string, default '(opens in a new tab)'): Localizable text appended to the accessible name in external mode.
- `href` (string, required, URL): Destination URL. Relative URLs and fragments use native anchor resolution.
- `rel` (string | undefined): Space-separated native link relationships. External links always include noopener.
- `target` (string | undefined): Native browsing-context name. External links use _blank.
- `underline` ("always" | "hover", default 'always'): Keep the underline in running text. Use hover for standalone navigation, where placement identifies the link and keyboard focus still underlines it.
- `variant` ("neutral" | "primary", default 'primary'): Ink role. Primary uses accent ink and neutral uses body ink.

## Slots

- (default): Descriptive link text. Use phrasing content without nested interactive controls.

## Parts

- `link`: The native anchor that renders the link and receives focus.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-link-bg`: Transparent backing for primary link text. Default: `var(--ki-surface-transparent)`.
- `--ki-link-bg-image`: Optional image overlay for link backing. Default: `var(--ki-surface-image-none)`.
- `--ki-link-fg`: Accent ink for primary links. Default: `var(--ki-text-primary-high-em)`.
- `--ki-link-font-family`: Body typeface used by link text. Default: `var(--ki-typography-family-body)`.
- `--ki-link-icon-gap`: Space between the label and the external link icon. Default: `var(--ki-typography-inline-icon-gap)`.
- `--ki-link-icon-size`: External link icon edge relative to the inherited text size. Default: `var(--ki-typography-inline-icon-size)`.
- `--ki-link-neutral-bg`: Transparent backing for neutral link text. Default: `var(--ki-surface-transparent)`.
- `--ki-link-neutral-fg`: Body ink for neutral links. Default: `var(--ki-text-high-em)`.
- `--ki-link-radius`: Corner radius used by the link focus outline. Default: `var(--ki-corner-inline)`.
- `--ki-link-underline-offset`: Space between link text and its underline. Default: `var(--ki-typography-underline-offset)`.
- `--ki-link-underline-thickness`: Resting underline thickness. Default: `var(--ki-typography-underline-thickness)`.
- `--ki-link-underline-thickness-hover`: Underline thickness under a hover-capable pointer. Default: `var(--ki-typography-underline-thickness-hover)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
