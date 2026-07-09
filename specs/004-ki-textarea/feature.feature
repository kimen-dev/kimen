Feature: Textarea
  A multiline text field that captures long-form text with native form
  semantics — line breaks included — and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Typing fills the textarea and the page observes the input
    Given a textarea labeled "Delivery notes"
    When the user types "Leave the package at the back door"
    Then the textarea holds "Leave the package at the back door"
    And the page observes the value changing as the user types

  # S2
  Scenario: Line breaks are part of the value
    Given a textarea labeled "Delivery notes"
    When the user enters "Ring twice" and "Leave at the back door" on separate lines
    Then the textarea's value preserves the two lines separated by a line break

  # S3
  Scenario: Rows set the visible height of the field
    Given a textarea declared with 6 rows
    When the page renders
    Then the field is six text lines tall

  # S4
  Scenario: A readonly textarea preserves its text
    Given a readonly textarea labeled "Terms" holding "No refunds after 30 days"
    When the user attempts to edit the text
    Then the text remains "No refunds after 30 days"

  # S5
  Scenario: A disabled textarea accepts no input
    Given a disabled textarea labeled "Delivery notes"
    When the user attempts to type into it
    Then the textarea stays empty
    And focus never lands on it

  # S6
  Scenario: An unrecognized rows value falls back to the default height
    Given a textarea declared with a rows value of "tall"
    When the page renders
    Then the field renders at the default height

  # S19
  Scenario: The placeholder shows only while the field is empty
    Given an empty textarea labeled "Delivery notes" showing its placeholder "Add any special instructions"
    When the user types "Ring twice"
    Then the placeholder is no longer shown

  # S20
  Scenario: Committing an edit reports a change
    Given a textarea labeled "Delivery notes" whose text was edited to "Leave at the back door"
    When the user leaves the field
    Then a change event reports the value "Leave at the back door"

  # Family: keyboard path
  # S7
  Scenario: The keyboard reaches the textarea with visible focus
    Given a page whose first interactive element is a textarea
    When the user presses Tab
    Then the textarea is focused and its focus indication is visible

  # S8
  Scenario: Enter starts a new line instead of submitting the form
    Given a focused textarea inside a form
    When the user presses Enter
    Then a new line starts in the textarea
    And the form does not submit

  # S21
  Scenario: Tab moves focus onward instead of inserting a character
    Given a focused textarea holding "Ring twice", followed by another interactive element
    When the user presses Tab
    Then focus moves to the next interactive element
    And the textarea still holds "Ring twice"

  # Family: assistive-tech outcome
  # S9
  Scenario: The textarea is exposed as a named multiline text field
    Given a textarea labeled "Delivery notes"
    When the accessibility tree is queried
    Then it exposes a multiline text field whose accessible name is "Delivery notes"

  # S10
  Scenario: The required state is exposed to assistive technology
    Given a required textarea labeled "Delivery notes"
    When the accessibility tree is queried
    Then the field is exposed as required

  # S11
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled textarea labeled "Delivery notes"
    When the accessibility tree is queried
    Then the field is exposed as unavailable

  # S22
  Scenario: The readonly state is exposed to assistive technology
    Given a readonly textarea labeled "Terms"
    When the accessibility tree is queried
    Then the field is exposed as read-only

  # S25
  Scenario: The textarea identifies its entry purpose for autofill
    Given a textarea labeled "Shipping address" declaring autocomplete "street-address"
    When the page renders
    Then the field's entry purpose is programmatically exposed as "street-address"

  # Family: form participation
  # S12
  Scenario: The textarea submits its text with the form
    Given a form holding a textarea named "comments" with the text "Great service"
    When the user submits the form
    Then the submitted data contains "comments" with the text "Great service"

  # S13
  Scenario: Resetting the form restores the initial text
    Given a textarea whose initial text "Call on arrival" was edited away
    When the user resets the form
    Then the textarea holds "Call on arrival" again

  # S14
  Scenario: An empty required textarea blocks submission
    Given a form whose required textarea "Delivery notes" is empty
    When the user attempts to submit the form
    Then the form does not submit
    And the textarea reports that a value is missing

  # S15
  Scenario: Disabling the enclosing fieldset disables the textarea
    Given a textarea inside a disabled fieldset
    When the user attempts to type into it
    Then the textarea's text is unchanged

  # S16
  Scenario: A disabled textarea is left out of the submitted data
    Given a form holding a disabled textarea named "comments" with the text "Call first"
    When the user submits the form
    Then the submitted data does not contain "comments"

  # S23
  Scenario: A readonly textarea submits its text with the form
    Given a form holding a readonly textarea named "terms" with the text "No refunds after 30 days"
    When the user submits the form
    Then the submitted data contains "terms" with the text "No refunds after 30 days"

  # Family: theming
  # S17
  Scenario: A second theme restyles the textarea through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the textarea's appearance resolves from material3 token values

  # S18
  Scenario: The textarea honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the textarea's appearance resolves from the dark token values

  # S24
  Scenario: The label and entered text follow the document's writing direction
    Given a right-to-left document with a labeled textarea holding text
    When the page renders
    Then the label starts at the inline start edge
    And the entered text follows the right-to-left direction
