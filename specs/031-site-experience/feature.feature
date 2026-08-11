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
    Given the site counts page views of its public pages
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
