Feature: ki-checkbox-group collects independent choices
  People select several options under one label and submit them as one field.

  # S1
  Scenario: Toggling a second option preserves the first selection
    Given Regions has Europe selected and Americas unselected
    When the person selects Americas
    Then both choices are checked
    And a single group change reports "eu" and "am"

  # S2
  Scenario: Each enabled checkbox has its own Tab stop
    Given Europe is focused and Americas is the next enabled option
    When the person presses Tab
    Then focus moves visibly to Americas
    And the selection stays the same

  # S3
  Scenario: Space toggles the focused checkbox
    Given Americas is focused and unselected
    When the person presses Space
    Then Americas is selected

  # S4
  Scenario: Assistive technology can identify the group and the options
    Given Regions has help "Choose your regions" and two labeled checkboxes
    When the person enters the group
    Then the accessible group is named "Regions" and described by "Choose your regions"
    And each option exposes its own name and checked state

  # S5
  Scenario: Submitting multiple choices repeats the group name
    Given Regions is named "regions" and Europe and Americas are selected
    When the person submits the form
    Then the submitted data contains exactly "regions=eu" and "regions=am"

  # S6
  Scenario: Submission below the minimum exposes the group error
    Given Regions requires at least one choice and has none selected
    When the person attempts to submit the form
    Then the form is blocked with a missing-value error
    And the group description reads "Choose at least one region."

  # S7
  Scenario: Leaving the group above the maximum exposes the group error
    Given the person has selected two regions and Regions allows at most one
    When the person tabs out of Regions
    Then Regions is invalid with a range overflow
    And the group description reads "Choose at most one region."

  # S8
  Scenario: Reset restores the group's initial selection
    Given Regions initially selected Europe and now selects Americas
    When the person resets the form
    Then only Europe is selected and the group error is cleared

  # S9
  Scenario: A disabled group removes its options from the keyboard path
    Given Regions is disabled and Europe remains selected
    When the person tabs forward from before the group
    Then focus skips Regions
    And the group contributes no form data

  # S10
  Scenario: Horizontal options follow the page direction and group spacing
    Given Regions is horizontal on a right-to-left page with a custom group gap
    When the group is displayed
    Then Europe appears to the right of Americas
    And the options use the custom gap

  # S11
  Scenario: Assigning a selection updates and submits the matching options
    Given Regions has Europe and Americas as unchecked choices
    When an application sets the selection to "am"
    Then only Americas is checked and contributes to the form
    And the group emits no change event

  # S12
  Scenario: Multiple selection in A2UI produces a checkbox group
    Given a ChoicePicker allows multiple choices and preselects Europe and Asia-Pacific
    When the surface is translated
    Then Regions contains individually labeled checkboxes
    And Europe and Asia-Pacific are checked

  # S13
  Scenario: A hidden legend still names the group, and is announced once
    Given Regions has its legend hidden
    When the page renders
    Then no legend is displayed above the options
    And the accessibility tree carries "Regions" only as the group's name

  # S14
  Scenario: A question written on the page names the group
    Given a heading "Where do you ship?" and a checkbox group without a label that references the heading
    When the page renders
    Then the accessibility tree exposes a group named "Where do you ship?"
    And the question is announced only by the heading and as the group's name

  # S15
  Scenario: The group's own label follows the page question in its name
    Given a heading "Where do you ship?" and a checkbox group labeled "Pick all that apply" that references the heading
    When the page renders
    Then the accessibility tree exposes a group named "Where do you ship? Pick all that apply"

  # S16
  Scenario Outline: Boolean attributes read consistently from markup and script
    Given a checkbox group
    When an attribute (disabled and label-hidden) is <write> <moment>
    Then the corresponding property reads <state>

    Examples:
      | write                    | moment                 | state        |
      | absent                   | in the initial markup  | its default  |
      | set to exactly "false"   | in the initial markup  | false        |
      | set to an empty value    | in the initial markup  | true         |
      | set to "true"            | in the initial markup  | true         |
      | set to exactly "false"   | after the first render | false        |
      | set to an empty value    | after the first render | true         |
      | set to "true"            | after the first render | true         |
