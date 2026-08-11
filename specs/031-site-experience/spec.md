# Feature Specification: Kimen public site experience

**Feature Branch**: `031-site-experience`

**Status**: Approved in the implementation conversation
**Input**: Rebuild the production site from the visual handoff in
`internal/new-design` without importing its generated runtime or weakening
Kimen's quality standards.

## Intent

The new visual direction becomes a production landing page, documentation
shell and theme playground. The implementation must keep the repository's
canonical architecture and data sources: generated token CSS, real `ki-*`
elements, Custom Elements Manifest, capability markers, Astro/Starlight docs,
Storybook and the existing GitHub Pages assembly.

The `.dc.html` files are design evidence only. Production must not ship their
runtime, remote React/Babel dependencies, copied token snapshots, simulated
component CSS, hand-maintained component catalog or `.dc.html` routes.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Kimen public site experience
  A production site that demonstrates the real Kimen system while remaining
  usable, accessible and truthful in every supported theme and viewport.

  # S1
  Scenario Outline: Primary site links reach their canonical destination
    Given the Kimen landing page is available
    When the visitor follows the "<link>" link
    Then the browser reaches "<destination>"

    Examples:
      | link                   | destination                         |
      | Explore the components | /docs/components/alert/             |
      | Open the playground    | /playground/                        |
      | GitHub                 | https://github.com/kimen-dev/kimen |

  # S2
  Scenario: Theme preferences follow the visitor between site pages
    Given the landing page uses the Onmars theme and dark color scheme
    When the visitor chooses the Material 3 theme and dark color scheme
    Then the document uses Material 3 in dark mode
    And the playground restores both choices

  # S3
  Scenario: Theme choices are fully keyboard operable
    Given keyboard focus is on the Onmars theme choice
    When the visitor presses ArrowRight
    Then the Material 3 theme choice is selected
    And the document uses the Material 3 theme

  # S4
  Scenario: The playground reports a completed deployment
    Given the playground deployment form contains valid values
    When the visitor submits the deployment form
    Then a status region announces that relay-gateway is deployed
    And rollout progress reports 87 of 100

  # S5
  Scenario: Site structure remains useful without client JavaScript
    Given client JavaScript is unavailable
    When the visitor reads the landing page
    Then the page exposes a header, navigation, main content and footer
    And links to Components, Playground and GitHub remain available

  # S6
  Scenario: Reduced motion preserves all content without automatic movement
    Given the visitor prefers reduced motion
    When the landing page loads
    Then nonessential automatic animation is disabled
    And every content section remains visible

  # S7
  Scenario Outline: Public pages fit supported viewport widths
    Given the "<page>" page is shown at <width> CSS pixels
    When the page finishes its initial layout
    Then the page has no horizontal overflow
    And its primary navigation remains reachable

    Examples:
      | page       | width |
      | landing    | 320   |
      | landing    | 1440  |
      | playground | 320   |
      | playground | 1440  |
      | privacy    | 320   |
      | privacy    | 1440  |

  # S8
  Scenario: Measured pages declare what is measured
    Given client JavaScript is unavailable
    When the visitor follows the "Privacy" link from a measured page
    Then the privacy declaration names Umami and the categories it records
    And it states that no cookies are set and no IP address is stored

  # S9
  Scenario Outline: Analytics ships only with the production build
    Given a <build> of the site
    When the site is assembled
    Then its pages <measurement>

    Examples:
      | build                     | measurement                                    |
      | production publishing run | load the declared Umami endpoint for kimen.dev |
      | local or test run         | carry no analytics at all                      |

  # S10
  Scenario: The published site tells browsers how it may be treated
    Given the site is published at kimen.dev
    When a browser requests a published file
    Then the response refuses content-type sniffing and framing by other origins
    And a file whose name does not change with its contents stays revalidatable
```

## Requirements

- **FR-001**: The landing preserves its SEO metadata, skip link, semantic
  landmarks and canonical Pages routes.
- **FR-002**: All visual styling resolves from current semantic/component
  `--ki-*` tokens and uses logical properties.
- **FR-003**: Theme and color-scheme choices persist across the landing and
  playground; both pages start in dark Onmars when no preference exists, and
  Material 3 loads only when requested.
- **FR-004**: Interactive demonstrations use real `ki-*` elements or native
  HTML, never light-DOM replicas of component internals.
- **FR-005**: The playground form participates in native submission and reports
  its result through an accessible status plus determinate progress.
- **FR-006**: Documentation remains Astro/Starlight and keeps MDX/CEM as its
  source of truth while adopting the new visual shell.
- **FR-007**: The component catalog is derived from the generated Custom
  Elements Manifest and the capability block remains generated from
  `docs/capabilities.json`.
- **FR-008**: Pages remain usable without JavaScript and fit 320 through 1440
  CSS pixels without horizontal overflow.
- **FR-009**: Motion is finite, nonessential and disabled under
  `prefers-reduced-motion`.
- **FR-010**: The published artifact contains no `support.js`, `x-dc`, template
  bindings, executable remote resources or copied design token bundles.
- **FR-011**: Every measured page links a privacy declaration that names the
  analytics in use, the categories it records, and the fact that no cookies are
  set and no IP address is stored.
- **FR-012**: The analytics tag is emitted only by the production publishing
  build; a local, test or preview build publishes the same pages with no
  analytics at all.
- **FR-013**: Published responses refuse content-type sniffing and framing by
  other origins, and freeze a file in a browser's cache only when its name
  changes with its contents.

## Scenario family coverage

| Family | Coverage |
| --- | --- |
| Core behavior | S1, S5, S7, S8, S9, S10 |
| Keyboard path | S3 |
| Assistive-tech outcome | S4, S5, S8 |
| Form participation | S4 |
| Theming | S2, S3 |
| Reduced motion | S6 |

## Non-goals

- Replacing Starlight or Storybook.
- Changing any public `@kimen/elements` API.
- Publishing the prototype runtime or its duplicated component documentation.
- Adding a third theme, a new token layer or a new runtime dependency.
