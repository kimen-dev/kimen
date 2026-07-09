Feature: Radio group
  A radio group lets a person choose exactly one option from a visible set,
  reports the choice to forms and assistive technology as a single field,
  and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting an option makes it the group's single choice
    Given a radio group labeled "Contact preference" with options "Email" (value "email"), "SMS" and "Phone"
    When the user selects "Email"
    Then "Email" is the selected option
    And a change event is dispatched and the group's value reads "email"

  # S2
  Scenario: Selecting another option releases the previous one
    Given the "Contact preference" group with "Email" selected
    When the user selects "SMS"
    Then "SMS" is the selected option and "Email" is no longer selected

  # S3
  Scenario: A disabled option cannot be selected
    Given the "Contact preference" group where the "Phone" option is disabled
    When the user attempts to select "Phone"
    Then no selection change is observed

  # S4
  Scenario: A value matching no option leaves the group unselected
    Given a radio group declared with a value that matches none of its options
    When the page renders
    Then no option renders selected and the group remains operable

  # S19
  Scenario: A disabled group cannot change selection
    Given a disabled radio group labeled "Contact preference" with "Email" selected
    When the user attempts to select "SMS"
    Then no selection change is observed and the group is exposed as unavailable

  # Family: keyboard path
  # S5
  Scenario: Tab reaches the group as a single stop on the selected option
    Given a page whose "Contact preference" group has "SMS" selected
    When the user presses Tab to enter the group
    Then the "SMS" option is focused with visible focus indication

  # S6
  Scenario: Arrow keys move the selection to the next option
    Given a radio group with options "Email", "SMS" and "Phone" in that order, "Email" selected and focused
    When the user presses Arrow Down
    Then the "SMS" option is focused and selected

  # S7
  Scenario: Arrow navigation wraps and skips disabled options
    Given a radio group with options "Email", "SMS" and "Phone" in that order, where "Phone" is disabled and "SMS" is focused
    When the user presses Arrow Down
    Then focus wraps past "Phone" to "Email", which becomes selected

  # S8
  Scenario: Space selects the focused option when none is selected
    Given keyboard focus on the "Email" option of a group with no selection
    When the user presses Space
    Then "Email" is the selected option

  # S9
  Scenario: Tab leaves the group in a single step
    Given keyboard focus inside the "Contact preference" group
    When the user presses Tab
    Then focus moves to the next element after the group, visiting no other option

  # S20
  Scenario: Tab skips a disabled group entirely
    Given a page whose radio group is disabled
    When the user presses Tab
    Then focus moves past the group without visiting any option

  # S21
  Scenario: Horizontal arrows follow the writing direction
    Given a right-to-left document with a radio group of options "Email", "SMS" and "Phone" in that order
    And keyboard focus on the selected "Email" option
    When the user presses Arrow Left
    Then the "SMS" option is focused and selected

  # S25
  Scenario: Tab enters an unselected group on its first enabled option without selecting
    Given an unselected radio group with options "Email", "SMS" and "Phone" where "Email" is disabled
    When the user presses Tab to enter the group
    Then the first enabled option "SMS" is focused and no option becomes selected

  # Family: assistive-tech outcome
  # S10
  Scenario: The group exposes its name, role and the selected state
    Given a radio group labeled "Contact preference" with "Email" selected
    When the accessibility tree is queried
    Then it exposes a radio group named "Contact preference"
    And the "Email" option is exposed as a selected radio named "Email"

  # S11
  Scenario: A disabled option is exposed as unavailable
    Given the "Contact preference" group where the "Phone" option is disabled
    When the accessibility tree is queried
    Then the "Phone" option is exposed as an unavailable radio

  # S22
  Scenario: The required state is exposed to assistive technology
    Given a required radio group labeled "Contact preference" with no selection
    When the accessibility tree is queried
    Then the group is exposed as required

  # S23
  Scenario: The invalid state is exposed after a blocked submission
    Given a required radio group whose form submission was just blocked for lack of selection
    When the accessibility tree is queried
    Then the group is exposed as invalid

  # Family: form participation
  # S12
  Scenario: The selected option's value submits with the form
    Given a form holding a radio group named "contact" with the "Email" option (value "email") selected
    When the user submits the form
    Then the submitted form data contains "contact" with value "email"

  # S13
  Scenario: A required group with no selection blocks submission
    Given a form whose required radio group "contact" has no selection
    When the user submits the form
    Then the form does not submit and the group is reported as invalid

  # S14
  Scenario: Resetting the form restores the initial selection
    Given the "contact" group loaded with "Email" selected and now showing "SMS" selected
    When the user resets the form
    Then "Email" is the selected option again

  # S15
  Scenario: A disabled fieldset makes the whole group inert
    Given a radio group inside a disabled fieldset
    When the user attempts to select an option
    Then no selection change is observed and the group is exposed as unavailable

  # S24
  Scenario: Disabling the selected option withholds its entry without blocking submission
    Given a form whose required group named "contact" had "Email" (value "email") selected before that option became disabled
    When the user submits the form
    Then the form submits and the data contains no "contact" entry

  # Family: theming
  # S16
  Scenario: A second theme restyles the radio group through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the radio group's appearance resolves from material3 token values

  # S17
  Scenario: The radio group honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the radio group's appearance resolves from the dark token values

  # S18
  Scenario: Option layout follows the document's writing direction
    Given a right-to-left document containing the "Contact preference" group
    When the page renders
    Then each option's control leads its label in the right-to-left direction
