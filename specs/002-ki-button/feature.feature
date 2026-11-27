Feature: Button
  A button lets a person trigger an action or operate a form with full
  input-modality parity, and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Activating the button runs its action exactly once
    Given a button labeled "Save" on a page that counts activations
    When the user clicks the button
    Then the page observes exactly one activation

  # S2
  Scenario: A disabled button does not act
    Given a disabled button labeled "Save"
    When the user attempts to activate it
    Then no activation is observed

  # S11
  Scenario: Unknown appearance values fall back to defaults
    Given a button declared with an unrecognized variant value
    When the page renders
    Then the button renders with the default variant appearance

  # Family: keyboard path
  # S3
  Scenario: The keyboard reaches the button with visible focus
    Given a page whose first interactive element is a button
    When the user presses Tab
    Then the button is focused and its focus indication is visible

  # S4
  Scenario: The keyboard activates the focused button
    Given a focused button labeled "Save"
    When the user activates it from the keyboard
    Then the page observes exactly one activation

  # Family: assistive-tech outcome
  # S5
  Scenario: The button is exposed as a named button
    Given a button labeled "Save"
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Save"

  # S6
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled button labeled "Save"
    When the accessibility tree is queried
    Then the button is exposed as unavailable

  # S14
  Scenario: An accessible description on the host reaches the focusable button
    Given a button whose host carries an accessible description, such as one
      supplied by a wrapping tooltip
    When the accessibility tree is queried
    Then the description is present on the internal button that receives focus,
      and it tracks later changes to and removal of the host description

  # Family: form participation
  # S7
  Scenario: A submit button submits its form with the form data
    Given a form holding a named text field with a value and a submit button
    When the user activates the button
    Then the form submits carrying the field's name and value

  # S8
  Scenario: A button of type button never submits its form
    Given a form containing a button of type "button"
    When the user activates the button
    Then the form does not submit

  # S12
  Scenario: A reset button restores the form's defaults
    Given a form whose text field has been edited away from its default
    When the user activates a button of type "reset"
    Then the field returns to its default value

  # Family: theming
  # S9
  Scenario: A second theme restyles the button through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the button's appearance resolves from material3 token values

  # S10
  Scenario: The button honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the button's appearance resolves from the dark token values

  # S13
  Scenario: Button content follows the document's writing direction
    Given a right-to-left document with icons in the start and end slots
    When the page renders
    Then the start content leads and the end content trails the label

  # S15
  Scenario Outline: An extra-small button's label is at least 12 pixels
    Given a <theme> page with an extra-small button labeled "Undo"
    When the page renders
    Then the label measures at least 12 CSS pixels

    Examples:
      | theme     |
      | onmars    |
      | material3 |

  # Family: theming (appended)
  # S16
  Scenario: Tertiary shares the secondary appearance in onmars
    Given an onmars page with secondary and tertiary buttons labeled "Save"
    When the page renders
    Then the tertiary button has the same appearance as the secondary button

  # Family: core behavior (appended)
  # S17
  Scenario: The deprecated variant warns in development
    Given a development build with a button labeled "Save"
    When the button uses the tertiary variant
    Then the developer sees a deprecation warning recommending secondary

  # S18
  Scenario: The catalog offers the current variants
    Given an agent choosing a button variant
    When the agent reads the catalog schema
    Then the available variants are primary, secondary, quaternary, ghost and outline

  # S19
  Scenario: A button can retain selection
    Given an unselected button in toggle mode
    When the person activates it
    Then the button becomes selected and reports the new pressed state
    And the button emits a change carrying the new state

  # Family: core behavior (appended)
  # S20
  Scenario: A button with a destination is a link to it
    Given a primary button labeled "Get started" with the destination "/start"
    When the page renders
    Then the button is a link whose destination is "/start"

  # S21
  Scenario: A disabled button link goes nowhere
    Given a disabled button labeled "Get started" with a destination
    When the user attempts to activate it
    Then no navigation and no activation are observed

  # Family: keyboard path (appended)
  # S22
  Scenario: Enter follows a focused button link
    Given a focused button link labeled "Get started" to "#start"
    When the user presses Enter
    Then the browser follows the link to "#start"

  # Family: assistive-tech outcome (appended)
  # S23
  Scenario: A button link is exposed as a named link
    Given a button labeled "Get started" with a destination
    When the accessibility tree is queried
    Then it exposes a link whose accessible name is "Get started"

  # Family: form participation (appended)
  # S24
  Scenario: A button link never submits its form
    Given a form containing a submit button labeled "Get started" with a destination
    When the user activates the button
    Then the form does not submit

  # Family: theming (appended)
  # S25
  Scenario: The button tokens restyle a button link
    Given a primary button and a primary button link under the same reassigned tokens
    When the page renders
    Then the link has the same appearance as the button

  # S26
  Scenario: The alignment tokens alone left-align a button's content
    Given a wide button with a two-line label
    And the button content and text alignment tokens set to "start"
    When the page renders
    Then both label lines start at the button's inline-start padding

  # Family: core behavior (appended)
  # S27
  Scenario: An outline action responds to hover
    Given an enabled outline action rendered as a button or link
    When the pointer rests over the action
    Then the outline action changes its surface

  # S28
  Scenario: Every unselected toggle button responds to hover
    Given an unselected toggle button in any variant
    When the pointer rests over the toggle
    Then the toggle changes its surface

  # S29
  Scenario: A selected toggle button keeps its surface on hover
    Given a selected toggle button in any variant
    When the pointer rests over the toggle
    Then the toggle keeps its selection surface

  # Family: theming (appended)
  # S30
  Scenario: Tokens recolor the hovered outline action
    Given an outline action with reassigned hover background, foreground and border tokens
    When the pointer rests over the action
    Then the surface, text and outline use the reassigned colors

  # S31
  Scenario: A token recolors the selected outline border
    Given a selected outline toggle button with a reassigned selected border token
    When the page renders
    Then the selected outline uses the reassigned color

  # S32
  Scenario: A token recolors the unselected toggle hover wash
    Given an unselected filled or quiet toggle button with a reassigned hover overlay token
    When the pointer rests over the toggle
    Then the toggle shows the reassigned wash

  # S33
  Scenario: The button icon-size token sizes the glyph
    Given a button of any size with ki-icon elements in both icon slots
    When the page renders
    Then both glyphs match the default icon-size token

  # S34
  Scenario: The button icon-size token alone resizes the glyph
    Given a button with a reassigned icon-size token and an explicit ki-icon size in both slots
    When the page renders
    Then both glyphs match the reassigned button icon-size token

  # S35
  Scenario: An inline-size token fills the grid cell in both action modes
    Given a toggle choice and a button link in separate grid cells with the inline-size token set to "100%"
    When the page renders
    Then each button host and control fill its cell
