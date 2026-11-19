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
    Given a device with a coarse pointer and an action card containing "Rebuild starts at midnight"
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
