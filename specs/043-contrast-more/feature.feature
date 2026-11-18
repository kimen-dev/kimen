Feature: More contrast when the person asks for it
  Under a "more" contrast preference, or when the page declares it, every
  shipped theme and colour scheme strengthens neutral text, control
  boundaries, separators and the keyboard focus indicator through tokens
  alone, and leaves the standard appearance untouched otherwise.

  # S1
  Scenario: Secondary text reaches enhanced contrast under the system preference
    Given an onmars light page with a text field labeled "Email" and the placeholder "name@example.com"
    When the page renders under a "more" contrast system preference
    Then the label and the placeholder measure at least 7:1 against the surfaces behind them

  # S2
  Scenario: Control boundaries strengthen under the system preference
    Given an onmars light page with a text field, a select, a checkbox and a radio
    When the page renders under a "more" contrast system preference
    Then the boundary of each control measures at least 4.5:1 against the page surface

  # S3
  Scenario: Separators and container edges become visible under the system preference
    Given an onmars light page with a card "Invoice" and a divider
    When the page renders under a "more" contrast system preference
    Then the card edge and the divider measure at least 3:1 against the page surface

  # S4
  Scenario: The keyboard focus indicator thickens under the system preference
    Given an onmars light page whose "Save" button has keyboard focus
    When the page renders under a "more" contrast system preference
    Then the focus indicator is at least 3px thick
    And it measures at least 4.5:1 against the page surface

  # S5
  Scenario Outline: Enhanced contrast holds in every shipped theme and colour scheme
    Given a <theme> page in the <scheme> colour scheme
    When the page renders under a "more" contrast system preference
    Then every neutral text measures at least 7:1 against its surface
    And every control boundary measures at least 4.5:1 and every separator at least 3:1

    Examples:
      | theme     | scheme |
      | onmars    | light  |
      | onmars    | dark   |
      | material3 | light  |
      | material3 | dark   |

  # S6
  Scenario: Text on brand and tone fills keeps at least the standard contrast
    Given a material3 light page with a primary button "Save" and a danger alert "Payment failed"
    When the page renders under a "more" contrast system preference
    Then the button label and the alert text measure at least 4.5:1 against their fills

  # S7
  Scenario: A page can declare more contrast without the system preference
    Given an onmars light page whose root declares the contrast "more"
    When the page renders under no contrast system preference
    Then the "Email" label and placeholder measure at least 7:1 against the surfaces behind them

  # S8
  Scenario: Without the preference or a declaration the standard appearance is unchanged
    Given an onmars light page with no contrast declaration
    When the page renders under no contrast system preference
    Then the "Email" text field keeps its standard boundary and placeholder colours

  # S9
  Scenario: Disabled controls keep their standard appearance under more contrast
    Given an onmars light page with a disabled text field "Email"
    When the page renders under a "more" contrast system preference
    Then the disabled field keeps its standard colours

  # S10
  Scenario: A themed region inside a page that declares more contrast keeps it
    Given a page whose root declares the contrast "more"
    When a region of the page declares the theme "material3"
    Then a text field inside the region renders as it does in a material3 page with more contrast

  # S11
  Scenario: A themed region can declare more contrast on its own
    Given an onmars page under no contrast system preference
    When a region of the page declares the theme "onmars" and the contrast "more"
    Then a text field inside the region meets the enhanced thresholds
    And a text field outside the region keeps its standard colours

  # S12
  Scenario: A page's own value for a strengthened token wins under more contrast
    Given an onmars page whose stylesheet sets the control boundary token to "#000000" under more contrast
    When the page renders under a "more" contrast system preference
    Then the text field boundary renders in "#000000"
