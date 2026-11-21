Feature: Segmented control applies one in-place choice

  # S1
  Scenario: Use the first available option by default
    Given Range offers unavailable Day and available Week and Month with no requested value
    When the control appears
    Then Week is the sole selected option

  # S2
  Scenario: Apply a pointer choice once
    Given Range has Week selected
    When the user clicks Month
    Then Month is the sole selected option
    And one change event reports "month"

  # S3
  Scenario: Enter the group at the selection
    Given Range has Week selected between two focusable controls
    When the user tabs into Range
    Then focus lands on Week
    And no change event occurs

  # S4
  Scenario: Move focus and select with the arrows
    Given Week is focused and selected with unavailable Month next and Day available at the start
    When the user presses ArrowRight
    Then focus wraps to Day and selects it
    And one change event reports "day"

  # S5
  Scenario: Name an icon-only choice
    Given View offers a text option and an icon-only option named "Board"
    When the icon-only option receives focus
    Then assistive technology exposes a radio named "Board" in the radiogroup named "View"
    And the tooltip shows "Board"

  # S6
  Scenario: Keep in-place choices out of form data
    Given a form contains a selected range and a named query field
    When form data is collected
    Then it contains the query field alone

  # S7
  Scenario: Style selection through the component theme
    Given the theme overrides the selected surface, ink and elevation
    When Range displays Week as selected
    Then Week uses the overridden surface, ink and elevation

  # S8
  Scenario: Preserve a selection indicator in forced colours
    Given the display uses forced colours
    When Range displays Week as selected
    Then Week has a Highlight border that the other options lack

  # S9
  Scenario: Keep changes free of motion with reduced motion
    Given the display requests reduced motion and Range has Week selected
    When the user clicks Month
    Then Month shows its selection without an animation or transition

  # S10
  Scenario: Follow reading direction for horizontal navigation
    Given Week is focused and selected in a right-to-left Range
    When the user presses ArrowRight
    Then focus moves to Day and selects it

  # S11
  Scenario: Enlarge the dense option on a coarse pointer
    Given the display has a coarse pointer and a region opts into touch density
    When an extra-small control is displayed
    Then each option has a touch target at least 44 by 44 CSS pixels

  # S12
  Scenario: Share the width across the options
    Given an available row contains a full-width View control
    When a short and a long option are displayed
    Then both options occupy equal widths and the control fills the row

  # S13
  Scenario: Update the selected value through the public property
    Given Range has Week selected
    When the page changes the Range value to "month"
    Then Month is the sole selected option
    And no change event occurs

  # S14
  Scenario: Recover when the selected option is disabled
    Given Range has Week selected and Day is available
    When Week becomes disabled
    Then Day is the sole selected option and the group tab stop
    And no change event occurs

  # S15
  Scenario: Wrap a long label instead of truncating it
    Given Answer has the options "Quiero usarlo ya", "Quiero entenderlo" and "Lo haré a mano" in a 343px row
    When the control is displayed
    Then every label shows its full text on at most two lines
    And the options keep one height
