# Feature Specification: Search

**Issue** #378 · **Branch** `feat/378-ki-search`

Search composes a pill-shaped query field with a view for suggestions, recent
queries and host-rendered results. The design-system Search reference defines
the visual anatomy. The issue defines the responsive and accessibility contract.

## Interpretations

- **Agent's choice, pending founder confirmation.** Typed input is debounced by
  200 ms. Enter and suggestion selection report a search immediately and keep
  the view open for results. Form submission remains a separate form action.
  Clear cancels pending input and reports `ki-clear`.
- **Agent's choice, pending founder confirmation.** The host supplies search
  history as declarative children. Removing a recent query hides that child for
  its lifetime in the component and emits `ki-remove-recent` for host persistence.
  The recent group uses native search and remove buttons in the Tab sequence.
  Arrow keys act on the suggestion listbox.
- **Agent's choice, pending founder confirmation.** Voice search is a labelled
  button supplied by the host in the trailing slot. Search uses the shared
  anchored overlay and native modal dialog on this branch. The TopNav
  search app bar is tracked in its own addendum.
- **Agent's choice, pending founder confirmation.** Text labels and the
  suggestion-count and removal-label templates are overridable for localization.
  Search highlights literal, case-insensitive matches in suggestion titles.

## Scenario Family Coverage

| Family | Scenario IDs | N/A rationale |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5 | |
| Keyboard path | S6, S7, S8, S9, S10, S11 | |
| Assistive-tech outcome | S12, S13, S14 | |
| Form participation | S15, S16 | |
| Theming | S17, S18, S19, S20, S21 | |

## Gherkin

```gherkin
Feature: Search
  Search collects a query and surfaces suggestions, recent searches, and results
  in a docked or full-screen view.

  # S1
  Scenario: Editing a query opens search and delivers the latest text
    Given the search bar is empty
    When the user types "dialog" without pausing
    Then the search view is open
    And one ki-input event reports "dialog" after the debounce

  # S2
  Scenario: A suggestion runs its query
    Given search suggests "Dialog" with the query "ki-dialog"
    When the user chooses "Dialog"
    Then one ki-search event reports "ki-dialog"
    And the field contains "ki-dialog" with the results area still available

  # S3
  Scenario: Pending suggestions and results share the view
    Given search results show "Dialog guide"
    When the page marks suggestions as loading
    Then a named loading indicator appears with "Dialog guide" still visible

  # S4
  Scenario Outline: Auto mode places search according to the viewport
    Given an auto search bar in a viewport <width> pixels wide
    When the user focuses the search bar
    Then the search view is <presentation>

    Examples:
      | width | presentation                |
      |   599 | a full-screen modal dialog   |
      |   600 | docked below the search bar |

  # S5
  Scenario: Matching text is highlighted in suggestions
    Given search suggests "Dialog" for the query "dia"
    When the view opens
    Then the initial "Dia" in "Dialog" is emphasized

  # S6
  Scenario: Arrow keys activate suggestions without moving focus
    Given the focused search field is showing "Dialog" and "Drawer" suggestions
    When the user presses ArrowDown
    Then "Dialog" is the active suggestion
    And the search field retains keyboard focus

  # S7
  Scenario: Enter runs the active suggestion
    Given "Dialog" with query "ki-dialog" is the active suggestion
    When the user presses Enter
    Then one ki-search event reports "ki-dialog"

  # S8
  Scenario: Enter runs the typed query when no suggestion is active
    Given the search field contains "overlay" with no active suggestion
    When the user presses Enter
    Then one ki-search event reports "overlay"

  # S9
  Scenario: The first Escape clears the query
    Given the open search view contains the query "dialog"
    When the user presses Escape
    Then the field is empty and the view stays open
    And one ki-clear event is emitted

  # S10
  Scenario: Escape from an empty view returns focus to the bar
    Given the full-screen search view is open with an empty query
    When the user presses Escape
    Then the view closes and the collapsed search field has focus

  # S11
  Scenario: Recent searches can be removed with the keyboard
    Given the remove control for the recent search "button tokens" has focus
    When the user presses Enter
    Then "button tokens" leaves the recent-search group
    And focus returns to the search field

  # S12
  Scenario: The collapsed searchbar exposes a labelled landmark and field
    Given a collapsed search bar labelled "Search Kimen"
    When its accessibility semantics are queried
    Then there is a search landmark named "Search Kimen"
    And it contains a searchbox named "Search Kimen"

  # S13
  Scenario: Search exposes autocomplete and announces the suggestion count
    Given an open search view has suggestions and a labelled recent group
    When the page supplies three suggestions
    Then the expanded combobox controls the suggestion list
    And a polite region says "3 suggestions"

  # S14
  Scenario: Back leaves the named modal and returns focus
    Given the "Search Kimen" modal is open and the rest of the page is inert
    When the user activates Back
    Then the dialog closes and focus returns to the collapsed search field

  # S15
  Scenario: A named search contributes its query to the form
    Given a form has a search named "q" containing "dialog"
    When the form is submitted
    Then its form data includes "q" with value "dialog"

  # S16
  Scenario: Reset restores the initial search query
    Given a search field initially contained "tokens" and has been edited to "dialog"
    When its form is reset
    Then the field and form data both contain "tokens"

  # S17
  Scenario: An author can style the bar and view through tokens
    Given the theme assigns distinct custom background colors to the search bar and view
    When docked search opens
    Then both surfaces paint their assigned color

  # S18
  Scenario: The full-screen back control follows right-to-left direction
    Given a right-to-left page with full-screen search
    When the search view opens
    Then Back is at the right inline start of the search field

  # S19
  Scenario: Search retains a visible focus ring in forced colors
    Given forced colors are active on the page
    When the user tabs to search
    Then the focused bar has a visible system-color outline

  # S20
  Scenario: Search opens without motion under a reduced-motion preference
    Given the page requests reduced motion
    When the search view opens
    Then the search view is immediately displayed without animation

  # S21
  Scenario: Removal has a touch-sized target on a coarse pointer
    Given a coarse pointer and a search view with a removable recent search
    When the recent-search group appears
    Then the remove control offers a target of at least 44 by 44 pixels
```
