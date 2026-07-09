Feature: Input
  A single-line text field that reports what a person types to the page,
  to native forms and to assistive technology, and lets any brand restyle
  it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Typing fills the field and the page observes it
    Given an empty input labeled "Email"
    When the user types "ada@example.com"
    Then the field's value is "ada@example.com"
    And the page observes input events as the text is entered

  # S2
  Scenario: Committing an edit reports a change
    Given an input labeled "Email" whose text was edited to "ada@example.com"
    When the user leaves the field
    Then a change event reports the value "ada@example.com"

  # S3
  Scenario: A disabled input accepts no entry
    Given a disabled input labeled "Email"
    When the user attempts to type into it
    Then the field's value remains empty

  # S4
  Scenario: A readonly input shows its value but rejects edits
    Given a readonly input labeled "Membership ID" with value "KMN-0042"
    When the user attempts to type into it
    Then the field's value remains "KMN-0042"

  # S5
  Scenario: A password field obscures what is typed
    Given an empty input labeled "Password" of type password
    When the user types "correct horse battery"
    Then the entered text is displayed obscured
    And the field's value is "correct horse battery"

  # S6
  Scenario: Unknown type values fall back to plain text
    Given an input declared with an unrecognized type value
    When the page renders
    Then the field behaves as a plain text field

  # S19
  Scenario: The label is rendered on screen
    Given an input labeled "Email"
    When the page renders
    Then the label "Email" is visible alongside the entry area

  # S20
  Scenario: Assigning the value programmatically replaces the displayed value
    Given an input labeled "Email" whose text the user edited to "draft"
    When the page assigns the value "ada@example.com" programmatically
    Then the field displays "ada@example.com"
    And no change event is observed

  # S21
  Scenario: The invalid appearance surfaces only after a submission attempt
    Given a form whose empty required input shows no invalid appearance on first render
    When the user attempts to submit the form
    Then the field shows the invalid state appearance

  # Family: keyboard path
  # S7
  Scenario: The keyboard reaches the field with visible focus
    Given a page whose first interactive element is an input labeled "Email"
    When the user presses Tab
    Then the field is focused and its focus indication is visible

  # S8
  Scenario: Enter in the field submits its form
    Given a form containing a focused input labeled "Email"
    When the user presses Enter
    Then the form submits

  # S22
  Scenario: The keyboard reaches a readonly field with visible focus
    Given a page whose first interactive element is a readonly input labeled "Membership ID"
    When the user presses Tab
    Then the field is focused and its focus indication is visible

  # Family: assistive-tech outcome
  # S9
  Scenario: The field is exposed as a labeled text entry
    Given an input labeled "Email"
    When the accessibility tree is queried
    Then it exposes a text field whose accessible name is "Email"

  # S10
  Scenario: The required state is exposed to assistive technology
    Given a required input labeled "Email"
    When the accessibility tree is queried
    Then the field is exposed as required

  # S11
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled input labeled "Email"
    When the accessibility tree is queried
    Then the field is exposed as unavailable

  # S23
  Scenario: The placeholder never becomes the accessible name
    Given an input labeled "Email" with placeholder "name@example.com"
    When the accessibility tree is queried
    Then the accessible name is "Email"

  # S24
  Scenario: The readonly state is exposed to assistive technology
    Given a readonly input labeled "Membership ID"
    When the accessibility tree is queried
    Then the field is exposed as read-only

  # S25
  Scenario: The field identifies its entry purpose for autofill
    Given an input labeled "Email" declaring autocomplete "email"
    When the page renders
    Then the field's entry purpose is programmatically exposed as "email"

  # Family: form participation
  # S12
  Scenario: The field submits its name and value with the form
    Given a form holding an input named "email" with value "ada@example.com"
    When the user submits the form
    Then the submitted form data contains "email" with value "ada@example.com"

  # S13
  Scenario: Resetting the form restores the field's initial value
    Given a form whose input labeled "Email" was edited away from its initial value
    When the user resets the form
    Then the field returns to its initial value

  # S14
  Scenario: An empty required field blocks submission
    Given a form containing an empty required input labeled "Email"
    When the user attempts to submit the form
    Then the form does not submit
    And the field reports itself as invalid

  # S15
  Scenario: A disabled enclosing group takes the field out of the form
    Given a form whose disabled fieldset contains an input named "email"
    When the user submits the form
    Then the submitted form data does not contain "email"

  # S26
  Scenario: A readonly field still submits its value
    Given a form holding a readonly input named "id" with value "KMN-0042"
    When the user submits the form
    Then the submitted form data contains "id" with value "KMN-0042"

  # S27
  Scenario: An empty readonly required field does not block submission
    Given a form containing an empty readonly required input labeled "Membership ID"
    When the user attempts to submit the form
    Then the form submits

  # S28
  Scenario: A value mismatching its declared kind blocks submission
    Given a form holding an email input with value "not-an-email"
    When the user attempts to submit the form
    Then the form does not submit
    And the field reports itself as invalid

  # Family: theming
  # S16
  Scenario: A second theme restyles the field through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the field's appearance resolves from material3 token values

  # S17
  Scenario: The field honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the field's appearance resolves from the dark token values

  # S18
  Scenario: Field adornments follow the document's writing direction
    Given a right-to-left document with icons in the input's start and end slots
    When the page renders
    Then the start content leads and the end content trails the entry area
