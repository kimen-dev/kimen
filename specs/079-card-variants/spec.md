# Card variants and primary activation

**Issue** [#379](https://github.com/kimen-dev/kimen/issues/379)

**Branch** `feat/379-card-variants`

Extend the shipped [card](../009-ki-card/spec.md) with opt-in surface variants and a
primary link or action. Keep the card's existing theme defaults and composition
contract. Use the Kimen CardVariants design-system preview as the design reference.

| Family | Scenarios |
| --- | --- |
| Core behavior | S1–S3, S13, S15 |
| Keyboard path | S4, S5, S14 |
| Assistive-tech outcome | S6 |
| Form participation | S7. The card holds no form value. Its primary action must leave submission to the form. |
| Theming | S8–S12 |

## Interpretations

- A nonblank `href` takes precedence over `interactive`. A blank URL counts as
  absent. Action mode emits one bubbling, composed `ki-activate` with no payload.
  (agent's choice, pending founder confirmation)
- A clickable card takes one nonempty plain-text heading in `header` at the author's
  h1–h6 level; the native title control renders that text at the same level.
  A missing or unsupported title leaves the card passive. Use the body or
  footer for separate controls. (agent's choice, pending founder confirmation)
- The title is persistently underlined. The card delegates a plain primary
  surface click through the selectable regions. Native link gestures are
  available on the title. (agent's choice, pending founder confirmation)
- Elevated uses the current `surface.s1` name for the raised surface. Filled
  uses `surface.s2` and outlined uses `surface.s0` with the low-emphasis outline,
  as shown in the preview. Keep the shipped passive default hover treatment.
  (agent's choice, pending founder confirmation)

- The renderer keeps legacy click bindings for existing passive card specs.
  New action cards use the declared activation event and link cards keep
  navigation precedence. (agent's choice, pending founder confirmation)

## Gherkin

```gherkin
Feature: Card variants and primary activation
  An author can choose a surface treatment and give a card one primary destination or action.

  # S1
  Scenario: A card surface follows its primary link
    Given a card titled "Search index rebuild" linking to incident 42
    When the user clicks its supporting text
    Then incident 42 opens

  # S2
  Scenario: An inner button keeps its own action
    Given an action card titled "Search index rebuild" with a separate "Bookmark" button
    When the user clicks "Bookmark"
    Then the bookmark action runs once
    And the primary card action does not run

  # S3
  Scenario: Supporting text can be selected without activation
    Given an action card containing the text "Rebuild starts at midnight"
    When the user drags across the supporting text
    Then the text is selected
    And the primary card action does not run

  # S4
  Scenario: The card link and its inner controls are separate tab stops
    Given a card titled "Search index rebuild" linking to incident 42 with a separate "Bookmark" button
    When the user tabs through the card
    Then focus reaches the title followed by "Bookmark", once each
    And the whole card has a visible focus ring while the title is focused

  # S5
  Scenario Outline: The primary action works with both native button keys
    Given the action card title "Search index rebuild" has keyboard focus
    When the user presses <key>
    Then the card reports one activation

    Examples:
      | key   |
      | Enter |
      | Space |

  # S6
  Scenario Outline: The primary control is named by the heading
    Given a <mode> card with the level-three heading "Search index rebuild" and separate supporting text
    When assistive technology queries the card
    Then the title is exposed as a level-three heading containing one <role> named "Search index rebuild"
    And the supporting text is exposed separately

    Examples:
      | mode   | role   |
      | link   | link   |
      | action | button |

  # S7
  Scenario: A card action inside a form leaves submission to the form controls
    Given a form containing an action card titled "Preview report"
    When the user activates "Preview report"
    Then the card reports one activation without submitting the form

  # S8
  Scenario Outline: An explicit variant paints its theme surface
    Given a card using the <variant> variant
    When the page renders
    Then the card uses the theme's <appearance> surface

    Examples:
      | variant  | appearance             |
      | default  | default                |
      | elevated | raised and shadowed    |
      | filled   | tinted and flat        |
      | outlined | bordered and flat      |

  # S9
  Scenario: Forced colours retain the linked card boundary and focus indicator
    Given a user who uses forced colours and a card linking to incident 42
    When the card title receives keyboard focus
    Then its card boundary and full-surface focus indicator remain visible

  # S10
  Scenario: Card hover feedback is immediate with reduced motion
    Given a user who prefers reduced motion and a clickable outlined card
    When the user points at the card
    Then the surface feedback appears without animation

  # S11
  Scenario: A right-to-left card remains actionable and selectable
    Given a right-to-left action card with an Arabic title and supporting text
    When the user clicks the supporting text
    Then the card reports one activation
    And the title and supporting text remain right-to-left

  # S12
  Scenario: The card offers the full primary target on a coarse pointer
    Given a device with a coarse pointer and an action card at touch density containing "Rebuild starts at midnight"
    When the user taps the supporting text
    Then the card reports one activation
    And the card does not retain hover feedback

  # S13
  Scenario: A card with both activation options acts as a link
    Given a card with the title "Search index rebuild", a destination and an action setting
    When the user activates the title
    Then the link destination opens
    And the card reports no action

  # S14
  Scenario: A card without a title stays out of the tab order
    Given an action card with supporting text and no title
    When the user tabs through the page
    Then the card introduces no unnamed focus stop

  # S15
  Scenario: An action card can be activated from the surface
    Given an action card titled "Search index rebuild"
    When the user clicks its surface outside the title
    Then the card reports one activation
```
