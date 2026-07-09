Feature: Tooltip
  A tooltip reveals brief supplementary text about its trigger on hover or
  keyboard focus, describes the trigger to assistive technology, and lets any
  brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Hovering the trigger reveals the tooltip text
    Given a "Send" button wrapped in a tooltip labeled "Send immediately"
    When the user hovers the trigger
    Then the tooltip shows the text "Send immediately"

  # S2
  Scenario: Moving the pointer away hides the tooltip
    Given the "Send immediately" tooltip is visible on its "Send" trigger
    When the user moves the pointer away from the trigger and the tooltip
    Then the tooltip is hidden

  # S3
  Scenario: Unknown placement values fall back to the default
    Given a tooltip labeled "Send immediately" declared with an unrecognized placement value
    When the user hovers the trigger
    Then the tooltip appears in the default position above the trigger

  # S12
  Scenario: The pointer can move onto the tooltip without hiding it
    Given the "Send immediately" tooltip is visible on its hovered "Send" trigger
    When the user moves the pointer from the trigger onto the tooltip
    Then the tooltip stays visible

  # S13
  Scenario: An empty label never shows a tooltip
    Given a "Send" button wrapped in a tooltip with an empty label
    When the user hovers the trigger
    Then no tooltip is shown
    And the button exposes no accessible description

  # S14
  Scenario: The tooltip repositions to stay inside the viewport
    Given a trigger at the top edge of the viewport with a tooltip placed "top"
    When the user hovers the trigger
    Then the tooltip appears fully within the viewport, below the trigger

  # Family: keyboard path
  # S4
  Scenario: Focusing the trigger reveals the tooltip
    Given the page's first interactive element is a "Send" button with the tooltip "Send immediately"
    When the user presses Tab
    Then the trigger is focused and the tooltip shows "Send immediately"

  # S5
  Scenario: Escape dismisses the tooltip without moving focus
    Given the "Send immediately" tooltip is visible on its focused trigger
    When the user presses Escape
    Then the tooltip is hidden and the trigger keeps focus

  # S6
  Scenario: Moving focus away hides the tooltip
    Given the "Send immediately" tooltip is visible on its focused trigger
    When the user moves focus to the next interactive element
    Then the tooltip is hidden

  # S15
  Scenario: Escape dismisses a hover-shown tooltip while focus is elsewhere
    Given the "Send immediately" tooltip is visible on its hovered trigger while focus rests on another element
    When the user presses Escape
    Then the tooltip is hidden
    And focus stays on that element

  # S16
  Scenario: Escape over a tooltip inside an open dialog dismisses only the tooltip
    Given an open dialog containing a "Send" trigger with its tooltip visible
    When the user presses Escape
    Then the tooltip is hidden
    And the dialog stays open

  # Family: assistive-tech outcome
  # S7
  Scenario: The tooltip text describes the trigger to assistive technology
    Given a "Send" button wrapped in a tooltip labeled "Send immediately"
    When the accessibility tree is queried
    Then the button exposes the accessible description "Send immediately"
    And its accessible name remains "Send"

  # S8
  Scenario: The visible tooltip is exposed with the tooltip role
    Given the "Send immediately" tooltip is visible on its focused trigger
    When the accessibility tree is queried
    Then it exposes a tooltip whose content is "Send immediately"

  # Family: form participation — N/A (non-form component; justification in
  # spec.md's Scenario Family Coverage table)

  # Family: theming
  # S9
  Scenario: A second theme restyles the tooltip through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the user hovers the "Send" trigger
    Then the tooltip's appearance resolves from material3 token values

  # S10
  Scenario: The tooltip honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the user hovers the "Send" trigger
    Then the tooltip's appearance resolves from the dark token values

  # S11
  Scenario: Logical placements follow the document's writing direction
    Given a right-to-left document with a tooltip placed "start" on its trigger
    When the user hovers the trigger
    Then the tooltip appears on the right side of the trigger

  # S17
  Scenario: The tooltip honors reduced motion
    Given a page requesting reduced motion
    When the user hovers the "Send" trigger
    Then the tooltip appears without animated movement
