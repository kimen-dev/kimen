# Feature specification for `ki-checkbox-group`

**Branch** `feat/367-ki-checkbox-group`  
**Issue** #367

A group collects independent selections under a common label, guidance and
selection-count constraints. The visual reference is the proposed CheckboxGroup
card in the Kimen design system. The group uses the shipped checkbox for each
option and the shared field-message presentation for help and errors.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S11, S12 | |
| Keyboard path | S2, S3, S9 | |
| Assistive-tech outcome | S4, S6, S7 | |
| Form participation | S5, S6, S7, S8, S9, S11 | |
| Theming | S10 | |

## Interpretations

- **Agent's choice, pending founder confirmation.** The default slot accepts
  direct `ki-checkbox` children. Their authored checked states seed the group
  when no property selection was supplied. A `value` assignment replaces the
  selection silently. Values project in option order, and a request for an
  option that has yet to arrive can be fulfilled when it joins the group.
- **Agent's choice, pending founder confirmation.** The group owns submission,
  constraints and reset for its direct options. A checked individually disabled
  option remains selected and contributes its value. Omitted option values use
  the checkbox default `on`. A property assignment checks every option with a
  matching value. Reset restores initial checked options or the initial
  property selection.
- **Agent's choice, pending founder confirmation.** Errors replace help after
  leaving the whole group or a validation attempt. With no authored error text,
  the browser supplies the text. Nonnegative whole-number limits are supported.
  Minimum validation takes precedence when both bounds reject a selection.
  The custom-elements build exposes the synchronous validity interface used
  by the radio group.
- **Agent's choice, pending founder confirmation.** Horizontal options wrap
  and follow the page direction. The label is required and names the group.
- **Agent's choice, pending founder confirmation.** The catalog and A2UI encode
  initial selections through checked child options. The group value array and
  event detail are available through the component's JavaScript API. Adapter
  bindings remain server-to-UI and use the existing declared-action boundary.
  An unlabeled multiple-selection picker keeps the accessible fallback.

## Gherkin

```gherkin
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
```
