Feature: List
  A list presents a read-only collection of similar items — leading media,
  primary and secondary text, trailing meta — in one consistent vertical
  structure that any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: A list presents its items in source order
    Given a list with the items "Email", "Notifications" and "Storage"
    When the page renders
    Then the three items appear as one vertical list in that order

  # S2
  Scenario: A list item composes its regions in reading order
    Given a list item with a leading avatar, the primary text "Ana García", the secondary text "ana@onmars.dev" and a trailing timestamp
    When the page renders
    Then the avatar leads, the primary text sits above the secondary text and the timestamp trails

  # S3
  Scenario: Absent regions leave no empty space
    Given a list item holding only the primary text "Storage"
    When the page renders
    Then only the primary text is rendered, with no space reserved for the other regions

  # S4
  Scenario: Unknown attribute values fall back to the default appearance
    Given a list declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the list renders its items with the default list appearance

  # S10
  Scenario: Long text wraps and grows the item vertically
    Given a list item whose secondary text is longer than the item's width
    When the page renders
    Then the secondary text wraps and the item grows vertically, with no truncation or internal scrolling

  # Family: keyboard path
  # S5
  Scenario: The list never takes focus away from its content
    Given a page whose only interactive element is a switch slotted in the end slot of a list item
    When the user presses Tab
    Then focus lands on the switch, skipping the list and its items

  # S11
  Scenario: The keyboard operates a slotted control exactly once
    Given a list whose item holds a trailing switch, with focus on the switch
    When the user activates it from the keyboard
    Then the switch toggles exactly once

  # Family: assistive-tech outcome
  # S6
  Scenario: The list exposes list semantics with an accurate item count
    Given a list with the items "Email", "Notifications" and "Storage"
    When the accessibility tree is queried
    Then it exposes a list of exactly three items
    And each item exposes its text content and no interactive role

  # Family: form participation — N/A for ki-list: a non-interactive data
  # display container is not a form control, holds no value and contributes
  # no entry to submitted form data (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S7
  Scenario: A second theme restyles the list through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the items' spacing, separation and text styles resolve from material3 token values

  # S8
  Scenario: The list honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the list's appearance resolves from the dark token values

  # S9
  Scenario: List item content follows the document's writing direction
    Given a right-to-left document with a list item holding an icon in the start slot and a timestamp in the end slot
    When the page renders
    Then the icon leads and the timestamp trails the item's text
