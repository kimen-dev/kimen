Feature: Text fields large enough for a touch screen
  On a device whose primary pointer is coarse, the text a person types into a
  text field is at least 16 CSS pixels, so the browser does not zoom the page
  into the field when it gets focus. With a mouse or a trackpad, fields keep
  their standard size, and labels and help text never change size.

  # S1
  Scenario Outline: On a touch screen a text field's text is at least 16 pixels
    Given a <theme> page with a <field> labeled "Email" on a device whose primary pointer is coarse
    When the field receives focus
    Then the text in the field measures at least 16 CSS pixels

    Examples:
      | theme     | field       |
      | onmars    | ki-input    |
      | onmars    | ki-textarea |
      | material3 | ki-input    |
      | material3 | ki-textarea |

  # S2
  Scenario: With a mouse or a trackpad a text field keeps its standard text size
    Given an onmars page with a ki-input labeled "Email" on a device whose primary pointer is fine
    When the field receives focus
    Then the text in the field measures 13 CSS pixels

  # S3
  Scenario: The label and the help text keep their size on a touch screen
    Given an onmars page with a ki-input labeled "Email" with the help text "We never share it" on a device whose primary pointer is coarse
    When the field receives focus
    Then the label and the help text measure what they measure with a fine pointer

  # S4
  Scenario: Reassigning the touch text size restyles the field on a touch screen
    Given a page that sets --ki-input-font-size-touch to 20px around a ki-input labeled "Email" on a device whose primary pointer is coarse
    When the field receives focus
    Then the text in the field measures 20 CSS pixels
