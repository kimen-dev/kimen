Feature: ki-popover opens non-modal content beside a trigger

  # S1
  Scenario: Toggle filters from their trigger
    Given closed filters anchored to the "Filters" button
    When the user activates the button
    Then the filters open beside it
    And the button is expanded and one open event is emitted

  # S2
  Scenario: Dismiss filters with an outside click
    Given the filters are open beside the "Filters" button
    When the user clicks a button outside the filters
    Then the filters close and emit one close event
    And the "Filters" button is collapsed

  # S3
  Scenario: Move keyboard focus into interactive filters
    Given the closed filters contain a "Search" field and the "Filters" button has focus
    When the user presses Enter
    Then the "Search" field receives focus

  # S4
  Scenario: Return keyboard focus to the trigger on Escape
    Given a field inside the open filters has focus
    When the user presses Escape
    Then the filters close and the "Filters" button receives focus

  # S5
  Scenario: Reach the page with Tab
    Given the last control in the open filters has focus
    When the user presses Tab
    Then focus moves to the next control on the page

  # S6
  Scenario: Expose a named non-modal dialog
    Given a filter popover labelled "Incident filters"
    When the user opens it
    Then assistive technology exposes a dialog named "Incident filters"
    And the button exposes the expanded state

  # S7
  Scenario: Announce a toggletip without moving focus
    Given the "About retention" button has focus and its toggletip is closed
    When the user presses Space
    Then a status region receives "Logs are kept for 30 days."
    And focus stays on "About retention"

  # S8
  Scenario: Flip a bottom placement near the viewport edge
    Given the trigger is at the bottom of the viewport
    When the popover opens at bottom-start
    Then the popover appears above the trigger

  # S9
  Scenario: Follow a semantic surface override
    Given a theme overrides the raised surface colour
    When the popover opens
    Then its surface paints the overridden colour

  # S10
  Scenario: Fit the user’s direction and display preferences
    Given a bottom-start popover in a right-to-left layout
    When it opens with forced colours, reduced motion and coarse pointer density
    Then its inline start aligns with the trigger's inline start
    And the surface has a visible border and no motion
    And its padding follows the coarse pointer density

  # S11
  Scenario: Open and close through application state
    Given a closed popover with a valid trigger
    When the application sets open to true
    Then the popover opens with one open event
    And the trigger is expanded

  # S12
  Scenario: Submit a slotted form
    Given open filters contain a form with a named search field
    When the user submits the form
    Then the form data includes the search field alone

  # S13
  Scenario: Collapse filters by activating the trigger again
    Given a popover is open by activation of its trigger
    When the user activates that trigger again
    Then the popover closes and emits one close event
    And the trigger is collapsed
