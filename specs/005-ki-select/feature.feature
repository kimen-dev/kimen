Feature: Select
  A select lets a person choose exactly one option from a closed list,
  reports the choice to forms and assistive technology, and restyles
  through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting an option updates the select's value
    Given a select labeled "Country" offering "Spain", "France" and "Portugal"
    When the user selects "France"
    Then the select shows "France" as its selection
    And a change event reports the value "France"

  # S2
  Scenario: The select renders closed showing its placeholder
    Given a select labeled "Country" with placeholder "Choose a country" and no selection
    When the page renders
    Then the options are hidden and the trigger shows "Choose a country"

  # S3
  Scenario: A disabled select never opens
    Given a disabled select labeled "Country"
    When the user attempts to open it
    Then the options remain hidden and no selection change is observed

  # S4
  Scenario: A disabled option cannot be selected
    Given an open select "Country" whose option "France" is disabled
    When the user attempts to select "France"
    Then the selection does not change

  # S5
  Scenario: A value matching no option falls back to no selection
    Given a select "Country" declared with value "Atlantis" that matches no option
    When the page renders
    Then no option is selected and the trigger shows the placeholder

  # S20
  Scenario: Interacting outside the open popup closes it without committing
    Given the open "Country" select with "Spain" selected
    When the user interacts outside the popup
    Then the options close and "Spain" remains selected

  # S25
  Scenario: Removing the selected option falls back to no selection
    Given a select "Country" with "France" selected
    When the application removes the "France" option
    Then no option is selected and the trigger shows the placeholder
    And no change event is observed

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches the select with visible focus
    Given a page whose first interactive element is a select
    When the user presses Tab
    Then the select is focused and its focus indication is visible

  # S7
  Scenario: Arrow Down opens the list and highlights the current option
    Given a focused closed select "Country" with "Spain" selected
    When the user presses Arrow Down
    Then the options open with "Spain" highlighted

  # S8
  Scenario: The keyboard commits the highlighted option and closes the list
    Given the open "Country" select with "France" highlighted
    When the user commits the highlighted option from the keyboard
    Then "France" is selected and the options close

  # S9
  Scenario: Escape closes the list without changing the selection
    Given the open "Country" select where "Spain" is selected and "France" is highlighted
    When the user presses Escape
    Then the options close and "Spain" remains selected

  # S10
  Scenario Outline: Home and End jump the highlight to the ends of the list
    Given the open "Country" select listing "Spain", "France" and "Portugal"
    When the user presses <key>
    Then <option> is highlighted

    Examples:
      | key  | option     |
      | Home | "Spain"    |
      | End  | "Portugal" |

  # S21
  Scenario: Tab closes the open popup discarding the uncommitted highlight
    Given the open "Country" select where "Spain" is selected and "France" is highlighted
    When the user presses Tab
    Then the options close and "Spain" remains selected

  # S22
  Scenario: The keyboard highlight skips a disabled option
    Given an open select "Country" whose option "France" is disabled and "Spain" is highlighted
    When the user presses Arrow Down
    Then "Portugal" is highlighted

  # S23
  Scenario: Opening with no selection highlights the first enabled option
    Given a focused closed select "Country" offering "Spain", "France" and "Portugal" with no selection
    When the user opens it from the keyboard
    Then the options open with "Spain" highlighted

  # Family: assistive-tech outcome
  # S11
  Scenario: The select is exposed as a named combobox with its value
    Given a select labeled "Country" with "France" selected
    When the accessibility tree is queried
    Then it exposes a collapsed combobox named "Country" whose value is "France"

  # S12
  Scenario: The open list is exposed as a listbox with the selected option
    Given the open select labeled "Country" with "France" selected
    When the accessibility tree is queried
    Then it exposes an expanded combobox and a listbox where "France" is marked selected

  # Family: form participation
  # S13
  Scenario: The select submits its value with the form
    Given a form containing a select named "country"
    And its option labeled "France" carrying value "fr" is selected
    When the user submits the form
    Then the submitted form data contains "country" with value "fr"

  # S14
  Scenario: A required select without a selection blocks submission
    Given a form containing a required select "Country" with no selection
    When the user submits the form
    Then the form does not submit and the select is reported invalid

  # S15
  Scenario: Resetting the form restores the select's initial selection
    Given the "country" select loaded with "France" selected and now shows "Portugal"
    When the user resets the form
    Then "France" is selected

  # S16
  Scenario: A disabled fieldset makes the select inert
    Given a select "Country" inside a disabled fieldset
    When the user attempts to open it
    Then the options remain hidden and the select is exposed as unavailable

  # S24
  Scenario: A select with no selection submits no entry
    Given a form containing a select named "country" with no selection
    When the user submits the form
    Then the submitted form data contains no entry for "country"

  # Family: theming
  # S17
  Scenario: A second theme restyles the select through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the select's appearance resolves from material3 token values

  # S18
  Scenario: The select honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the select's appearance resolves from the dark token values

  # S19
  Scenario: The select follows the document's writing direction
    Given a right-to-left document with a select showing "France"
    When the page renders
    Then the value leads and the dropdown indicator trails the writing direction
