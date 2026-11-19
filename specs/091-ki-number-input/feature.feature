Feature: Number input edits a quantity and keeps its numeric form value
  People can enter a localized number or adjust it within optional bounds.

  # S1
  Scenario: Optional steppers adjust a quantity up to its limit
    Given Seats is 3 with bounds 1 and 4 and visible steppers
    When the person activates Increase Seats
    Then Seats becomes 4 and reports the new value
    And Increase Seats is disabled

  # S2
  Scenario: A number can display a unit without showing steppers
    Given Timeout is 30 with the suffix seconds and default controls
    When the field appears
    Then it shows 30 beside seconds without stepper buttons

  # S3
  Scenario Outline: The keyboard adjusts the focused quantity
    Given Seats is 12 with bounds 2 and 40 and step 2
    When the person presses <key>
    Then Seats becomes <result>

    Examples:
      | key             | result |
      | ArrowUp         | 14     |
      | ArrowDown       | 10     |
      | Shift+ArrowUp   | 32     |
      | Shift+ArrowDown | 2      |
      | PageUp          | 32     |
      | PageDown        | 2      |
      | Home            | 2      |
      | End             | 40     |

  # S4
  Scenario: Assistive technology can identify the value and its controls
    Given Seats is 3 with bounds 1 and 50, the suffix seats, help text, and steppers
    When the field is read by assistive technology
    Then Seats is a spinbutton with minimum 1, maximum 50 and current value 3
    And it describes the formatted value with its unit and references the unit and help
    And the buttons are named Decrease Seats and Increase Seats

  # S5
  Scenario Outline: Leaving an out-of-range edit corrects it and explains the limit
    Given Seats has bounds 1 and 50 and the person has entered <entered>
    When the person leaves the field
    Then Seats shows <limit>
    And a polite status explains that the value was adjusted to the <bound>

    Examples:
      | entered | limit | bound   |
      | -3      | 1     | minimum |
      | 85      | 50    | maximum |

  # S6
  Scenario: A localized percentage submits a plain number
    Given a German-language form with a percentage field named discount
    And the person has entered 12,5 percent
    When the form submits
    Then the field displays 12,5 percent with the locale's percent sign
    And the form data contains discount with value 0.125

  # S7
  Scenario: A required empty number blocks form submission
    Given a form with an empty required quantity and a configured error message
    When the person submits the form
    Then the form reports a missing value
    And the field shows and describes the configured error message

  # S8
  Scenario: Form reset restores the declared default
    Given Seats started at 3 and has been changed to 5
    When the form is reset
    Then Seats and its form value return to 3

  # S9
  Scenario: A disabled fieldset disables the number input
    Given a form with Seats and its steppers inside an enabled fieldset
    When the fieldset becomes disabled
    Then Seats and both steppers are disabled
    And Seats is excluded from form data

  # S10
  Scenario: Themes can recolor the steppers
    Given a theme with an overridden stepper background
    When a number input appears with steppers
    Then the steppers show the overridden background

  # S11
  Scenario: Right-to-left layout follows reading order
    Given a right-to-left page and a number input with a unit and steppers
    When the field appears
    Then decrease, the number, the unit and increase appear in right-to-left order

  # S12
  Scenario: Touch density gives both buttons larger targets
    Given a coarse-pointer page and a number input with steppers
    When the field is placed in a touch-density region
    Then both stepper targets are at least 44 by 44 pixels

  # S13
  Scenario: Forced colors keep the field and its focus visible
    Given a forced-colors page with a number input
    When the person focuses the field
    Then the field border and focus indicator are distinguishable

  # S14
  Scenario: Reduced motion keeps the control still while editing
    Given a number input on a page with reduced motion enabled
    When the person focuses the field
    Then the field and its steppers have no active motion

  # S15
  Scenario: Invalid text remains available for correction
    Given a form with a quantity containing an invalid numeric entry
    When the person leaves the field
    Then the entry remains visible with a numeric validation message
    And the field cannot submit the invalid entry
