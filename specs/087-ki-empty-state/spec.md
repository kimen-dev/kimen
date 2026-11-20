# Feature specification for EmptyState

**Feature branch** `feat/393-ki-empty-state`  
**Issue** #393  
**Design source** Kimen design system, Components → Proposed → EmptyState

A person who opens an empty list, table or first-run screen sees what is missing
and how to proceed. Search results can announce that the view has become empty
without taking focus away from the search field.

## Requirements

- Show a native heading, an optional decorative icon or illustration, an optional
  explanation and a row for actions. The app supplies the copy and controls.
- Default to medium size, neutral icon tone and a level-three heading. Small
  reduces vertical spacing for a table or panel.
- Let an app opt into a polite status for changing results. Keep action controls
  outside that region and preserve the current focus.
- Theme the compact and regular layouts with semantic token aliases, including
  heading typography and a readable foreground for each text background.
- Expose the props and slots through the catalog and generated wrappers. The
  slotted controls own their declared surface actions.

## Interpretations

- **Agent's choice, pending founder confirmation.** A boolean `announce`
  opts the heading and description into `role="status"`. Static first-run
  copy stays outside a live region. The initial update is delivered after the
  status region renders. The application's controls retain focus.
- **Agent's choice, pending founder confirmation.** Slotted media is decorative
  and takes precedence over the icon. Consumers register named glyphs using
  the existing per-icon imports. The application limits the action row to one
  primary control and may add a secondary response when useful.
- **Agent's choice, pending founder confirmation.** Unsupported heading levels
  use level three. An omitted or blank heading produces no empty heading.
  The guarded catalog requires the heading property.
- **Agent's choice, pending founder confirmation.** The icon delegates its
  decorative tile to FeatureIcon when registered. This checkout predates
  FeatureIcon, so the tile keeps working with the same tone palette and a
  token-styled fallback before that dependency is available. The regular size
  uses the large FeatureIcon tile and the compact size uses the medium tile.

- **Agent's choice, pending founder confirmation.** The description uses
  the semantic supporting-text ink. It matches medium emphasis in standard
  mode and strengthens under contrast-more. The content surface defaults to
  the theme canvas color. Material 3 uses its medium body weight for the
  heading.
- **Agent's choice, pending founder confirmation.** The public API gate uses
  its major classification for the change to the existing Stencil `Components`
  and `JSX` namespace signatures.

## Scenario family coverage

| Family | Scenarios | Justification when N/A |
| --- | --- | --- |
| Core behavior | S1, S2, S3 | |
| Keyboard path | S4 | |
| Assistive-tech outcome | S5, S6 | |
| Form participation | | N/A. The component describes an empty view. Slotted controls manage their own form behavior. |
| Theming | S7, S8, S9, S10, S11 | |

## Gherkin scenarios

```gherkin
Feature: ki-empty-state explains an empty view
  A short message describes why a view is empty and offers a next step.

  # S1
  Scenario: A first-run view explains how to get started
    Given an empty project list with the folder-plus icon available
    When the first-run message appears
    Then "No projects yet" appears above its description and the "New project" action
    And the folder icon is decorative

  # S2
  Scenario: An illustration takes the place of the icon
    Given an empty state with a folder icon
    When the application supplies a decorative illustration
    Then the illustration takes the icon's place
    And the illustration cannot receive keyboard focus

  # S3
  Scenario: A compact message fits inside a results panel
    Given a results panel with an empty state
    When the application chooses the small size
    Then the empty state uses less vertical space

  # S4
  Scenario: Keyboard users can reach and activate the supplied action
    Given focus is on the search field before an empty state with a "Clear filters" button
    When the user tabs to "Clear filters" and activates it with the keyboard
    Then the application receives one activation of "Clear filters"

  # S5
  Scenario: A search that empties the view updates a polite status
    Given focus is on the search field and the list has results
    When a search for "webhok" returns no results
    Then a polite status receives "No results for webhok" and the recovery advice
    And focus stays on the search field
    And action controls are outside the status

  # S6
  Scenario Outline: The heading follows the document outline
    Given an empty view configured with <level> as its heading level
    When the first-run message appears
    Then "No projects yet" is a native level <expected> heading
    And the static message is outside a live region

    Examples:
      | level       | expected |
      | omitted     | 3        |
      | 1           | 1        |
      | 2           | 2        |
      | 4           | 4        |
      | 5           | 5        |
      | 6           | 6        |
      | 3.5         | 3        |
      | 02          | 3        |
      | 2junk       | 3        |
      | unsupported | 3        |

  # S7
  Scenario: The theme controls the heading typography and message width
    Given a theme with a serif heading family and a narrow empty state
    When a message appears
    Then its heading uses the serif family
    And its text wraps within the theme's maximum width

  # S8
  Scenario: Forced colors keep the message readable
    Given a page with forced colors active
    When an empty view appears
    Then the heading and description remain distinguishable from their background

  # S9
  Scenario: Reduced motion leaves the message available immediately
    Given a page where the user requests reduced motion
    When an empty view appears
    Then the message is visible without animated movement

  # S10
  Scenario: Right-to-left direction flows through the actions
    Given an empty view with two actions in a right-to-left panel
    When the message appears
    Then the first action appears at the inline start of the row

  # S11
  Scenario: Touch density preserves the next action
    Given a coarse-pointer panel using touch density
    When a small empty state offers a "Clear filters" button
    Then the button has a touch-sized target and can be activated
```
