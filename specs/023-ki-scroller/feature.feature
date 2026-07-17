Feature: Scroller
  A scroller clips overflowing content inside a bounded region and keeps it
  reachable by wheel, touch and keyboard alike, with a scroll indicator that
  any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Overflowing content is clipped and signalled
    Given a vertical scroller labeled "Release notes" whose content is taller than its bounds
    When the page renders
    Then the content is clipped to the scroller's bounds
    And a vertical scroll indicator is shown

  # S2
  Scenario: Scrolling reveals the end of the content
    Given a vertical scroller whose content is taller than its bounds
    When the user scrolls to the end
    Then the last of the content becomes visible

  # S3
  Scenario: A horizontal scroller overflows along the inline axis only
    Given a horizontal scroller labeled "Weekly timeline" whose content is wider than its bounds
    When the page renders
    Then the content is clipped at the scroller's inline edge
    And a horizontal scroll indicator is shown

  # S4
  Scenario: Fitting content needs no scroller affordance
    Given a scroller labeled "Release notes" whose content fits within its bounds
    When the page renders
    Then all the content is visible and no scroll indicator is shown

  # S5
  Scenario: Unknown orientation values fall back to vertical
    Given a scroller declared with an unrecognized orientation value copied from another design system
    When the page renders
    Then the scroller behaves as the default vertical scroller

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches an overflowing scroller
    Given a page whose only element is a scroller with overflowing content
    When the user presses Tab
    Then focus lands on the scroller

  # S7
  Scenario: Arrow keys scroll the focused scroller
    Given focus on a vertical scroller whose content is taller than its bounds
    When the user presses Arrow Down
    Then the content scrolls toward the end

  # S8
  Scenario: A fitting scroller adds no tab stop
    Given a page holding a scroller whose content fits, followed by a button
    When the user presses Tab
    Then focus lands on the button, skipping the scroller

  # Family: assistive-tech outcome
  # S9
  Scenario: The scroller exposes a named region with intact content semantics
    Given an overflowing scroller labeled "Release notes" holding a heading and a list
    When the accessibility tree is queried
    Then it exposes a region named "Release notes"
    And the heading and the list keep their own semantics

  # Family: form participation — N/A for ki-scroller: a scroll container is
  # not a form control, holds no value and contributes no entry to submitted
  # form data (justified in spec.md's Scenario Family Coverage table).

  # Family: theming
  # S10
  Scenario: A second theme restyles the scroller through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the scroll indicator's color, thickness and shape resolve from material3 token values

  # S11
  Scenario: The scroller honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the scroll indicator's appearance resolves from the dark token values

  # S12
  Scenario: A horizontal scroller follows the document's writing direction
    Given a right-to-left document with a horizontal scroller whose content is wider than its bounds
    When the page renders
    Then the content begins at the right edge and scrolls toward the left edge

  # Family: core behavior (appended)
  # S13
  Scenario: A scroller that stops overflowing drops its indicator and Tab stop
    Given a vertical scroller labeled "Chat messages" whose content is taller than its bounds
    When enough content is removed for the remainder to fit within the bounds
    Then no scroll indicator is shown
    And the scroller no longer adds a Tab stop

  # S14
  Scenario: A scroller that starts overflowing gains its indicator and Tab stop
    Given a vertical scroller labeled "Chat messages" whose content fits within its bounds
    When enough content is added to overflow the bounds
    Then a vertical scroll indicator is shown
    And the scroller becomes reachable via Tab
