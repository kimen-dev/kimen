Feature: ki-pagination navigates paged results
  People can move among result pages or append more results in place.

  # S1
  Scenario: Numbered pagination keeps nearby pages and the ends visible
    Given 12 result pages with one sibling and one boundary at each end
    When page 5 is displayed
    Then pages 1, 4, 5, 6 and 12 appear in order with two omitted ranges

  # S2
  Scenario: Selecting a page requests a change
    Given 12 result pages with page 5 displayed
    When the person activates Page 6
    Then a page change requests page 6
    And page 5 stays current until the results update

  # S3
  Scenario: A narrow layout uses the compact stepper
    Given default pagination for page 5 of 12 at 480 pixels wide
    When the available width drops below 480 pixels
    Then only Previous page, Page 5 of 12 and Next page are shown

  # S4
  Scenario Outline: Controls at page boundaries stay visible and unavailable
    Given <variant> pagination at page <page> of 12
    When the person inspects the <control> control
    Then it is visible and unavailable

    Examples:
      | variant | page | control       |
      | pages   | 1    | Previous page |
      | pages   | 12   | Next page     |
      | compact | 1    | Previous page |
      | compact | 12   | Next page     |

  # S5
  Scenario: Server-rendered pages expose navigable links
    Given page 5 of 12 with the URL template "?page={page}"
    When the person inspects the controls for Page 6 and Next page
    Then both expose links to "?page=6"

  # S6
  Scenario: A keyboard page change returns focus to the updated results
    Given page 5 is loaded and the person has tabbed to Page 6
    When the person presses Enter
    Then page 6 is loaded
    And focus is on the updated results heading

  # S7
  Scenario: The navigation exposes its name and current page
    Given numbered pagination named "Search results pages" at page 5 of 12
    When assistive technology reads the navigation
    Then it identifies the named navigation and Page 5 as current
    And the omitted ranges are skipped

  # S8
  Scenario: Loading another batch preserves focus and updates the polite count
    Given 20 of 40 results are shown and Load more is focused
    When the person presses Space to load the final batch
    Then the polite status reads "Showing 40 of 40 results"
    And Load more stays focused and becomes unavailable

  # S9
  Scenario: A consumer can restyle the current page
    Given numbered pagination for page 5 of 12
    When the consumer overrides the current page background token
    Then the current page shows the new background

  # S10
  Scenario: Touch density increases the page target size
    Given numbered pagination on a coarse pointer device
    When the page switches to touch density
    Then each page button is at least 44 by 44 pixels

  # S11
  Scenario Outline: The guarded surface dispatches the requested page
    Given <variant> pagination for page 5 of 12 with a guarded action
    When the person requests page 6
    Then the host receives the declared action with the requested page 6

    Examples:
      | variant |
      | pages   |
      | compact |

  # S12
  Scenario: The guarded surface rejects page links with a disallowed origin
    Given a guarded surface that allows only "https://shop.example"
    When pagination is requested with "https://outside.example/items?page={page}"
    Then the surface rejects the pagination

  # S13
  Scenario: Page directions follow the reading direction
    Given compact pagination at page 5 of 12
    When the reading direction changes to right to left
    Then Previous page points right and Next page points left
    And Previous page still requests page 4
