# Feature Specification: Pagination

**Branch** `feat/380-ki-pagination` · **Issue** #380 · **Date** 2026-11-20

## User scenarios

- Move among pages in a long search result, table or list, with direct access to nearby pages and the ends.
- Use a simpler previous/next stepper in a narrow column or append another results batch in place.
- Follow real links when the server renders one page per URL.

## Gherkin scenarios

```gherkin
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
  Scenario Outline: The guarded surface dispatches the active pagination action
    Given a guarded surface with <variant> pagination and a declared action
    When the person activates <control>
    Then the host receives its declared action with <payload>

    Examples:
      | variant   | control   | payload          |
      | pages     | Page 6    | requested page 6 |
      | load-more | Load more | no page request  |

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
```

## Scenario family coverage

| Family | Scenario IDs | Justification |
| --- | --- | --- |
| Core behavior | S1–S5, S11, S12 | |
| Keyboard path | S6, S8 | |
| Assistive-tech outcome | S4, S7, S8, S13 | |
| Form participation | N/A | Pagination navigates results and carries no form value. Its controls do not submit a form. |
| Theming | S9, S10 | |

## Requirements

- Show siblings and boundaries around a 1-based current page. Represent any gap with a decorative ellipsis, and show the missing page when a gap covers just one page.
- Render a named navigation landmark in each variant. Use native controls, visible focus, decorative direction icons, logical layout, and persistent polite announcement of a load-more count when both values are known.
- Emit page requests and load-more requests. The host owns the results and commits new values. After replacing the results, the host focuses their heading or top. Appending results keeps the initiating control focused.
- Preserve ordinary browser navigation in link mode. Mark the URL template as URL data in the catalog so the existing scheme and origin policies apply.
- Publish through discovery, documented Stencil metadata, catalog, wrappers and the additive public API declaration. Use no new runtime dependencies and stay within the regular component budgets.

## Interpretations

- **Agent's choice, pending founder confirmation.** The 480px threshold measures the pagination container. A layout wider than the controls can still wrap when many siblings or boundaries are requested.
- **Agent's choice, pending founder confirmation.** The host owns `page` and `shown`. The current numbered button remains focusable and activation is silent. A completed Load more remains focusable and becomes unavailable. Localizable labels and templates are props.
- **Agent's choice, pending founder confirmation.** Missing or nonpositive page totals give no paged navigation. Other finite page values are truncated and bounded. A one-page gap shows its number. Missing count values leave the polite status empty.
- **Agent's choice, pending founder confirmation.** Enabled navigation controls use native links in URL mode, including previous and next. Invalid templates fall back to buttons. A plain activation of a different link emits a page request that the host can cancel to handle navigation itself.
- **Agent's choice, pending founder confirmation.** The guarded renderer accepts a bound action for the active pagination variant in button mode, including the requested page for numbered and compact variants. URL mode uses the existing guarded URL policy. Slots are empty.
